"""File log writer for application logs and exceptions.

This module provides thread-safe file writing for:
- backend_logs.log - Backend application logs
- frontend_logs.log - Frontend application logs
- backend_exceptions.log - Backend exceptions
- frontend_exceptions.log - Frontend exceptions
"""
import json
import threading
from datetime import datetime
from pathlib import Path
from typing import Any, Optional
import logging


class FileLogWriter:
    """Thread-safe file log writer for application logs and exceptions."""

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
        """Initialize file log writer."""
        if self._initialized:
            return

        # Determine backend directory path (go up from src/common/modules/logger)
        # backend/src/common/modules/logger/file_writer.py -> backend/
        backend_dir = Path(__file__).resolve().parent.parent.parent.parent.parent
        self.logs_dir = backend_dir / "logs"
        self.logs_dir.mkdir(parents=True, exist_ok=True)

        # File paths
        self.backend_logs_file = self.logs_dir / "backend_logs.log"
        self.frontend_logs_file = self.logs_dir / "frontend_logs.log"
        self.backend_exceptions_file = self.logs_dir / "backend_exceptions.log"
        self.frontend_exceptions_file = self.logs_dir / "frontend_exceptions.log"

        # Initialize log files (create empty files if they don't exist)
        for log_file in [
            self.backend_logs_file,
            self.frontend_logs_file,
            self.backend_exceptions_file,
            self.frontend_exceptions_file,
        ]:
            if not log_file.exists():
                log_file.touch()

        # File rotation settings
        self.max_bytes = 50 * 1024 * 1024  # 50MB
        self.backup_count = 10

        # Thread lock for writing
        self.write_lock = threading.Lock()

        self._initialized = True

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
        extra_data: Optional[dict[str, Any]] = None,
    ) -> str:
        """Format a log entry as JSON."""
        entry = {
            "timestamp": datetime.now().isoformat(),
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
        extra_data: Optional[dict[str, Any]] = None,
    ) -> str:
        """Format an exception entry as JSON."""
        entry = {
            "timestamp": datetime.now().isoformat(),
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

        formatted_entry = self._format_log_entry(level, message, log_data)

        with self.write_lock:
            try:
                file_path = (
                    self.backend_logs_file if source == "backend" else self.frontend_logs_file
                )
                # Rotate if needed
                self._rotate_file_if_needed(file_path)
                # Write to file
                with open(file_path, "a", encoding="utf-8") as f:
                    f.write(formatted_entry + "\n")
            except Exception as e:
                # Fallback to standard logging if file write fails
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
            exception_type, exception_message, exception_data
        )

        with self.write_lock:
            try:
                file_path = (
                    self.backend_exceptions_file
                    if source == "backend"
                    else self.frontend_exceptions_file
                )
                # Rotate if needed
                self._rotate_file_if_needed(file_path)
                # Write to file
                with open(file_path, "a", encoding="utf-8") as f:
                    f.write(formatted_entry + "\n")
            except Exception as e:
                # Fallback to standard logging if file write fails
                logging.error(f"Failed to write exception to file: {e}")

    def close(self) -> None:
        """Close file writer (no-op for direct file writes)."""
        pass


# Singleton instance
file_log_writer = FileLogWriter()

