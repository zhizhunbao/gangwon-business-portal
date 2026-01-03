"""Unified database log writer for all log types using Supabase API.

This module provides unified asynchronous writing of all log types to Supabase database:
- Application logs (app_logs) - batch processing
- Error logs (error_logs) - single insert
- System logs (system_logs) - single insert
- Audit logs (audit_logs) - single insert

Features:
- Asynchronous queue-based writing (non-blocking)
- Batch insertion for application logs (configurable batch size and interval)
- Single insert for error/system/audit logs (immediate write)
- Log level filtering (configurable) - inherited from BaseLogWriter
- Failure handling with graceful degradation
- Uses database models to ensure data structure consistency

Inherits from BaseLogWriter:
- LOG_LEVELS constant for log level priority mapping
- should_write() and should_write_with_level() for log level filtering
"""
import asyncio
import logging
from datetime import datetime
from typing import Dict, Any, Optional, Union, TYPE_CHECKING
from uuid import UUID, uuid4
from collections import deque

from ..config import settings
from .base_writer import BaseLogWriter
# Import database models for consistent data structure
from ..db.models import AppLog, ErrorLog, SystemLog, AuditLog, PerformanceLog

if TYPE_CHECKING:
    from .schemas import BaseLogSchema, AppLogCreate, ErrorLogCreate, AuditLogCreate, PerformanceLogCreate


def _get_raw_supabase_client():
    """获取原始 Supabase 客户端以避免循环日志记录"""
    from ..supabase.client import get_supabase_client
    return get_supabase_client()


async def _async_insert(table_name: str, data: dict) -> Optional[dict]:
    """异步插入数据到指定表，避免循环日志记录"""
    try:
        client = _get_raw_supabase_client()
        # Run synchronous execute in thread pool
        import asyncio
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None, 
            lambda: client.table(table_name).insert(data).execute()
        )
        if result.data and len(result.data) > 0:
            return result.data[0]
        import logging
        logging.warning(f"_async_insert to {table_name} returned empty result")
        return None
    except Exception as e:
        import logging
        logging.warning(f"_async_insert to {table_name} failed: {str(e)}")
        return None


from ...utils.formatters import now_utc


def format_timestamp() -> str:
    """Format timestamp in ISO format with timezone for database storage.
    
    Uses UTC time with timezone info to ensure consistent storage in PostgreSQL.
    The database column is TIMESTAMP WITH TIME ZONE, so we need proper timezone info.
    """
    return now_utc().isoformat()


