"""File log writer for application logs and exceptions.

This module provides thread-safe asynchronous file writing for:
- app.log - Combined backend and frontend application logs
- error.log - Combined backend and frontend exceptions
- audit.log - Audit logs (compliance and security tracking)
- performance.log - Performance metrics logs
- system.log - System logs

Uses queue-based asynchronous writing to avoid blocking the main thread.
All formatting is delegated to Schema classes for consistency.

Log level configuration (per file):
- app.log, audit.log, error.log: Production = INFO, Development = DEBUG
- system.log, performance.log: Production = WARNING, Development = INFO
"""
import json
import queue
import threading
from datetime import datetime, date
from pathlib import Path
from typing import Any, Optional, Tuple, Union, TYPE_CHECKING
import logging
import re
from uuid import UUID

from .base_writer import BaseLogWriter

# Import database models for type hints
from ..db.models import AppLog, ErrorLog, AuditLog, PerformanceLog

if TYPE_CHECKING:
    from .schemas import (
        BaseLogSchema, AppLogCreate, ErrorLogCreate, 
        AuditLogCreate, PerformanceLogCreate, SystemLogCreate
    )


class FileLogWriter(BaseLogWriter):
    """Thread-safe asynchronous file log writer.

    Uses a queue-based approach where log entries are enqueued and written
    asynchronously by a background thread to avoid blocking the main thread.
    
    Inherits from BaseLogWriter:
    - LOG_LEVELS constant for log level priority mapping
    - should_write() and should_write_with_level() for log level filtering
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
        
        # Initialize base class
        super().__init__(min_level="INFO", enabled=True)

        # Determine backend directory path
        backend_dir = Path(__file__).resolve().parent.parent.parent.parent.parent
        self.logs_dir = backend_dir / "logs"
        self.logs_dir.mkdir(parents=True, exist_ok=True)

        # File paths
        self.application_logs_file = self.logs_dir / "app.log"
        self.application_exceptions_file = self.logs_dir / "error.log"
        self.audit_logs_file = self.logs_dir / "audit.log"
        self.performance_logs_file = self.logs_dir / "performance.log"
        self.system_logs_file = self.logs_dir / "system.log"

        # Initialize log files
        for log_file in [
            self.application_logs_file,
            self.application_exceptions_file,
            self.audit_logs_file,
            self.performance_logs_file,
            self.system_logs_file,
        ]:
            if not log_file.exists():
                log_file.touch()

        # File rotation settings
        self.backup_count = 30
        self._last_rotation_date = {}

        # Initialize log level configuration
        self._init_log_levels()

        # Queue for asynchronous log writing
        self.log_queue: queue.Queue[Tuple[Path, str]] = queue.Queue(maxsize=50000)
        
        # Control flags for background thread
        self._shutdown_event = threading.Event()
        self._worker_thread: Optional[threading.Thread] = None
        self.write_lock = threading.Lock()
        
        # Start background worker thread
        self._start_worker_thread()
        self._initialized = True

    def _init_log_levels(self) -> None:
        """Initialize log level configuration from LogConfig."""
        from .config import get_log_config
        
        config = get_log_config()
        
        self.log_level_app = config.level_app
        self.log_level_audit = config.level_audit
        self.log_level_error = config.level_error
        self.log_level_system = config.level_system
        self.log_level_performance = config.level_performance

    # =========================================================================
    # File and level mapping
    # =========================================================================

    def _get_file_for_type(self, log_type: str) -> Path:
        """Get the file path for a given log type."""
        return {
            "app": self.application_logs_file,
            "error": self.application_exceptions_file,
            "audit": self.audit_logs_file,
            "performance": self.performance_logs_file,
            "system": self.system_logs_file,
        }.get(log_type, self.application_logs_file)

    def _get_min_level_for_type(self, log_type: str) -> str:
        """Get the minimum log level for a given log type."""
        return {
            "app": self.log_level_app,
            "error": self.log_level_error,
            "audit": self.log_level_audit,
            "performance": self.log_level_performance,
            "system": self.log_level_system,
        }.get(log_type, "INFO")

    def get_log_level_for_file(self, file_path: Path) -> str:
        """Get the minimum log level for a specific log file."""
        return {
            "app.log": self.log_level_app,
            "audit.log": self.log_level_audit,
            "error.log": self.log_level_error,
            "system.log": self.log_level_system,
            "performance.log": self.log_level_performance,
        }.get(file_path.name, "INFO")

    # =========================================================================
    # Background worker thread
    # =========================================================================

    def _start_worker_thread(self) -> None:
        """Start the background worker thread."""
        self._worker_thread = threading.Thread(
            target=self._worker_loop,
            name="FileLogWriter-Worker",
            daemon=True,
        )
        self._worker_thread.start()

    def _worker_loop(self) -> None:
        """Background worker that processes log entries from the queue."""
        while not self._shutdown_event.is_set():
            try:
                file_path, entry = self.log_queue.get(timeout=0.5)
                self._write_entry_to_file(file_path, entry)
                self.log_queue.task_done()
            except queue.Empty:
                continue
            except Exception as e:
                logging.error(f"Error in FileLogWriter worker thread: {e}")

        # Process remaining entries before shutdown
        while True:
            try:
                file_path, entry = self.log_queue.get_nowait()
                self._write_entry_to_file(file_path, entry)
                self.log_queue.task_done()
            except queue.Empty:
                break

    def _write_entry_to_file(self, file_path: Path, entry: str) -> None:
        """Write a single log entry to the specified file."""
        with self.write_lock:
            try:
                self._rotate_file_if_needed(file_path)
                with open(file_path, "a", encoding="utf-8") as f:
                    f.write(entry + "\n")
            except Exception as e:
                logging.error(f"Failed to write log entry to {file_path}: {e}")

    # =========================================================================
    # File rotation
    # =========================================================================

    def _rotate_file_if_needed(self, file_path: Path) -> None:
        """Rotate file daily at midnight."""
        if not file_path.exists():
            return

        today = date.today()
        file_key = str(file_path)
        
        if self._last_rotation_date.get(file_key) == today:
            return
        
        file_mtime = datetime.fromtimestamp(file_path.stat().st_mtime).date()
        
        if file_mtime < today:
            date_str = file_mtime.strftime("%Y-%m-%d")
            backup_file = file_path.parent / f"{file_path.stem}.{date_str}{file_path.suffix}"
            
            if backup_file.exists():
                timestamp = datetime.now().strftime("%H%M%S")
                backup_file = file_path.parent / f"{file_path.stem}.{date_str}.{timestamp}{file_path.suffix}"
            
            file_path.rename(backup_file)
            self._last_rotation_date[file_key] = today
            self._cleanup_old_files(file_path)
    
    def _cleanup_old_files(self, file_path: Path) -> None:
        """Clean up old log files beyond backup_count."""
        if not file_path.parent.exists():
            return
        
        pattern = re.compile(
            rf"^{re.escape(file_path.stem)}\."
            rf"(?:\d{{4}}-\d{{2}}-\d{{2}}|\d+)"
            rf"{re.escape(file_path.suffix)}$"
        )
        
        backup_files = [f for f in file_path.parent.iterdir() if f.is_file() and pattern.match(f.name)]
        backup_files.sort(key=lambda f: f.stat().st_mtime)
        
        for old_file in backup_files[:-self.backup_count]:
            try:
                old_file.unlink()
            except Exception as e:
                logging.warning(f"Failed to delete old log file {old_file}: {e}")

    # =========================================================================
    # Unified write method - 实现基类抽象方法
    # =========================================================================

    def write(self, schema: "BaseLogSchema", log_type: str = "app") -> None:
        """Write a log entry to the appropriate file using schema.
        
        This is the unified write method that implements the BaseLogWriter interface.
        All other write methods delegate to this one.
        
        Args:
            schema: The log schema instance containing log data
            log_type: Type of log (app, error, audit, performance, system)
        """
        log_level = getattr(schema, "level", "INFO") or "INFO"
        min_level = self._get_min_level_for_type(log_type)
        
        if not self.should_write_with_level(log_level, min_level):
            return
        
        file_path = self._get_file_for_type(log_type)
        formatted_entry = json.dumps(schema.to_file_dict(), ensure_ascii=False, default=str)
        
        self._enqueue_entry(file_path, formatted_entry, log_type)

    def _enqueue_entry(self, file_path: Path, entry: str, log_type: str = "log") -> None:
        """Enqueue a log entry for asynchronous writing."""
        try:
            self.log_queue.put((file_path, entry), block=False)
        except queue.Full:
            logging.warning(f"Log file queue is full, dropping {log_type} entry")

    # =========================================================================
    # Model-based write methods - 从数据库模型写入
    # =========================================================================

    def write_app_log(self, app_log: "AppLog") -> None:
        """Write an application log entry from AppLog model."""
        from .schemas import AppLogCreate
        
        schema = AppLogCreate(
            source=app_log.source,
            level=app_log.level,
            message=app_log.message,
            layer=app_log.layer,
            module=app_log.module,
            function=app_log.function,
            line_number=app_log.line_number,
            file_path=app_log.file_path,
            trace_id=app_log.trace_id,
            request_id=app_log.request_id,
            user_id=app_log.user_id,
            ip_address=app_log.ip_address,
            user_agent=app_log.user_agent,
            request_method=app_log.request_method,
            request_path=app_log.request_path,
            response_status=app_log.response_status,
            duration_ms=app_log.duration_ms,
            extra_data=app_log.extra_data,
        )
        self.write(schema, "app")

    def write_error_log(self, error_log: "ErrorLog") -> None:
        """Write an error log entry from ErrorLog model."""
        from .schemas import ErrorLogCreate
        
        schema = ErrorLogCreate(
            source=error_log.source,
            error_type=error_log.error_type,
            error_message=error_log.error_message,
            error_code=error_log.error_code,
            status_code=error_log.status_code,
            stack_trace=error_log.stack_trace,
            layer=error_log.layer,
            module=error_log.module,
            function=error_log.function,
            line_number=error_log.line_number,
            file_path=error_log.file_path,
            trace_id=error_log.trace_id,
            user_id=error_log.user_id,
            ip_address=error_log.ip_address,
            user_agent=error_log.user_agent,
            request_method=error_log.request_method,
            request_path=error_log.request_path,
            error_details=error_log.error_details,
            context_data=error_log.context_data,
        )
        self.write(schema, "error")

    def write_audit_log(
        self,
        audit_log_or_action: Union["AuditLog", str],
        user_id: Optional[Union[str, UUID]] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[Union[str, UUID]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        trace_id: Optional[str] = None,
        request_id: Optional[str] = None,
        request_method: Optional[str] = None,
        request_path: Optional[str] = None,
        module: Optional[str] = None,
        function: Optional[str] = None,
        line_number: Optional[int] = None,
        file_path: Optional[str] = None,
        result: str = "SUCCESS",
        extra_data: Optional[dict[str, Any]] = None,
    ) -> None:
        """Write an audit log entry.
        
        Supports two calling conventions:
        1. Model-based: write_audit_log(audit_log_model)
        2. Parameter-based: write_audit_log(action="LOGIN", user_id=..., ...)
        """
        from .schemas import AuditLogCreate
        
        # Check if first argument is an AuditLog model or a string (action)
        if isinstance(audit_log_or_action, str):
            # Parameter-based call - 必填字段使用空字符串/0
            schema = AuditLogCreate(
                action=audit_log_or_action,
                source="backend",
                level="INFO",
                layer="Auth",
                module=module or '',
                function=function or '',
                line_number=line_number or 0,
                file_path=file_path or '',
                trace_id=trace_id or '',
                request_id=request_id or '',
                user_id=UUID(str(user_id)) if user_id else None,
                resource_type=resource_type,
                resource_id=UUID(str(resource_id)) if resource_id else None,
                result=result,
                ip_address=ip_address,
                user_agent=user_agent,
                request_method=request_method,
                request_path=request_path,
                extra_data=extra_data,
            )
        else:
            # Model-based call - 必填字段使用空字符串/0
            audit_log = audit_log_or_action
            schema = AuditLogCreate(
                action=audit_log.action,
                source="backend",
                level="INFO",
                layer="Auth",
                module=getattr(audit_log, 'module', '') or '',
                function=getattr(audit_log, 'function', '') or '',
                line_number=getattr(audit_log, 'line_number', 0) or 0,
                file_path=getattr(audit_log, 'file_path', '') or '',
                trace_id=audit_log.trace_id or '',
                request_id=audit_log.request_id or '',
                user_id=audit_log.user_id,
                resource_type=audit_log.resource_type,
                resource_id=audit_log.resource_id,
                result="SUCCESS",
                ip_address=audit_log.ip_address,
                user_agent=audit_log.user_agent,
                request_method=audit_log.request_method,
                request_path=audit_log.request_path,
            )
        self.write(schema, "audit")

    def write_performance_log(self, performance_log: "PerformanceLog") -> None:
        """Write a performance log entry from PerformanceLog model."""
        from .schemas import PerformanceLogCreate
        
        threshold_ms = getattr(performance_log, 'threshold', None)
        duration_ms = getattr(performance_log, 'metric_value', 0)
        is_slow = bool(getattr(performance_log, 'performance_issue', None)) or (
            threshold_ms and duration_ms > threshold_ms
        )
        
        schema = PerformanceLogCreate(
            source=performance_log.source,
            level="WARNING" if is_slow else "INFO",
            metric_name=performance_log.metric_name,
            metric_value=performance_log.metric_value,
            metric_unit=performance_log.metric_unit,
            layer=performance_log.layer or "Performance",
            module=performance_log.module or '',
            function=getattr(performance_log, 'function', '') or '',
            line_number=getattr(performance_log, 'line_number', 0) or 0,
            file_path=getattr(performance_log, 'file_path', '') or '',
            trace_id=performance_log.trace_id or '',
            request_id=performance_log.request_id or '',
            component_name=performance_log.component_name,
            user_id=performance_log.user_id,
            duration_ms=duration_ms,
            threshold_ms=float(threshold_ms) if threshold_ms else None,
            is_slow=is_slow,
            web_vitals=performance_log.web_vitals,
            extra_data=performance_log.extra_data,
        )
        self.write(schema, "performance")

    # =========================================================================
    # Parameter-based write methods - 向后兼容的参数接口
    # =========================================================================

    def write_log(
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
        """Write a log entry (backward compatible parameter interface)."""
        from .schemas import AppLogCreate
        
        # Merge request_data into extra_data
        merged_extra = dict(extra_data) if extra_data else {}
        if request_data:
            merged_extra["request_data"] = request_data
        
        schema = AppLogCreate(
            source=source,
            level=level,
            message=message,
            layer=layer or module,  # Use layer, fallback to module
            module=module,
            function=function,
            line_number=line_number,
            trace_id=trace_id,
            request_id=request_id,
            user_id=UUID(user_id) if user_id else None,
            ip_address=ip_address,
            user_agent=user_agent,
            request_method=request_method,
            request_path=request_path,
            response_status=response_status,
            duration_ms=duration_ms,
            extra_data=merged_extra if merged_extra else None,
        )
        self.write(schema, "app")

    def write_exception(
        self,
        source: str,
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
        """Write an exception entry (backward compatible parameter interface)."""
        from .schemas import ErrorLogCreate
        
        # Merge request_data into context_data
        merged_context = dict(context_data) if context_data else {}
        if request_data:
            merged_context["request_data"] = request_data
        
        schema = ErrorLogCreate(
            source=source,
            error_type=exception_type,
            error_message=exception_message,
            error_code=error_code,
            status_code=status_code,
            stack_trace=stack_trace,
            trace_id=trace_id,
            user_id=UUID(user_id) if user_id else None,
            ip_address=ip_address,
            user_agent=user_agent,
            request_method=request_method,
            request_path=request_path,
            error_details=exception_details,
            context_data=merged_context if merged_context else None,
        )
        self.write(schema, "error")

    # write_audit_log already supports parameter-based calls, no need for write_audit_log_params

    def write_performance_log_params(
        self,
        metric_name: str,
        metric_value: float,
        metric_unit: str = "ms",
        source: Optional[str] = None,
        level: Optional[str] = None,
        module: Optional[str] = None,
        function: Optional[str] = None,
        line_number: Optional[int] = None,
        component_name: Optional[str] = None,
        trace_id: Optional[str] = None,
        request_id: Optional[str] = None,
        user_id: Optional[str] = None,
        duration_ms: Optional[float] = None,
        threshold_ms: Optional[float] = None,
        is_slow: bool = False,
        web_vitals: Optional[dict[str, Any]] = None,
        extra_data: Optional[dict[str, Any]] = None,
    ) -> None:
        """Write a performance log entry (backward compatible parameter interface)."""
        from .schemas import PerformanceLogCreate
        
        schema = PerformanceLogCreate(
            source=source or "backend",
            level=level or ("WARNING" if is_slow else "INFO"),
            metric_name=metric_name,
            metric_value=metric_value,
            metric_unit=metric_unit,
            layer="Performance",
            module=module,
            function=function,
            line_number=line_number,
            component_name=component_name,
            trace_id=trace_id,
            request_id=request_id,
            user_id=UUID(user_id) if user_id else None,
            duration_ms=duration_ms,
            threshold_ms=threshold_ms,
            is_slow=is_slow,
            web_vitals=web_vitals,
            extra_data=extra_data,
        )
        self.write(schema, "performance")

    # =========================================================================
    # Schema-based write methods - 直接使用 schema 写入
    # =========================================================================

    def write_app_log_from_schema(self, schema: "AppLogCreate") -> None:
        """Write an application log entry directly from schema."""
        self.write(schema, "app")

    def write_error_log_from_schema(self, schema: "ErrorLogCreate") -> None:
        """Write an error log entry directly from schema."""
        self.write(schema, "error")

    def write_audit_log_from_schema(self, schema: "AuditLogCreate") -> None:
        """Write an audit log entry directly from schema."""
        self.write(schema, "audit")

    def write_performance_log_from_schema(self, schema: "PerformanceLogCreate") -> None:
        """Write a performance log entry directly from schema."""
        self.write(schema, "performance")

    def write_system_log_from_schema(self, schema: "SystemLogCreate") -> None:
        """Write a system log entry directly from schema."""
        self.write(schema, "system")

    # =========================================================================
    # Lifecycle methods
    # =========================================================================

    def close(self, timeout: float = 5.0) -> None:
        """Close file writer gracefully."""
        if not self._initialized or self._shutdown_event.is_set():
            return

        self._shutdown_event.set()

        if self._worker_thread and self._worker_thread.is_alive():
            try:
                self.log_queue.join()
            except Exception:
                pass
            self._worker_thread.join(timeout=timeout)
            
            if self._worker_thread.is_alive():
                logging.warning(f"FileLogWriter worker thread did not finish within {timeout}s")

    def clear_queue(self) -> int:
        """Clear all pending log entries from the queue."""
        cleared = 0
        while True:
            try:
                self.log_queue.get_nowait()
                self.log_queue.task_done()
                cleared += 1
            except queue.Empty:
                break
        return cleared


# Singleton instance
file_log_writer = FileLogWriter()
