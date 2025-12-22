"""File log writer for application logs and exceptions.

This module provides thread-safe asynchronous file writing for:
- app.log - Combined backend and frontend application logs (merged for easier debugging)
- error.log - Combined backend and frontend exceptions (merged for easier debugging)
- audit.log - Audit logs (compliance and security tracking)

Uses queue-based asynchronous writing to avoid blocking the main thread.
Uses database models to ensure consistent formatting between file and database logs.
"""
import json
import queue
import threading
from datetime import datetime, date, timezone
from pathlib import Path
from typing import Any, Optional, Tuple, Dict, Union
import logging
import re
from uuid import UUID, uuid4

# Import database models for consistent formatting
from ..db.models import AppLog, ErrorLog, SystemLog, AuditLog, PerformanceLog
from .utils import format_timestamp


class FileLogWriter:
    """Thread-safe asynchronous file log writer for application logs and exceptions.

    Uses a queue-based approach where log entries are enqueued and written
    asynchronously by a background thread to avoid blocking the main thread.
    """

    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        """Singleton pattern."""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        """Initialize file log writer with asynchronous queue-based writing."""
        if self._initialized:
            return

        # Determine backend directory path (go up from src/common/modules/logger)
        # backend/src/common/modules/logger/file_writer.py -> backend/
        backend_dir = Path(__file__).resolve().parent.parent.parent.parent.parent
        self.logs_dir = backend_dir / "logs"
        self.logs_dir.mkdir(parents=True, exist_ok=True)

        # File paths
        # Merged application logs (backend + frontend) for easier debugging with trace_id correlation
        self.application_logs_file = self.logs_dir / "app.log"
        # Merged exceptions (backend + frontend) for easier debugging with trace_id correlation
        self.application_exceptions_file = self.logs_dir / "error.log"
        self.audit_logs_file = self.logs_dir / "audit.log"
        # Performance logs for performance metrics and monitoring - Requirements 9.9
        self.performance_logs_file = self.logs_dir / "performance.log"

        # Initialize log files (create empty files if they don't exist)
        for log_file in [
            self.application_logs_file,
            self.application_exceptions_file,
            self.audit_logs_file,
            self.performance_logs_file,
        ]:
            if not log_file.exists():
                log_file.touch()

        # File rotation settings (daily rotation)
        self.backup_count = 30  # Keep 30 days of logs
        self._last_rotation_date = {}  # Track last rotation date for each file

        # Queue for asynchronous log writing
        # Each entry is a tuple: (file_path: Path, entry: str)
        self.log_queue: queue.Queue[Tuple[Path, str]] = queue.Queue(maxsize=10000)
        
        # Control flags for background thread
        self._shutdown_event = threading.Event()
        self._worker_thread: Optional[threading.Thread] = None
        
        # Thread lock for file operations (rotation, etc.)
        self.write_lock = threading.Lock()
        
        # Start background worker thread
        self._start_worker_thread()

        self._initialized = True

    def _start_worker_thread(self) -> None:
        """Start the background worker thread for asynchronous log writing."""
        self._worker_thread = threading.Thread(
            target=self._worker_loop,
            name="FileLogWriter-Worker",
            daemon=True,
        )
        self._worker_thread.start()

    def _worker_loop(self) -> None:
        """Background worker thread that processes log entries from the queue."""
        while not self._shutdown_event.is_set():
            try:
                # Get entry from queue with timeout to allow periodic shutdown check
                try:
                    file_path, entry = self.log_queue.get(timeout=0.5)
                except queue.Empty:
                    continue

                # Write entry to file
                self._write_entry_to_file(file_path, entry)
                self.log_queue.task_done()
            except Exception as e:
                # Fallback to standard logging if queue processing fails
                logging.error(f"Error in FileLogWriter worker thread: {e}")

        # Process remaining entries in queue before shutdown
        while True:
            try:
                file_path, entry = self.log_queue.get_nowait()
                self._write_entry_to_file(file_path, entry)
                self.log_queue.task_done()
            except queue.Empty:
                break

    def _write_entry_to_file(self, file_path: Path, entry: str) -> None:
        """Write a single log entry to the specified file.
        
        This method is called by the background worker thread.
        """
        with self.write_lock:
            try:
                # Rotate if needed
                self._rotate_file_if_needed(file_path)
                # Write to file
                with open(file_path, "a", encoding="utf-8") as f:
                    f.write(entry + "\n")
            except Exception as e:
                # Fallback to standard logging if file write fails
                logging.error(f"Failed to write log entry to {file_path}: {e}")

    def _rotate_file_if_needed(self, file_path: Path) -> None:
        """Rotate file daily at midnight."""
        if not file_path.exists():
            return

        # Get current date
        today = date.today()
        
        # Check if we need to rotate (new day)
        file_key = str(file_path)
        last_rotation = self._last_rotation_date.get(file_key)
        
        if last_rotation == today:
            # Already rotated today, no need to rotate again
            return
        
        # Check file modification date
        file_mtime = datetime.fromtimestamp(file_path.stat().st_mtime).date()
        
        # Rotate if file is from a previous day
        if file_mtime < today:
            # Move current file to dated backup
            # Format: app.log.2024-01-15
            date_str = file_mtime.strftime("%Y-%m-%d")
            backup_file = file_path.parent / f"{file_path.stem}.{date_str}{file_path.suffix}"
            
            # If backup file already exists, append timestamp
            if backup_file.exists():
                timestamp = datetime.now().strftime("%H%M%S")
                backup_file = file_path.parent / f"{file_path.stem}.{date_str}.{timestamp}{file_path.suffix}"
            
            file_path.rename(backup_file)
            
            # Update last rotation date
            self._last_rotation_date[file_key] = today
            
            # Clean up old files beyond backup_count
            self._cleanup_old_files(file_path)
    
    def _cleanup_old_files(self, file_path: Path) -> None:
        """Clean up old log files beyond backup_count."""
        if not file_path.parent.exists():
            return
        
        # Find all backup files matching the pattern
        # Pattern: {stem}.YYYY-MM-DD{suffix} or {stem}.{number}{suffix}
        pattern = re.compile(
            rf"^{re.escape(file_path.stem)}\."
            rf"(?:\d{{4}}-\d{{2}}-\d{{2}}|\d+)"
            rf"{re.escape(file_path.suffix)}$"
        )
        
        backup_files = []
        for f in file_path.parent.iterdir():
            if f.is_file() and pattern.match(f.name):
                backup_files.append(f)
        
        # Sort by modification time (oldest first)
        backup_files.sort(key=lambda f: f.stat().st_mtime)
        
        # Remove files beyond backup_count
        if len(backup_files) > self.backup_count:
            for old_file in backup_files[:-self.backup_count]:
                try:
                    old_file.unlink()
                except Exception as e:
                    logging.warning(f"Failed to delete old log file {old_file}: {e}")

    def _format_timestamp(self) -> str:
        """Format timestamp in unified format: YYYY-MM-DD HH:MM:SS.mmm (local time)."""
        return format_timestamp()

    def _create_log_dict_from_model(
        self,
        source: str,
        level: str,
        message: str,
        layer: Optional[str] = None,
        module: Optional[str] = None,
        function: Optional[str] = None,
        line_number: Optional[int] = None,
        trace_id: Optional[str] = None,
        request_id: Optional[str] = None,
        user_id: Optional[Union[str, UUID]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        request_method: Optional[str] = None,
        request_path: Optional[str] = None,
        request_data: Optional[Dict[str, Any]] = None,
        response_status: Optional[int] = None,
        duration_ms: Optional[int] = None,
        extra_data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Create a log dictionary using the same structure as AppLog model.
        
        This ensures file logs have exactly the same format as database logs.
        """
        # Create a dictionary with the same fields as AppLog model
        log_dict = {
            "timestamp": self._format_timestamp(),
            "source": source,
            "level": level.upper(),
            "message": message,
        }
        
        # Add optional fields (only if not None)
        optional_fields = {
            "layer": layer,
            "module": module,
            "function": function,
            "line_number": line_number,
            "trace_id": trace_id,
            "request_id": request_id,
            "user_id": str(user_id) if user_id else None,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "request_method": request_method,
            "request_path": request_path,
            "request_data": request_data,
            "response_status": response_status,
            "duration_ms": duration_ms,
            "extra_data": extra_data,
        }
        
        # Only add non-None values
        for key, value in optional_fields.items():
            if value is not None:
                log_dict[key] = value
        
        return log_dict

    def _create_error_dict_from_model(
        self,
        source: str,
        error_type: str,
        error_message: str,
        stack_trace: Optional[str] = None,
        layer: Optional[str] = None,
        module: Optional[str] = None,
        function: Optional[str] = None,
        line_number: Optional[int] = None,
        trace_id: Optional[str] = None,
        user_id: Optional[Union[str, UUID]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        request_method: Optional[str] = None,
        request_path: Optional[str] = None,
        request_data: Optional[Dict[str, Any]] = None,
        error_details: Optional[Dict[str, Any]] = None,
        context_data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Create an error dictionary using the same structure as ErrorLog model.
        
        This ensures file error logs have exactly the same format as database error logs.
        """
        # Create a dictionary with the same fields as ErrorLog model
        error_dict = {
            "timestamp": self._format_timestamp(),
            "source": source,
            "exception_type": error_type,
            "exception_message": error_message,
        }
        
        # Add optional fields (only if not None)
        optional_fields = {
            "stack_trace": stack_trace,
            "layer": layer,
            "module": module,
            "function": function,
            "line_number": line_number,
            "trace_id": trace_id,
            "user_id": str(user_id) if user_id else None,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "request_method": request_method,
            "request_path": request_path,
            "request_data": request_data,
            "error_details": error_details,
            "context_data": context_data,
        }
        
        # Only add non-None values
        for key, value in optional_fields.items():
            if value is not None:
                error_dict[key] = value
        
        return error_dict

    def _format_log_entry(
        self,
        level: str,
        message: str,
        source: Optional[str] = None,
        extra_data: Optional[dict[str, Any]] = None,
    ) -> str:
        """Format a log entry as JSON using database model structure."""
        # Extract fields from extra_data
        kwargs = {
            "source": source or "backend",
            "level": level,
            "message": message,
        }
        
        if extra_data:
            # Map extra_data fields to model parameters
            field_mapping = {
                "layer": "layer",
                "module": "module",
                "function": "function", 
                "line_number": "line_number",
                "trace_id": "trace_id",
                "request_id": "request_id",
                "user_id": "user_id",
                "ip_address": "ip_address",
                "user_agent": "user_agent",
                "request_method": "request_method",
                "request_path": "request_path",
                "request_data": "request_data",
                "response_status": "response_status",
                "duration_ms": "duration_ms",
            }
            
            for extra_key, param_key in field_mapping.items():
                if extra_key in extra_data:
                    kwargs[param_key] = extra_data[extra_key]
            
            # Add remaining fields as extra_data
            remaining_data = {k: v for k, v in extra_data.items() if k not in field_mapping}
            if remaining_data:
                kwargs["extra_data"] = remaining_data
        
        # Create log dictionary using model structure
        log_dict = self._create_log_dict_from_model(**kwargs)
        return json.dumps(log_dict, ensure_ascii=False, default=str)

    def _format_exception_entry(
        self,
        exception_type: str,
        exception_message: str,
        source: Optional[str] = None,
        extra_data: Optional[dict[str, Any]] = None,
    ) -> str:
        """Format an exception entry as JSON using database model structure."""
        kwargs = {
            "source": source or "backend",
            "error_type": exception_type,
            "error_message": exception_message,
        }
        
        if extra_data:
            # Map extra_data fields to model parameters
            field_mapping = {
                "stack_trace": "stack_trace",
                "layer": "layer",
                "module": "module", 
                "function": "function",
                "line_number": "line_number",
                "trace_id": "trace_id",
                "user_id": "user_id",
                "ip_address": "ip_address",
                "user_agent": "user_agent",
                "request_method": "request_method",
                "request_path": "request_path",
                "request_data": "request_data",
                "error_details": "error_details",
                "context_data": "context_data",
            }
            
            for extra_key, param_key in field_mapping.items():
                if extra_key in extra_data:
                    kwargs[param_key] = extra_data[extra_key]
            
            # Add remaining fields as context_data
            remaining_data = {k: v for k, v in extra_data.items() if k not in field_mapping}
            if remaining_data:
                if "context_data" not in kwargs:
                    kwargs["context_data"] = {}
                kwargs["context_data"].update(remaining_data)
        
        # Create error dictionary using model structure
        error_dict = self._create_error_dict_from_model(**kwargs)
        return json.dumps(error_dict, ensure_ascii=False, default=str)

    def write_app_log(self, app_log: "AppLog") -> None:
        """
        Write an application log entry using AppLog model object.
        
        Args:
            app_log: AppLog model instance
        """
        # Convert model to dictionary for JSON serialization
        log_dict = {
            "timestamp": self._format_timestamp(),
            "source": app_log.source,
            "level": app_log.level,
            "message": app_log.message,
        }
        
        # Add optional fields (only if not None)
        optional_fields = {
            "layer": app_log.layer,
            "module": app_log.module,
            "function": app_log.function,
            "line_number": app_log.line_number,
            "trace_id": app_log.trace_id,
            "request_id": app_log.request_id,
            "user_id": str(app_log.user_id) if app_log.user_id else None,
            "ip_address": app_log.ip_address,
            "user_agent": app_log.user_agent,
            "request_method": app_log.request_method,
            "request_path": app_log.request_path,
            "request_data": app_log.request_data,
            "response_status": app_log.response_status,
            "duration_ms": app_log.duration_ms,
            "extra_data": app_log.extra_data,
        }
        
        # Only add non-None values
        for key, value in optional_fields.items():
            if value is not None:
                log_dict[key] = value
        
        # Convert to JSON string
        formatted_entry = json.dumps(log_dict, ensure_ascii=False, default=str)
        
        # Enqueue log entry for asynchronous writing
        try:
            # Write all logs (backend + frontend) to the same file for easier debugging
            # Use source field to distinguish between backend and frontend logs
            self.log_queue.put((self.application_logs_file, formatted_entry), block=False)
        except queue.Full:
            # Queue is full - log warning but don't block
            logging.warning("Log file queue is full, dropping log entry")

    def write_error_log(self, error_log: "ErrorLog") -> None:
        """
        Write an error log entry using ErrorLog model object.
        
        Args:
            error_log: ErrorLog model instance
        """
        # Convert model to dictionary for JSON serialization
        log_dict = {
            "timestamp": self._format_timestamp(),
            "source": error_log.source,
            "error_type": error_log.error_type,
            "error_message": error_log.error_message,
        }
        
        # Add optional fields (only if not None)
        optional_fields = {
            "error_code": error_log.error_code,
            "status_code": error_log.status_code,
            "stack_trace": error_log.stack_trace,
            "layer": error_log.layer,
            "module": error_log.module,
            "function": error_log.function,
            "line_number": error_log.line_number,
            "trace_id": error_log.trace_id,
            "user_id": str(error_log.user_id) if error_log.user_id else None,
            "ip_address": error_log.ip_address,
            "user_agent": error_log.user_agent,
            "request_method": error_log.request_method,
            "request_path": error_log.request_path,
            "request_data": error_log.request_data,
            "error_details": error_log.error_details,
            "context_data": error_log.context_data,
        }
        
        # Only add non-None values
        for key, value in optional_fields.items():
            if value is not None:
                log_dict[key] = value
        
        # Convert to JSON string
        formatted_entry = json.dumps(log_dict, ensure_ascii=False, default=str)
        
        # Enqueue log entry for asynchronous writing
        try:
            self.log_queue.put((self.application_exceptions_file, formatted_entry), block=False)
        except queue.Full:
            logging.warning("Log file queue is full, dropping error log entry")

    def write_audit_log(self, audit_log: "AuditLog") -> None:
        """
        Write an audit log entry using AuditLog model object.
        
        Args:
            audit_log: AuditLog model instance
        """
        # Normalize IP address (convert ::1 to 127.0.0.1 for localhost)
        ip_address = audit_log.ip_address
        if ip_address == "::1":
            ip_address = "127.0.0.1"
        
        # Convert model to dictionary for JSON serialization
        log_dict = {
            "timestamp": self._format_timestamp(),
            "action": audit_log.action,
        }
        
        # Add optional fields (only if not None)
        optional_fields = {
            "user_id": str(audit_log.user_id) if audit_log.user_id else None,
            "resource_type": audit_log.resource_type,
            "resource_id": str(audit_log.resource_id) if audit_log.resource_id else None,
            "ip_address": ip_address,
            "user_agent": audit_log.user_agent,
        }
        
        # Only add non-None values
        for key, value in optional_fields.items():
            if value is not None:
                log_dict[key] = value
        
        # Convert to JSON string
        formatted_entry = json.dumps(log_dict, ensure_ascii=False, default=str)
        
        # Enqueue log entry for asynchronous writing
        try:
            self.log_queue.put((self.audit_logs_file, formatted_entry), block=False)
        except queue.Full:
            logging.warning("Log file queue is full, dropping audit log entry")

    def write_performance_log(self, performance_log: "PerformanceLog") -> None:
        """
        Write a performance log entry using PerformanceLog model object.
        
        Args:
            performance_log: PerformanceLog model instance
        """
        # Convert model to dictionary for JSON serialization
        log_dict = {
            "timestamp": self._format_timestamp(),
            "source": performance_log.source,
            "metric_name": performance_log.metric_name,
            "metric_value": performance_log.metric_value,
            "metric_unit": performance_log.metric_unit,
        }
        
        # Add optional fields (only if not None)
        optional_fields = {
            "layer": performance_log.layer,
            "module": performance_log.module,
            "component_name": performance_log.component_name,
            "trace_id": performance_log.trace_id,
            "request_id": performance_log.request_id,
            "user_id": str(performance_log.user_id) if performance_log.user_id else None,
            "threshold": performance_log.threshold,
            "performance_issue": performance_log.performance_issue,
            "web_vitals": performance_log.web_vitals,
            "extra_data": performance_log.extra_data,
        }
        
        # Only add non-None values
        for key, value in optional_fields.items():
            if value is not None:
                log_dict[key] = value
        
        # Convert to JSON string
        formatted_entry = json.dumps(log_dict, ensure_ascii=False, default=str)
        
        # Enqueue log entry for asynchronous writing
        try:
            self.log_queue.put((self.performance_logs_file, formatted_entry), block=False)
        except queue.Full:
            logging.warning("Log file queue is full, dropping performance log entry")

    def write_log(
        self,
        source: str,  # backend, frontend
        level: str,
        message: str,
        layer: Optional[str] = None,  # Service, Router, Auth, Store, Component, Hook, Performance, Middleware, Database, Audit
        module: Optional[str] = None,  # Deprecated: use layer instead, kept for backward compatibility
        function: Optional[str] = None,
        line_number: Optional[int] = None,
        trace_id: Optional[str] = None,
        request_id: Optional[str] = None,
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        request_method: Optional[str] = None,
        request_path: Optional[str] = None,
        request_data: Optional[dict[str, Any]] = None,
        response_status: Optional[int] = None,
        duration_ms: Optional[int] = None,
        extra_data: Optional[dict[str, Any]] = None,
    ) -> None:
        """Write a log entry to the appropriate file.

        Args:
            source: Source of the log (backend/frontend)
            level: Log level (DEBUG/INFO/WARNING/ERROR/CRITICAL)
            message: Log message
            layer: AOP layer (Service, Router, Auth, Store, Component, Hook, Performance, Middleware, Database, Audit)
            module: Module name (deprecated, use layer instead)
            function: Function name
            line_number: Line number
            trace_id: Request trace ID
            request_id: Request ID in format {traceId}-{sequence}
            user_id: User ID
            ip_address: IP address
            user_agent: User agent string
            request_method: HTTP method
            request_path: Request path
            request_data: Request payload (sanitized)
            response_status: HTTP status code
            duration_ms: Request duration in milliseconds
            extra_data: Additional context data
        """
        # Use layer if provided, otherwise fall back to module for backward compatibility
        effective_layer = layer or module
        
        log_data = {
            "layer": effective_layer,
            "function": function,
            "line_number": line_number,
            "trace_id": trace_id,
            "request_id": request_id,
            "user_id": str(user_id) if user_id else None,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "request_method": request_method,
            "request_path": request_path,
            "request_data": request_data,
            "response_status": response_status,
            "duration_ms": duration_ms,
        }
        # Remove None values
        log_data = {k: v for k, v in log_data.items() if v is not None}
        if extra_data:
            log_data["extra_data"] = extra_data

        formatted_entry = self._format_log_entry(level, message, source=source, extra_data=log_data)

        # Enqueue log entry for asynchronous writing
        try:
            # Write all logs (backend + frontend) to the same file for easier debugging
            # Use source field to distinguish between backend and frontend logs
            self.log_queue.put((self.application_logs_file, formatted_entry), block=False)
        except queue.Full:
            # If queue is full, fallback to synchronous write to avoid losing logs
            logging.warning("Log queue is full, falling back to synchronous write")
            try:
                with self.write_lock:
                    self._rotate_file_if_needed(self.application_logs_file)
                    with open(self.application_logs_file, "a", encoding="utf-8") as f:
                        f.write(formatted_entry + "\n")
            except Exception as e:
                logging.error(f"Failed to write log to file: {e}")

    def write_exception(
        self,
        source: str,  # backend, frontend
        exception_type: str,
        exception_message: str,
        error_code: Optional[str] = None,
        status_code: Optional[int] = None,
        trace_id: Optional[str] = None,
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        request_method: Optional[str] = None,
        request_path: Optional[str] = None,
        request_data: Optional[dict[str, Any]] = None,
        stack_trace: Optional[str] = None,
        exception_details: Optional[dict[str, Any]] = None,
        context_data: Optional[dict[str, Any]] = None,
    ) -> None:
        """Write an exception entry to the appropriate file.

        Args:
            source: Source of the exception (backend/frontend)
            exception_type: Exception class name
            exception_message: Exception message
            error_code: Application error code
            status_code: HTTP status code
            trace_id: Request trace ID
            user_id: User ID
            ip_address: IP address
            user_agent: User agent string
            request_method: HTTP method
            request_path: Request path
            request_data: Request payload (sanitized)
            stack_trace: Full stack trace
            exception_details: Additional exception details
            context_data: Additional context data
        """
        exception_data = {
            "error_code": error_code,
            "status_code": status_code,
            "trace_id": trace_id,
            "user_id": str(user_id) if user_id else None,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "request_method": request_method,
            "request_path": request_path,
            "request_data": request_data,
            "stack_trace": stack_trace,
            "exception_details": exception_details,
            "context_data": context_data,
        }
        # Remove None values
        exception_data = {k: v for k, v in exception_data.items() if v is not None}

        formatted_entry = self._format_exception_entry(
            exception_type, exception_message, source=source, extra_data=exception_data
        )

        # Enqueue exception entry for asynchronous writing
        try:
            # Write all exceptions (backend + frontend) to the same file for easier debugging
            # Use source field to distinguish between backend and frontend exceptions
            self.log_queue.put((self.application_exceptions_file, formatted_entry), block=False)
        except queue.Full:
            # If queue is full, fallback to synchronous write to avoid losing logs
            logging.warning("Log queue is full, falling back to synchronous write")
            try:
                with self.write_lock:
                    self._rotate_file_if_needed(self.application_exceptions_file)
                    with open(self.application_exceptions_file, "a", encoding="utf-8") as f:
                        f.write(formatted_entry + "\n")
            except Exception as e:
                logging.error(f"Failed to write exception to file: {e}")

    def _format_audit_entry(
        self,
        action: str,
        user_id: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        extra_data: Optional[dict[str, Any]] = None,
    ) -> str:
        """Format an audit log entry as JSON."""
        # Use local time with milliseconds for consistency
        local_now = datetime.now()
        entry = {
            "timestamp": local_now.strftime("%Y-%m-%d %H:%M:%S.%f")[:-3],
            "action": action,
        }
        # Always include user_id field (even if None for clarity)
        entry["user_id"] = user_id
        if resource_type:
            entry["resource_type"] = resource_type
        if resource_id:
            entry["resource_id"] = resource_id
        # Normalize IP address (convert ::1 to 127.0.0.1 for localhost)
        if ip_address:
            if ip_address == "::1":
                ip_address = "127.0.0.1"
            entry["ip_address"] = ip_address
        if user_agent:
            entry["user_agent"] = user_agent
        if extra_data:
            entry.update(extra_data)
        return json.dumps(entry, ensure_ascii=False)

    def _format_performance_entry(
        self,
        metric_name: str,
        metric_value: float,
        metric_unit: str = "ms",
        source: Optional[str] = None,
        component_name: Optional[str] = None,
        trace_id: Optional[str] = None,
        request_id: Optional[str] = None,
        user_id: Optional[str] = None,
        extra_data: Optional[dict[str, Any]] = None,
    ) -> str:
        """Format a performance log entry as JSON.
        
        Args:
            metric_name: Name of the performance metric (e.g., 'render_time', 'api_response_time')
            metric_value: Numeric value of the metric
            metric_unit: Unit of measurement (default: 'ms')
            source: Source of the metric (backend/frontend)
            component_name: Name of the component being measured
            trace_id: Request trace ID for correlation
            request_id: Request ID for correlation
            user_id: User ID associated with the metric
            extra_data: Additional performance context data
        """
        entry = {
            "timestamp": self._format_timestamp(),
            "source": source,
            "metric_name": metric_name,
            "metric_value": metric_value,
            "metric_unit": metric_unit,
            "component_name": component_name,
            "trace_id": trace_id,
            "request_id": request_id,
            "user_id": str(user_id) if user_id else None,
        }
        # Remove None values
        entry = {k: v for k, v in entry.items() if v is not None}
        if extra_data:
            entry["extra_data"] = extra_data
        return json.dumps(entry, ensure_ascii=False)

    def write_audit_log(
        self,
        action: str,
        user_id: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        extra_data: Optional[dict[str, Any]] = None,
    ) -> None:
        """Write an audit log entry to audit.log file.

        Args:
            action: Action type (e.g., 'login', 'create', 'update', 'delete', 'approve')
            user_id: User ID who performed the action
            resource_type: Type of resource (e.g., 'member', 'performance', 'project')
            resource_id: ID of the affected resource
            ip_address: IP address of the user
            user_agent: User agent string
            extra_data: Additional context data
        """
        formatted_entry = self._format_audit_entry(
            action=action,
            user_id=str(user_id) if user_id else None,
            resource_type=resource_type,
            resource_id=str(resource_id) if resource_id else None,
            ip_address=ip_address,
            user_agent=user_agent,
            extra_data=extra_data,
        )

        # Enqueue audit log entry for asynchronous writing
        try:
            self.log_queue.put((self.audit_logs_file, formatted_entry), block=False)
        except queue.Full:
            # If queue is full, fallback to synchronous write to avoid losing logs
            logging.warning("Log queue is full, falling back to synchronous write")
            try:
                with self.write_lock:
                    self._rotate_file_if_needed(self.audit_logs_file)
                    with open(self.audit_logs_file, "a", encoding="utf-8") as f:
                        f.write(formatted_entry + "\n")
            except Exception as e:
                logging.error(f"Failed to write audit log to file: {e}")

    def write_performance_log_params(
        self,
        metric_name: str,
        metric_value: float,
        metric_unit: str = "ms",
        source: Optional[str] = None,
        component_name: Optional[str] = None,
        trace_id: Optional[str] = None,
        request_id: Optional[str] = None,
        user_id: Optional[str] = None,
        threshold: Optional[float] = None,
        performance_issue: Optional[str] = None,
        web_vitals: Optional[dict[str, Any]] = None,
        extra_data: Optional[dict[str, Any]] = None,
    ) -> None:
        """Write a performance log entry to performance.log file - Requirements 9.9.

        Args:
            metric_name: Name of the performance metric (e.g., 'render_time', 'api_response_time', 'FCP', 'LCP', 'TTI')
            metric_value: Numeric value of the metric
            metric_unit: Unit of measurement (default: 'ms')
            source: Source of the metric (backend/frontend)
            component_name: Name of the component being measured
            trace_id: Request trace ID for correlation
            request_id: Request ID for correlation
            user_id: User ID associated with the metric
            threshold: Performance threshold that was exceeded (if applicable)
            performance_issue: Type of performance issue (e.g., 'SLOW_API', 'POOR_FCP', 'SLOW_COMPONENT_RENDER')
            web_vitals: Web Vitals metrics snapshot (FCP, LCP, TTI, CLS)
            extra_data: Additional performance context data
        """
        # Build performance-specific extra data
        perf_extra_data = {}
        if threshold is not None:
            perf_extra_data["threshold"] = threshold
            if metric_value > threshold:
                perf_extra_data["exceeded_by"] = metric_value - threshold
        if performance_issue:
            perf_extra_data["performance_issue"] = performance_issue
        if web_vitals:
            perf_extra_data["web_vitals"] = web_vitals
        if extra_data:
            perf_extra_data.update(extra_data)

        formatted_entry = self._format_performance_entry(
            metric_name=metric_name,
            metric_value=metric_value,
            metric_unit=metric_unit,
            source=source,
            component_name=component_name,
            trace_id=trace_id,
            request_id=request_id,
            user_id=str(user_id) if user_id else None,
            extra_data=perf_extra_data if perf_extra_data else None,
        )

        # Enqueue performance log entry for asynchronous writing
        try:
            self.log_queue.put((self.performance_logs_file, formatted_entry), block=False)
        except queue.Full:
            # If queue is full, fallback to synchronous write to avoid losing logs
            logging.warning("Log queue is full, falling back to synchronous write")
            try:
                with self.write_lock:
                    self._rotate_file_if_needed(self.performance_logs_file)
                    with open(self.performance_logs_file, "a", encoding="utf-8") as f:
                        f.write(formatted_entry + "\n")
            except Exception as e:
                logging.error(f"Failed to write performance log to file: {e}")

    def close(self, timeout: float = 5.0) -> None:
        """Close file writer gracefully, ensuring all queued logs are written.
        
        Args:
            timeout: Maximum time to wait for queue to empty (seconds)
        """
        if not self._initialized or self._shutdown_event.is_set():
            return

        # Signal shutdown to worker thread
        self._shutdown_event.set()

        # Wait for worker thread to finish processing remaining entries
        if self._worker_thread and self._worker_thread.is_alive():
            # Wait for queue to be processed
            try:
                self.log_queue.join()
            except Exception:
                pass

            # Wait for thread to finish
            self._worker_thread.join(timeout=timeout)
            
            if self._worker_thread.is_alive():
                logging.warning(
                    f"FileLogWriter worker thread did not finish within {timeout}s timeout"
                )


# Singleton instance
file_log_writer = FileLogWriter()

