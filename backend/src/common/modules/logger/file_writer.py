"""File log writer for application logs and exceptions.

This module provides thread-safe asynchronous file writing for:
- app_logs.log - Combined backend and frontend application logs (merged for easier debugging)
- app_exceptions.log - Combined backend and frontend exceptions (merged for easier debugging)
- audit_logs.log - Audit logs (compliance and security tracking)

Uses queue-based asynchronous writing to avoid blocking the main thread.
"""
import json
import queue
import threading
from datetime import datetime
from pathlib import Path
from typing import Any, Optional, Tuple
import logging


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
        self.application_logs_file = self.logs_dir / "app_logs.log"
        # Merged exceptions (backend + frontend) for easier debugging with trace_id correlation
        self.application_exceptions_file = self.logs_dir / "app_exceptions.log"
        self.audit_logs_file = self.logs_dir / "audit_logs.log"

        # Initialize log files (create empty files if they don't exist)
        for log_file in [
            self.application_logs_file,
            self.application_exceptions_file,
            self.audit_logs_file,
        ]:
            if not log_file.exists():
                log_file.touch()

        # File rotation settings
        self.max_bytes = 50 * 1024 * 1024  # 50MB
        self.backup_count = 10

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
        """Rotate file if it exceeds max size."""
        if not file_path.exists():
            return

        file_size = file_path.stat().st_size
        if file_size < self.max_bytes:
            return

        # Rotate existing files
        for i in range(self.backup_count - 1, 0, -1):
            old_file = file_path.parent / f"{file_path.stem}.{i}{file_path.suffix}"
            new_file = file_path.parent / f"{file_path.stem}.{i + 1}{file_path.suffix}"
            if old_file.exists():
                if i + 1 <= self.backup_count:
                    old_file.rename(new_file)

        # Move current file to .1
        backup_file = file_path.parent / f"{file_path.stem}.1{file_path.suffix}"
        if backup_file.exists():
            backup_file.unlink()
        file_path.rename(backup_file)

    def _format_log_entry(
        self,
        level: str,
        message: str,
        source: Optional[str] = None,
        extra_data: Optional[dict[str, Any]] = None,
    ) -> str:
        """Format a log entry as JSON."""
        entry = {
            "timestamp": datetime.now().isoformat(),
            "source": source,  # backend or frontend
            "level": level,
            "message": message,
        }
        if extra_data:
            entry.update(extra_data)
        return json.dumps(entry, ensure_ascii=False)

    def _format_exception_entry(
        self,
        exception_type: str,
        exception_message: str,
        source: Optional[str] = None,
        extra_data: Optional[dict[str, Any]] = None,
    ) -> str:
        """Format an exception entry as JSON."""
        entry = {
            "timestamp": datetime.now().isoformat(),
            "source": source,  # backend or frontend
            "exception_type": exception_type,
            "exception_message": exception_message,
        }
        if extra_data:
            entry.update(extra_data)
        return json.dumps(entry, ensure_ascii=False)

    def write_log(
        self,
        source: str,  # backend, frontend
        level: str,
        message: str,
        module: Optional[str] = None,
        function: Optional[str] = None,
        line_number: Optional[int] = None,
        trace_id: Optional[str] = None,
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
            module: Module name
            function: Function name
            line_number: Line number
            trace_id: Request trace ID
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
        log_data = {
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
        entry = {
            "timestamp": datetime.now().isoformat(),
            "action": action,
        }
        if user_id:
            entry["user_id"] = user_id
        if resource_type:
            entry["resource_type"] = resource_type
        if resource_id:
            entry["resource_id"] = resource_id
        if ip_address:
            entry["ip_address"] = ip_address
        if user_agent:
            entry["user_agent"] = user_agent
        if extra_data:
            entry.update(extra_data)
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
        """Write an audit log entry to audit_logs.log file.

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