class DatabaseLogWriter(BaseLogWriter):
    """Asynchronous batch database log writer using Supabase API.
    
    Uses a queue-based approach where log entries are enqueued and written
    in batches to reduce database overhead and avoid blocking requests.
    
    Inherits from BaseLogWriter:
    - LOG_LEVELS constant for log level priority mapping
    - should_write() and should_write_with_level() for log level filtering
    """
    
    _instance = None
    _lock = asyncio.Lock()
    
    def __new__(cls):
        """Singleton pattern."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        """Initialize database log writer with async batch writing."""
        if self._initialized:
            return
        
        # Get configuration from LogConfig
        from .config import get_log_config
        config = get_log_config()
        
        # Configuration from LogConfig
        self.batch_size = config.batch_size
        self.batch_interval = config.batch_interval
        self.min_log_level = config.db_level_app
        self.min_system_log_level = config.db_level_system
        
        # Initialize base class with app log level
        super().__init__(min_level=self.min_log_level, enabled=config.db_enabled)
        
        # Queue for log entries
        self.log_queue: asyncio.Queue[Dict[str, Any]] = asyncio.Queue(maxsize=10000)
        
        # Queue for performance log entries - Requirements 10.5
        self.performance_queue: asyncio.Queue[Dict[str, Any]] = asyncio.Queue(maxsize=10000)
        
        # Control flags
        self._shutdown_event = asyncio.Event()
        self._worker_task: Optional[asyncio.Task] = None
        self._performance_worker_task: Optional[asyncio.Task] = None
        
        # Statistics
        self._stats = {
            "total_enqueued": 0,
            "total_written": 0,
            "total_failed": 0,
            "last_write_time": None,
            "performance_total_enqueued": 0,
            "performance_total_written": 0,
            "performance_total_failed": 0,
            "performance_last_write_time": None,
        }
        
        self._initialized = True
    
    def _ensure_worker_started(self) -> None:
        """Ensure worker task is started (lazy initialization)."""
        if not self.enabled:
            return
        
        # Check if we're in an async context and worker is not running
        try:
            loop = asyncio.get_running_loop()
            if self._worker_task is None or self._worker_task.done():
                self._worker_task = asyncio.create_task(self._batch_worker_loop(self.log_queue, "app_logs", "app"))
            if self._performance_worker_task is None or self._performance_worker_task.done():
                self._performance_worker_task = asyncio.create_task(self._batch_worker_loop(self.performance_queue, "performance_logs", "performance"))
        except RuntimeError:
            # No event loop running - worker will be started on first async call
            pass

    # =========================================================================
    # Unified batch processing - 统一批量处理
    # =========================================================================

    async def _batch_worker_loop(
        self, 
        queue: asyncio.Queue, 
        table_name: str, 
        log_type: str
    ) -> None:
        """Generic background worker task that processes log entries in batches.
        
        Args:
            queue: The asyncio queue to read from
            table_name: Database table name for batch insert
            log_type: Type of log for stats tracking (app or performance)
        """
        batch: list[Dict[str, Any]] = []
        last_flush_time = datetime.now()
        
        while not self._shutdown_event.is_set():
            try:
                # Try to get log entry with timeout
                try:
                    timeout = max(0.1, self.batch_interval - (datetime.now() - last_flush_time).total_seconds())
                    log_entry = await asyncio.wait_for(queue.get(), timeout=timeout)
                    batch.append(log_entry)
                except asyncio.TimeoutError:
                    # Timeout - flush batch if not empty
                    pass
                
                # Check if we should flush the batch
                should_flush = (
                    len(batch) >= self.batch_size or
                    (batch and (datetime.now() - last_flush_time).total_seconds() >= self.batch_interval)
                )
                
                if should_flush and batch:
                    await self._flush_batch_to_table(batch, table_name, log_type)
                    batch.clear()
                    last_flush_time = datetime.now()
                    
            except Exception as e:
                # Log error but continue processing
                logging.error(f"Error in DatabaseLogWriter {log_type} worker loop: {e}", exc_info=True)
                await asyncio.sleep(1)  # Wait before retrying
        
        # Flush remaining entries on shutdown
        if batch:
            await self._flush_batch_to_table(batch, table_name, log_type)

    async def _flush_batch_to_table(
        self, 
        batch: list[Dict[str, Any]], 
        table_name: str, 
        log_type: str
    ) -> None:
        """Flush a batch of log entries to the specified table.
        
        Args:
            batch: List of log entry dictionaries
            table_name: Database table name
            log_type: Type of log for stats tracking (app or performance)
        """
        if not batch:
            return
        
        # Stats keys based on log type
        is_performance = log_type == "performance"
        written_key = "performance_total_written" if is_performance else "total_written"
        failed_key = "performance_total_failed" if is_performance else "total_failed"
        time_key = "performance_last_write_time" if is_performance else "last_write_time"
        
        try:
            client = _get_raw_supabase_client()
            
            # Batch insert using Supabase API
            result = client.table(table_name).insert(batch).execute()
            
            if result.data:
                self._stats[written_key] += len(result.data)
                self._stats[time_key] = datetime.now()
            else:
                self._stats[failed_key] += len(batch)
                logging.warning(f"Failed to write {len(batch)} {log_type} log entries to database: no data returned")
                
        except Exception as e:
            self._stats[failed_key] += len(batch)
            logging.error(f"Failed to write {len(batch)} {log_type} log entries to database: {e}", exc_info=True)
            # Don't raise - graceful degradation

    # Legacy worker methods - 保留向后兼容，委托到通用方法
    async def _worker_loop(self) -> None:
        """Background worker task that processes app log entries in batches."""
        await self._batch_worker_loop(self.log_queue, "app_logs", "app")

    async def _performance_worker_loop(self) -> None:
        """Background worker task that processes performance log entries in batches."""
        await self._batch_worker_loop(self.performance_queue, "performance_logs", "performance")

    async def _flush_batch(self, batch: list[Dict[str, Any]]) -> None:
        """Flush a batch of app log entries to Supabase."""
        await self._flush_batch_to_table(batch, "app_logs", "app")

    async def _flush_performance_batch(self, batch: list[Dict[str, Any]]) -> None:
        """Flush a batch of performance log entries to Supabase."""
        await self._flush_batch_to_table(batch, "performance_logs", "performance")
    
    def _should_write_to_db(self, level: str) -> bool:
        """Check if app log level should be written to database.
        
        Uses base class should_write_with_level() for consistent filtering.
        """
        return self.should_write_with_level(level, self.min_log_level)
    
    def _should_write_system_log_to_db(self, level: str) -> bool:
        """Check if system log level should be written to database.
        
        Uses base class should_write_with_level() for consistent filtering.
        """
        return self.should_write_with_level(level, self.min_system_log_level)

    # =========================================================================
    # Table and level mapping
    # =========================================================================

    def _get_table_for_type(self, log_type: str) -> str:
        """Get the database table name for a given log type."""
        return {
            "app": "app_logs",
            "error": "error_logs",
            "audit": "audit_logs",
            "performance": "performance_logs",
            "system": "system_logs",
        }.get(log_type, "app_logs")

    def _get_min_level_for_type(self, log_type: str) -> str:
        """Get the minimum log level for a given log type."""
        return {
            "app": self.min_log_level,
            "system": self.min_system_log_level,
            # Error, audit, performance don't have level filtering
            "error": "DEBUG",
            "audit": "DEBUG",
            "performance": "DEBUG",
        }.get(log_type, "INFO")

    def _is_batch_type(self, log_type: str) -> bool:
        """Check if log type uses batch processing."""
        return log_type in ("app", "performance")

    # =========================================================================
    # Unified write method - 实现基类抽象方法
    # =========================================================================

    def write(self, schema: "BaseLogSchema", log_type: str = "app") -> None:
        """Write a log entry to the appropriate database table using schema.
        
        This is the unified write method that implements the BaseLogWriter interface.
        Routes to batch queue or immediate write based on log type.
        
        Args:
            schema: The log schema instance containing log data
            log_type: Type of log (app, error, audit, performance, system)
        """
        if not self.enabled:
            return
        
        log_level = getattr(schema, "level", "INFO") or "INFO"
        min_level = self._get_min_level_for_type(log_type)
        
        if not self.should_write_with_level(log_level, min_level):
            return
        
        # Get db dict and add created_at
        log_data = schema.to_db_dict()
        log_data["created_at"] = format_timestamp()
        
        if self._is_batch_type(log_type):
            # Batch processing for app and performance logs
            self._enqueue_batch(log_data, log_type)
        else:
            # Immediate write for error, audit, system logs
            self._write_immediate(log_data, log_type)

    def _enqueue_batch(self, log_data: Dict[str, Any], log_type: str) -> None:
        """Enqueue a log entry for batch processing.
        
        Args:
            log_data: Dictionary containing log data
            log_type: Type of log (app or performance)
        """
        if not self._enabled:
            return
            
        self._ensure_worker_started()
        
        queue = self.performance_queue if log_type == "performance" else self.log_queue
        stats_key = "performance_total_enqueued" if log_type == "performance" else "total_enqueued"
        fail_key = "performance_total_failed" if log_type == "performance" else "total_failed"
        
        try:
            queue.put_nowait(log_data)
            self._stats[stats_key] += 1
        except asyncio.QueueFull:
            logging.warning(f"Log database queue is full, dropping {log_type} entry")
            self._stats[fail_key] += 1

    def _write_immediate(self, log_data: Dict[str, Any], log_type: str) -> None:
        """Write a log entry immediately (non-batch).
        
        Args:
            log_data: Dictionary containing log data
            log_type: Type of log (error, audit, system)
        """
        if not self._enabled:
            return
            
        table_name = self._get_table_for_type(log_type)
        
        async def _insert_log():
            try:
                client = _get_raw_supabase_client()
                return client.table(table_name).insert(log_data).execute()
            except Exception:
                pass
        
        # Try to run in background task if event loop is running
        try:
            asyncio.get_running_loop()
            asyncio.create_task(_insert_log())
        except RuntimeError:
            # No event loop running - run synchronously
            try:
                client = _get_raw_supabase_client()
                client.table(table_name).insert(log_data).execute()
            except Exception:
                pass

    # =========================================================================
    # Model-based enqueue methods - 从数据库模型入队
    # =========================================================================

    def enqueue_app_log(self, app_log: "AppLog") -> None:
        """Enqueue an application log entry using AppLog model object.
        
        Delegates to unified write() method via AppLogCreate.from_model().
        """
        from .schemas import AppLogCreate
        schema = AppLogCreate.from_model(app_log)
        # Override id from model
        log_data = schema.to_db_dict()
        log_data["id"] = str(app_log.id)
        log_data["created_at"] = format_timestamp()
        
        if not self._should_write_to_db(app_log.level):
            return
        self._enqueue_batch(log_data, "app")

    def enqueue_log(
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
        user_id: Optional[UUID] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        request_method: Optional[str] = None,
        request_path: Optional[str] = None,
        request_data: Optional[dict[str, Any]] = None,
        response_status: Optional[int] = None,
        duration_ms: Optional[int] = None,
        extra_data: Optional[dict[str, Any]] = None,
    ) -> None:
        """Enqueue a log entry for batch writing to database (backward compatible)."""
        from .schemas import AppLogCreate
        
        # Merge request_data into extra_data
        merged_extra = dict(extra_data) if extra_data else {}
        if request_data:
            merged_extra["request_data"] = request_data
        
        schema = AppLogCreate(
            source=source,
            level=level,
            message=message,
            layer=layer or module,
            module=module,
            function=function,
            line_number=line_number,
            trace_id=trace_id,
            request_id=request_id,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            request_method=request_method,
            request_path=request_path,
            response_status=response_status,
            duration_ms=duration_ms,
            extra_data=merged_extra if merged_extra else None,
        )
        self.write(schema, "app")
    
    def enqueue_error_log(self, error_log: "ErrorLog") -> None:
        """Enqueue an error log entry using ErrorLog model object."""
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
            trace_id=error_log.trace_id,
            user_id=error_log.user_id,
            ip_address=error_log.ip_address,
            user_agent=error_log.user_agent,
            request_method=error_log.request_method,
            request_path=error_log.request_path,
            error_details=error_log.error_details,
            context_data=error_log.context_data,
        )
        # Override id from model
        log_data = schema.to_db_dict()
        log_data["id"] = str(error_log.id)
        log_data["created_at"] = format_timestamp()
        self._write_immediate(log_data, "error")

    def enqueue_audit_log(self, audit_log: "AuditLog") -> None:
        """Enqueue an audit log entry using AuditLog model object."""
        from .schemas import AuditLogCreate
        
        # New model stores audit fields in extra_data
        extra_data = audit_log.extra_data or {}
        
        schema = AuditLogCreate(
            action=extra_data.get("action", "UNKNOWN"),
            source=audit_log.source or "backend",
            level=audit_log.level or "INFO",
            layer=audit_log.layer or "Auth",
            module=audit_log.module or "",
            function=audit_log.function or "",
            line_number=audit_log.line_number or 0,
            file_path=getattr(audit_log, 'file_path', '') or '',
            trace_id=audit_log.trace_id or '',
            request_id=getattr(audit_log, 'request_id', '') or '',
            user_id=audit_log.user_id,
            result=extra_data.get("result", "SUCCESS"),
            resource_type=extra_data.get("resource_type"),
            resource_id=UUID(extra_data["resource_id"]) if extra_data.get("resource_id") else None,
            ip_address=extra_data.get("ip_address"),
            user_agent=extra_data.get("user_agent"),
            request_method=extra_data.get("request_method"),
            request_path=extra_data.get("request_path"),
        )
        # Override id from model
        log_data = schema.to_db_dict()
        log_data["id"] = str(audit_log.id)
        log_data["created_at"] = format_timestamp()
        self._write_immediate(log_data, "audit")

    def enqueue_performance_log(self, performance_log: "PerformanceLog") -> None:
        """Enqueue a performance log entry using PerformanceLog model object."""
        from .schemas import PerformanceLogCreate
        
        schema = PerformanceLogCreate(
            source=performance_log.source,
            metric_name=performance_log.metric_name,
            metric_value=performance_log.metric_value,
            metric_unit=performance_log.metric_unit,
            layer=performance_log.layer,
            module=performance_log.module,
            component_name=performance_log.component_name,
            trace_id=performance_log.trace_id,
            request_id=performance_log.request_id,
            user_id=performance_log.user_id,
            threshold_ms=performance_log.threshold,
            is_slow=performance_log.performance_issue == "SLOW" if performance_log.performance_issue else False,
            web_vitals=performance_log.web_vitals,
            extra_data=performance_log.extra_data,
        )
        # Override id from model
        log_data = schema.to_db_dict()
        log_data["id"] = str(performance_log.id)
        log_data["created_at"] = format_timestamp()
        self._enqueue_batch(log_data, "performance")

    def enqueue_performance_log_params(
        self,
        metric_name: str,
        metric_value: float,
        metric_unit: str = "ms",
        source: Optional[str] = None,
        component_name: Optional[str] = None,
        trace_id: Optional[str] = None,
        request_id: Optional[str] = None,
        user_id: Optional[UUID] = None,
        threshold: Optional[float] = None,
        performance_issue: Optional[str] = None,
        web_vitals: Optional[dict[str, Any]] = None,
        extra_data: Optional[dict[str, Any]] = None,
    ) -> None:
        """Enqueue a performance log entry for batch writing (backward compatible)."""
        from .schemas import PerformanceLogCreate
        
        is_slow = performance_issue == "SLOW" if performance_issue else (threshold and metric_value > threshold)
        
        schema = PerformanceLogCreate(
            source=source or "backend",
            level="WARNING" if is_slow else "INFO",
            metric_name=metric_name,
            metric_value=metric_value,
            metric_unit=metric_unit,
            component_name=component_name,
            trace_id=trace_id,
            request_id=request_id,
            user_id=user_id,
            threshold_ms=threshold,
            is_slow=bool(is_slow),
            web_vitals=web_vitals,
            extra_data=extra_data,
        )
        self.write(schema, "performance")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get writer statistics."""
        return {
            **self._stats,
            "queue_size": self.log_queue.qsize(),
            "performance_queue_size": self.performance_queue.qsize(),
            "enabled": self._enabled,
            "min_log_level": self.min_log_level,
            "min_system_log_level": self.min_system_log_level,
            "batch_size": self.batch_size,
            "batch_interval": self.batch_interval,
        }
    
    async def close(self, timeout: float = 10.0) -> None:
        """Close writer gracefully, ensuring all queued logs are written.
        
        Args:
            timeout: Maximum time to wait for queue to empty (seconds)
        """
        if not self._initialized or self._shutdown_event.is_set():
            return
        
        # Signal shutdown
        self._shutdown_event.set()
        
        # Wait for worker task to finish
        if self._worker_task and not self._worker_task.done():
            try:
                await asyncio.wait_for(self._worker_task, timeout=timeout)
            except asyncio.TimeoutError:
                logging.warning(
                    f"DatabaseLogWriter worker task did not finish within {timeout}s timeout"
                )
        
        # Wait for performance worker task to finish
        if self._performance_worker_task and not self._performance_worker_task.done():
            try:
                await asyncio.wait_for(self._performance_worker_task, timeout=timeout)
            except asyncio.TimeoutError:
                logging.warning(
                    f"DatabaseLogWriter performance worker task did not finish within {timeout}s timeout"
                )
        
        # Flush remaining entries
        remaining = []
        while not self.log_queue.empty():
            try:
                remaining.append(self.log_queue.get_nowait())
            except asyncio.QueueEmpty:
                break
        
        if remaining:
            await self._flush_batch(remaining)
        
        # Flush remaining performance entries
        remaining_performance = []
        while not self.performance_queue.empty():
            try:
                remaining_performance.append(self.performance_queue.get_nowait())
            except asyncio.QueueEmpty:
                break
        
        if remaining_performance:
            await self._flush_performance_batch(remaining_performance)
    
    def write_error_log(
        self,
        source: str,
        error_type: str,
        error_message: str,
        error_code: Optional[str] = None,
        status_code: Optional[int] = None,
        stack_trace: Optional[str] = None,
        layer: Optional[str] = None,
        module: Optional[str] = None,
        function: Optional[str] = None,
        line_number: Optional[int] = None,
        file_path: Optional[str] = None,
        trace_id: Optional[str] = None,
        user_id: Optional[UUID] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        request_method: Optional[str] = None,
        request_path: Optional[str] = None,
        request_data: Optional[dict[str, Any]] = None,
        error_details: Optional[dict[str, Any]] = None,
        context_data: Optional[dict[str, Any]] = None,
    ) -> None:
        """Write an error log entry to error_logs table (async, non-blocking).
        
        Uses ErrorLogCreate schema for consistent data conversion.
        
        Args:
            source: Source of the error (backend/frontend)
            error_type: Exception class name
            error_message: Exception message
            error_code: Application error code
            status_code: HTTP status code
            stack_trace: Full stack trace
            layer: AOP layer
            module: Module name
            function: Function name
            line_number: Line number
            file_path: Full file path
            trace_id: Request trace ID
            user_id: User ID
            ip_address: IP address
            user_agent: User agent string
            request_method: HTTP method
            request_path: Request path
            request_data: Request payload (sanitized)
            error_details: Additional error details
            context_data: Additional context data
        """
        if not self._enabled:
            return
        
        try:
            from .schemas import ErrorLogCreate
            
            # Use schema for data conversion
            error_create = ErrorLogCreate(
                source=source,
                error_type=error_type,
                error_message=error_message,
                error_code=error_code,
                status_code=status_code,
                stack_trace=stack_trace,
                layer=layer,
                module=module,
                function=function,
                line_number=line_number,
                file_path=file_path,
                trace_id=trace_id,
                user_id=user_id,
                ip_address=ip_address,
                user_agent=user_agent,
                request_method=request_method,
                request_path=request_path,
                request_data=request_data,
                error_details=error_details,
                context_data=context_data,
            )
            
            # Get db dict and add created_at
            error_data = error_create.to_db_dict()
            error_data["created_at"] = format_timestamp()
            
            # Insert using Supabase API (async)
            async def _insert_error_log():
                try:
                    client = _get_raw_supabase_client()
                    return client.table("error_logs").insert(error_data).execute()
                except Exception:
                    # Don't log here to avoid infinite recursion
                    pass
            
            # Run in background task (fire-and-forget)
            asyncio.create_task(_insert_error_log())
            
        except Exception:
            # Don't fail if database write fails (graceful degradation)
            pass
    
    def write_system_log(
        self,
        level: str,
        message: str,
        logger_name: Optional[str] = None,
        module: Optional[str] = None,
        function: Optional[str] = None,
        line_number: Optional[int] = None,
        file_path: Optional[str] = None,
        extra_data: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Write a system log entry to system_logs table (async, non-blocking).
        
        Uses SystemLogCreate schema for consistent data conversion.
        
        Args:
            level: Log level (DEBUG/INFO/WARNING/ERROR/CRITICAL)
            message: Log message
            logger_name: Logger name (e.g., uvicorn, sqlalchemy)
            module: Module name
            function: Function name
            line_number: Line number
            file_path: Full file path
            extra_data: Additional system data (server, host, port, workers)
        """
        if not self._enabled:
            return
        
        # Check if system log level should be written to database
        if not self._should_write_system_log_to_db(level):
            return
        
        try:
            from .schemas import SystemLogCreate
            
            # Use schema for data conversion
            system_create = SystemLogCreate(
                level=level,
                message=message,
                logger_name=logger_name,
                module=module,
                function=function,
                line_number=line_number,
                file_path=file_path,
                extra_data=extra_data,
            )
            
            # Get db dict and add created_at
            system_log_data = system_create.to_db_dict()
            system_log_data["created_at"] = format_timestamp()
            
            # Insert using Supabase API (sync, in thread pool if needed)
            async def _insert_system_log():
                try:
                    client = _get_raw_supabase_client()
                    return client.table("system_logs").insert(system_log_data).execute()
                except Exception:
                    # Don't log here to avoid infinite recursion
                    pass
            
            # Try to run in background task if event loop is running
            try:
                loop = asyncio.get_running_loop()
                asyncio.create_task(_insert_system_log())
            except RuntimeError:
                # No event loop running - run synchronously
                try:
                    client = _get_raw_supabase_client()
                    client.table("system_logs").insert(system_log_data).execute()
                except Exception:
                    pass
            
        except Exception:
            # Don't fail if database write fails (graceful degradation)
            pass
    
    async def write_audit_log(
        self,
        action: str,
        user_id: Optional[UUID] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[UUID] = None,
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
    ) -> Optional[dict[str, Any]]:
        """Write an audit log entry to audit_logs table (async, non-blocking).
        
        Args:
            action: Action type (e.g., 'login', 'create', 'update', 'delete', 'approve')
            user_id: User ID who performed the action
            resource_type: Type of resource (e.g., 'member', 'performance', 'project')
            resource_id: ID of the affected resource
            ip_address: IP address of the user
            user_agent: User agent string
            trace_id: Request trace ID for correlation
            request_id: Request ID for correlation
            request_method: HTTP method (GET, POST, etc.)
            request_path: Request path
            module: Module path relative to project root
            function: Function name
            line_number: Line number
            file_path: Full file path
            result: Action result (SUCCESS/FAILED)
            
        Returns:
            Created audit log data as dict, or None if failed
        """
        if not self._enabled:
            return None
        
        try:
            from .schemas import AuditLogCreate
            
            # Use schema for data conversion - 必填字段使用空字符串/0
            audit_log = AuditLogCreate(
                action=action,
                source="backend",
                level="INFO",
                layer="Auth",
                module=module or '',
                function=function or '',
                line_number=line_number or 0,
                file_path=file_path or '',
                trace_id=trace_id or '',
                request_id=request_id or '',
                user_id=user_id,
                resource_type=resource_type,
                resource_id=resource_id,
                result=result,
                ip_address=ip_address,
                user_agent=user_agent,
                request_method=request_method,
                request_path=request_path,
            )
            
            # Insert using raw Supabase API (async) - avoid circular logging
            result_data = await _async_insert("audit_logs", audit_log.to_db_dict())
            return result_data
                
        except Exception as e:
            # Log the specific error for debugging, but don't fail (graceful degradation)
            import logging
            logging.warning(f"Failed to write audit log to database: {str(e)}", exc_info=False)
            return None

    # =========================================================================
    # Schema-based enqueue methods - 直接使用 schema 入队
    # =========================================================================

    def enqueue_app_log_from_schema(self, schema: "AppLogCreate") -> None:
        """Enqueue an application log entry directly from schema."""
        if not self._should_write_to_db(schema.level):
            return
        self._ensure_worker_started()
        
        log_entry = schema.to_db_dict()
        log_entry["created_at"] = format_timestamp()
        
        try:
            self.log_queue.put_nowait(log_entry)
            self._stats["total_enqueued"] += 1
        except asyncio.QueueFull:
            logging.warning("Log database queue is full, dropping log entry")
            self._stats["total_failed"] += 1

    def enqueue_error_log_from_schema(self, schema: "ErrorLogCreate") -> None:
        """Enqueue an error log entry directly from schema."""
        if not self._enabled:
            return
        
        error_data = schema.to_db_dict()
        error_data["created_at"] = format_timestamp()
        
        async def _insert_error_log():
            try:
                client = _get_raw_supabase_client()
                return client.table("error_logs").insert(error_data).execute()
            except Exception:
                pass
        
        asyncio.create_task(_insert_error_log())

    def enqueue_audit_log_from_schema(self, schema: "AuditLogCreate") -> None:
        """Enqueue an audit log entry directly from schema."""
        if not self._enabled:
            return
        
        audit_data = schema.to_db_dict()
        audit_data["created_at"] = format_timestamp()
        
        async def _insert_audit_log():
            try:
                client = _get_raw_supabase_client()
                return client.table("audit_logs").insert(audit_data).execute()
            except Exception:
                pass
        
        asyncio.create_task(_insert_audit_log())

    def enqueue_performance_log_from_schema(self, schema: "PerformanceLogCreate") -> None:
        """Enqueue a performance log entry directly from schema."""
        if not self._enabled:
            return
        self._ensure_worker_started()
        
        perf_entry = schema.to_db_dict()
        perf_entry["created_at"] = format_timestamp()
        
        try:
            self.performance_queue.put_nowait(perf_entry)
            self._stats["performance_total_enqueued"] += 1
        except asyncio.QueueFull:
            logging.warning("Performance log database queue is full, dropping performance log entry")
            self._stats["performance_total_failed"] += 1


# Singleton instance
db_log_writer = DatabaseLogWriter()

