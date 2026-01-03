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
- Log level filtering (configurable)
- Failure handling with graceful degradation
- Uses database models to ensure data structure consistency
"""
import asyncio
import logging
from datetime import datetime
from typing import Dict, Any, Optional, Union, TYPE_CHECKING
from uuid import UUID, uuid4
from collections import deque

from ..config import settings
# Import database models for consistent data structure
from ..db.models import AppLog, ErrorLog, SystemLog, AuditLog, PerformanceLog

if TYPE_CHECKING:
    from .schemas import AppLogCreate, ErrorLogCreate, AuditLogCreate, PerformanceLogCreate


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
        return None
    except Exception:
        return None


from ...utils.formatters import now_utc


def format_timestamp() -> str:
    """Format timestamp in ISO format with timezone for database storage.
    
    Uses UTC time with timezone info to ensure consistent storage in PostgreSQL.
    The database column is TIMESTAMP WITH TIME ZONE, so we need proper timezone info.
    """
    return now_utc().isoformat()


class DatabaseLogWriter:
    """Asynchronous batch database log writer using Supabase API.
    
    Uses a queue-based approach where log entries are enqueued and written
    in batches to reduce database overhead and avoid blocking requests.
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
        
        # Configuration
        self.batch_size = getattr(settings, "LOG_DB_BATCH_SIZE", 50)  # Batch size
        self.batch_interval = getattr(settings, "LOG_DB_BATCH_INTERVAL", 5.0)  # Seconds
        self.min_log_level = getattr(settings, "LOG_DB_APP_MIN_LEVEL", "INFO")  # App logs: INFO and above by default
        self.min_system_log_level = getattr(settings, "LOG_DB_SYSTEM_MIN_LEVEL", "INFO")  # System logs: INFO and above (consistent with file)
        
        # Log level priority (higher = more important)
        self.log_levels = {
            "DEBUG": 0,
            "INFO": 1,
            "WARNING": 2,
            "ERROR": 3,
            "CRITICAL": 4,
        }
        
        # Queue for log entries
        self.log_queue: asyncio.Queue[Dict[str, Any]] = asyncio.Queue(maxsize=10000)
        
        # Queue for performance log entries - Requirements 10.5
        self.performance_queue: asyncio.Queue[Dict[str, Any]] = asyncio.Queue(maxsize=10000)
        
        # Control flags
        self._shutdown_event = asyncio.Event()
        self._worker_task: Optional[asyncio.Task] = None
        self._performance_worker_task: Optional[asyncio.Task] = None
        self._enabled = getattr(settings, "LOG_DB_ENABLED", True)  # Can be disabled via config
        
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
        if not self._enabled:
            return
        
        # Check if we're in an async context and worker is not running
        try:
            loop = asyncio.get_running_loop()
            if self._worker_task is None or self._worker_task.done():
                self._worker_task = asyncio.create_task(self._worker_loop())
            if self._performance_worker_task is None or self._performance_worker_task.done():
                self._performance_worker_task = asyncio.create_task(self._performance_worker_loop())
        except RuntimeError:
            # No event loop running - worker will be started on first async call
            pass
    
    async def _worker_loop(self) -> None:
        """Background worker task that processes log entries in batches."""
        batch: list[Dict[str, Any]] = []
        last_flush_time = datetime.now()
        
        while not self._shutdown_event.is_set():
            try:
                # Try to get log entry with timeout
                try:
                    timeout = max(0.1, self.batch_interval - (datetime.now() - last_flush_time).total_seconds())
                    log_entry = await asyncio.wait_for(self.log_queue.get(), timeout=timeout)
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
                    await self._flush_batch(batch)
                    batch.clear()
                    last_flush_time = datetime.now()
                    
            except Exception as e:
                # Log error but continue processing
                logging.error(f"Error in DatabaseLogWriter worker loop: {e}", exc_info=True)
                await asyncio.sleep(1)  # Wait before retrying
        
        # Flush remaining entries on shutdown
        if batch:
            await self._flush_batch(batch)
    
    def _create_app_log_data(
        self,
        source: str,
        level: str,
        message: str,
        layer: Optional[str] = None,
        module: Optional[str] = None,
        function: Optional[str] = None,
        line_number: Optional[int] = None,
        file_path: Optional[str] = None,
        trace_id: Optional[str] = None,
        request_id: Optional[str] = None,
        user_id: Optional[Union[str, UUID]] = None,
        duration_ms: Optional[int] = None,
        extra_data: Optional[Dict[str, Any]] = None,
        log_id: Optional[UUID] = None,
        # Legacy fields - will be merged into extra_data
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        request_method: Optional[str] = None,
        request_path: Optional[str] = None,
        response_status: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Create app log data dictionary using new AppLog model structure.
        
        按日志规范：
        - 通用字段：source, level, message, layer, module, function, line_number
        - 追踪字段：trace_id, request_id, user_id, duration_ms
        - 扩展字段：extra_data (包含 ip_address, user_agent, request_method, request_path, response_status)
        """
        # Build extra_data from legacy fields
        merged_extra = dict(extra_data) if extra_data else {}
        if ip_address:
            merged_extra["ip_address"] = ip_address
        if user_agent:
            merged_extra["user_agent"] = user_agent[:200] if len(user_agent) > 200 else user_agent
        if request_method:
            merged_extra["request_method"] = request_method
        if request_path:
            merged_extra["request_path"] = request_path
        if response_status:
            merged_extra["response_status"] = response_status
        
        # Create data dictionary matching new AppLog model fields
        log_data = {
            "id": str(log_id or uuid4()),
            "source": source,
            "level": level.upper(),
            "message": message,
            "created_at": format_timestamp(),
        }
        
        # Add optional fields (only if not None)
        optional_fields = {
            "layer": layer,
            "module": module,
            "function": function,
            "line_number": line_number,
            "file_path": file_path,
            "trace_id": trace_id,
            "request_id": request_id,
            "user_id": str(user_id) if user_id else None,
            "duration_ms": duration_ms,
            "extra_data": merged_extra if merged_extra else None,
        }
        
        # Only add non-None values
        for key, value in optional_fields.items():
            if value is not None:
                log_data[key] = value
        
        return log_data
    
    def _create_error_log_data(
        self,
        source: str,
        error_type: str,
        error_message: str,
        level: str = "ERROR",
        layer: Optional[str] = None,
        module: Optional[str] = None,
        function: Optional[str] = None,
        line_number: Optional[int] = None,
        trace_id: Optional[str] = None,
        request_id: Optional[str] = None,
        user_id: Optional[Union[str, UUID]] = None,
        log_id: Optional[UUID] = None,
        # Legacy fields - will be merged into extra_data
        error_code: Optional[str] = None,
        status_code: Optional[int] = None,
        stack_trace: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        request_method: Optional[str] = None,
        request_path: Optional[str] = None,
        error_details: Optional[Dict[str, Any]] = None,
        context_data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Create error log data dictionary using new ErrorLog model structure.
        
        按日志规范：
        - 通用字段：source, level, message, layer, module, function, line_number
        - 追踪字段：trace_id, request_id, user_id
        - 扩展字段：extra_data (包含 error_type, error_message, stack_trace, error_code, status_code, ip_address, request_method, request_path)
        """
        # Build extra_data from error and legacy fields
        extra: Dict[str, Any] = {
            "error_type": error_type,
            "error_message": error_message,
        }
        if stack_trace:
            extra["stack_trace"] = stack_trace
        if error_code:
            extra["error_code"] = error_code
        if status_code:
            extra["status_code"] = status_code
        if ip_address:
            extra["ip_address"] = ip_address
        if user_agent:
            extra["user_agent"] = user_agent[:200] if len(user_agent) > 200 else user_agent
        if request_method:
            extra["request_method"] = request_method
        if request_path:
            extra["request_path"] = request_path
        if error_details:
            extra.update(error_details)
        if context_data:
            extra.update(context_data)
        
        # Generate message per spec: "{error_type}: {error_message}"
        message = f"{error_type}: {error_message}"
        
        # Create data dictionary matching new ErrorLog model fields
        error_data = {
            "id": str(log_id or uuid4()),
            "source": source,
            "level": level,
            "message": message,
            "created_at": format_timestamp(),
            "extra_data": extra,
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
        }
        
        # Only add non-None values
        for key, value in optional_fields.items():
            if value is not None:
                error_data[key] = value
        
        return error_data
    
    def _create_performance_log_data(
        self,
        source: str,
        metric_name: str,
        metric_value: float,
        metric_unit: str = "ms",
        level: str = "INFO",
        layer: Optional[str] = None,
        module: Optional[str] = None,
        function: Optional[str] = None,
        line_number: Optional[int] = None,
        trace_id: Optional[str] = None,
        request_id: Optional[str] = None,
        user_id: Optional[Union[str, UUID]] = None,
        duration_ms: Optional[int] = None,
        log_id: Optional[UUID] = None,
        # Legacy fields - will be merged into extra_data
        component_name: Optional[str] = None,
        threshold: Optional[float] = None,
        performance_issue: Optional[str] = None,
        web_vitals: Optional[Dict[str, Any]] = None,
        extra_data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Create performance log data dictionary using new PerformanceLog model structure.
        
        按日志规范：
        - 通用字段：source, level, message, layer, module, function, line_number
        - 追踪字段：trace_id, request_id, user_id, duration_ms
        - 扩展字段：extra_data (包含 metric_name, metric_value, metric_unit, threshold_ms, is_slow, component_name, web_vitals)
        """
        # Determine if slow
        is_slow = performance_issue == "SLOW" if performance_issue else (threshold and metric_value > threshold)
        
        # Build extra_data from performance fields
        merged_extra: Dict[str, Any] = {
            "metric_name": metric_name,
            "metric_value": metric_value,
            "metric_unit": metric_unit,
            "is_slow": bool(is_slow),
        }
        if component_name:
            merged_extra["component_name"] = component_name
        if threshold is not None:
            merged_extra["threshold_ms"] = threshold
        if web_vitals:
            merged_extra["web_vitals"] = web_vitals
        if extra_data:
            merged_extra.update(extra_data)
        
        # Generate message per spec
        target = component_name or metric_name
        duration = duration_ms if duration_ms is not None else metric_value
        if is_slow and threshold:
            message = f"Slow {metric_name}: {target} ({duration:.0f}ms > {threshold:.0f}ms)"
        else:
            message = f"Perf: {metric_name} = {metric_value}{metric_unit}"
        
        # Create data dictionary matching new PerformanceLog model fields
        perf_data = {
            "id": str(log_id or uuid4()),
            "source": source,
            "level": level,
            "message": message,
            "created_at": format_timestamp(),
            "extra_data": merged_extra,
        }
        
        # Add optional fields (only if not None)
        optional_fields = {
            "layer": layer or "Performance",
            "module": module,
            "function": function,
            "line_number": line_number,
            "trace_id": trace_id,
            "request_id": request_id,
            "user_id": str(user_id) if user_id else None,
            "duration_ms": duration_ms,
        }
        
        # Only add non-None values
        for key, value in optional_fields.items():
            if value is not None:
                perf_data[key] = value
        
        return perf_data

    async def _performance_worker_loop(self) -> None:
        """Background worker task that processes performance log entries in batches - Requirements 10.5."""
        batch: list[Dict[str, Any]] = []
        last_flush_time = datetime.now()
        
        while not self._shutdown_event.is_set():
            try:
                # Try to get performance log entry with timeout
                try:
                    timeout = max(0.1, self.batch_interval - (datetime.now() - last_flush_time).total_seconds())
                    log_entry = await asyncio.wait_for(self.performance_queue.get(), timeout=timeout)
                    batch.append(log_entry)
                except asyncio.TimeoutError:
                    # Timeout - flush batch if not empty
                    pass
                
                # Check if we should flush the batch (50 entries or 5 seconds)
                should_flush = (
                    len(batch) >= self.batch_size or
                    (batch and (datetime.now() - last_flush_time).total_seconds() >= self.batch_interval)
                )
                
                if should_flush and batch:
                    await self._flush_performance_batch(batch)
                    batch.clear()
                    last_flush_time = datetime.now()
                    
            except Exception as e:
                # Log error but continue processing
                logging.error(f"Error in DatabaseLogWriter performance worker loop: {e}", exc_info=True)
                await asyncio.sleep(1)  # Wait before retrying
        
        # Flush remaining entries on shutdown
        if batch:
            await self._flush_performance_batch(batch)
    
    async def _flush_batch(self, batch: list[Dict[str, Any]]) -> None:
        """Flush a batch of log entries to Supabase."""
        if not batch:
            return
        
        try:
            client = _get_raw_supabase_client()
            
            # Prepare data for batch insert using model structure
            log_data = []
            for entry in batch:
                # Use model-based data creation for consistency
                log_entry = self._create_app_log_data(
                    source=entry.get("source", "backend"),
                    level=entry.get("level", "INFO"),
                    message=entry.get("message", ""),
                    layer=entry.get("layer"),
                    module=entry.get("module"),
                    function=entry.get("function"),
                    line_number=entry.get("line_number"),
                    file_path=entry.get("file_path"),
                    trace_id=entry.get("trace_id"),
                    request_id=entry.get("request_id"),
                    user_id=entry.get("user_id"),
                    duration_ms=entry.get("duration_ms"),
                    extra_data=entry.get("extra_data"),
                    log_id=UUID(entry["id"]) if entry.get("id") else None,
                    # Legacy fields -> merged into extra_data
                    ip_address=entry.get("ip_address"),
                    user_agent=entry.get("user_agent"),
                    request_method=entry.get("request_method"),
                    request_path=entry.get("request_path"),
                    response_status=entry.get("response_status"),
                )
                log_data.append(log_entry)
            
            # Batch insert using Supabase API
            # Note: UnifiedSupabaseClient's execute() is synchronous, not async
            result = client.table("app_logs").insert(log_data).execute()
            
            if result.data:
                self._stats["total_written"] += len(result.data)
                self._stats["last_write_time"] = datetime.now()
            else:
                self._stats["total_failed"] += len(batch)
                logging.warning(f"Failed to write {len(batch)} log entries to database: no data returned")
                
        except Exception as e:
            self._stats["total_failed"] += len(batch)
            logging.error(f"Failed to write {len(batch)} log entries to database: {e}", exc_info=True)
            # Don't raise - graceful degradation
    
    async def _flush_performance_batch(self, batch: list[Dict[str, Any]]) -> None:
        """Flush a batch of performance log entries to Supabase - Requirements 10.5."""
        if not batch:
            return
        
        try:
            client = _get_raw_supabase_client()
            
            # Prepare data for batch insert using model structure
            performance_data = []
            for entry in batch:
                # Use model-based data creation for consistency
                perf_entry = self._create_performance_log_data(
                    source=entry.get("source", "backend"),
                    metric_name=entry.get("metric_name", "unknown"),
                    metric_value=entry.get("metric_value", 0.0),
                    metric_unit=entry.get("metric_unit", "ms"),
                    level=entry.get("level", "INFO"),
                    layer=entry.get("layer"),
                    module=entry.get("module"),
                    function=entry.get("function"),
                    line_number=entry.get("line_number"),
                    trace_id=entry.get("trace_id"),
                    request_id=entry.get("request_id"),
                    user_id=entry.get("user_id"),
                    duration_ms=entry.get("duration_ms"),
                    log_id=UUID(entry["id"]) if entry.get("id") else None,
                    # Legacy fields -> merged into extra_data
                    component_name=entry.get("component_name"),
                    threshold=entry.get("threshold"),
                    performance_issue=entry.get("performance_issue"),
                    web_vitals=entry.get("web_vitals"),
                    extra_data=entry.get("extra_data"),
                )
                performance_data.append(perf_entry)
            
            # Batch insert using Supabase API
            result = client.table("performance_logs").insert(performance_data).execute()
            
            if result.data:
                self._stats["performance_total_written"] += len(result.data)
                self._stats["performance_last_write_time"] = datetime.now()
            else:
                self._stats["performance_total_failed"] += len(batch)
                logging.warning(f"Failed to write {len(batch)} performance log entries to database: no data returned")
                
        except Exception as e:
            self._stats["performance_total_failed"] += len(batch)
            logging.error(f"Failed to write {len(batch)} performance log entries to database: {e}", exc_info=True)
            # Don't raise - graceful degradation
    
    def _should_write_to_db(self, level: str) -> bool:
        """Check if app log level should be written to database."""
        if not self._enabled:
            return False
        
        log_priority = self.log_levels.get(level.upper(), 0)
        min_priority = self.log_levels.get(self.min_log_level.upper(), 0)
        return log_priority >= min_priority
    
    def _should_write_system_log_to_db(self, level: str) -> bool:
        """Check if system log level should be written to database."""
        if not self._enabled:
            return False
        
        log_priority = self.log_levels.get(level.upper(), 0)
        min_priority = self.log_levels.get(self.min_system_log_level.upper(), 0)
        return log_priority >= min_priority
    
    def enqueue_app_log(self, app_log: "AppLog") -> None:
        """
        Enqueue an application log entry using AppLog model object.
        
        Uses AppLogCreate schema for consistent data conversion.
        
        Args:
            app_log: AppLog model instance
        """
        # Check if this log level should be written to database
        if not self._should_write_to_db(app_log.level):
            return
        
        # Ensure worker is started (lazy initialization)
        self._ensure_worker_started()
        
        from .schemas import AppLogCreate
        
        # Use schema for data conversion
        app_create = AppLogCreate(
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
            request_data=app_log.request_data,
            response_status=app_log.response_status,
            duration_ms=app_log.duration_ms,
            extra_data=app_log.extra_data,
        )
        
        # Get db dict and add id/created_at
        log_entry = app_create.to_db_dict()
        log_entry["id"] = str(app_log.id)
        log_entry["created_at"] = format_timestamp()
        
        # Enqueue (non-blocking)
        try:
            self.log_queue.put_nowait(log_entry)
            self._stats["total_enqueued"] += 1
        except asyncio.QueueFull:
            # Queue is full - log warning but don't block
            logging.warning("Log database queue is full, dropping log entry")
            self._stats["total_failed"] += 1

    def enqueue_log(
        self,
        source: str,
        level: str,
        message: str,
        layer: Optional[str] = None,  # Service, Router, Auth, Store, Component, Hook, Performance, Middleware, Database, Audit
        module: Optional[str] = None,  # Deprecated: use layer instead, kept for backward compatibility
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
        """Enqueue a log entry for batch writing to database.
        
        This method is non-blocking and returns immediately.
        The log will be written to database in a batch later.
        
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
        # Check if this log level should be written to database
        if not self._should_write_to_db(level):
            return
        
        # Ensure worker is started (lazy initialization)
        self._ensure_worker_started()
        
        # Use layer if provided, otherwise fall back to module for backward compatibility
        effective_layer = layer or module
        
        # Prepare log entry
        log_entry = {
            "id": str(uuid4()),
            "source": source,
            "level": level.upper(),
            "message": message,
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
            "extra_data": extra_data,
            "created_at": format_timestamp(),
        }
        
        # Remove None values
        log_entry = {k: v for k, v in log_entry.items() if v is not None}
        
        # Enqueue (non-blocking)
        try:
            self.log_queue.put_nowait(log_entry)
            self._stats["total_enqueued"] += 1
        except asyncio.QueueFull:
            # Queue is full - log warning but don't block
            logging.warning("Log database queue is full, dropping log entry")
            self._stats["total_failed"] += 1
    
    def enqueue_error_log(self, error_log: "ErrorLog") -> None:
        """
        Enqueue an error log entry using ErrorLog model object.
        
        Uses ErrorLogCreate schema for consistent data conversion.
        
        Args:
            error_log: ErrorLog model instance
        """
        if not self._enabled:
            return
        
        try:
            from .schemas import ErrorLogCreate
            
            # Use schema for data conversion
            error_create = ErrorLogCreate(
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
                request_data=error_log.request_data,
                error_details=error_log.error_details,
                context_data=error_log.context_data,
            )
            
            # Get db dict and add id/created_at
            error_data = error_create.to_db_dict()
            error_data["id"] = str(error_log.id)
            error_data["created_at"] = format_timestamp()
            
            # Insert using Supabase API (async, fire-and-forget)
            async def _insert_error_log():
                try:
                    client = _get_raw_supabase_client()
                    return client.table("error_logs").insert(error_data).execute()
                except Exception:
                    pass
            
            asyncio.create_task(_insert_error_log())
            
        except Exception:
            pass

    def enqueue_audit_log(self, audit_log: "AuditLog") -> None:
        """
        Enqueue an audit log entry using AuditLog model object.
        
        Uses AuditLogCreate schema for consistent data conversion.
        Note: New AuditLog model stores action/result/ip_address etc in extra_data.
        
        Args:
            audit_log: AuditLog model instance
        """
        if not self._enabled:
            return
        
        try:
            # New model stores audit fields in extra_data
            extra_data = audit_log.extra_data or {}
            
            from .schemas import AuditLogCreate
            
            # Use schema for data conversion
            audit_create = AuditLogCreate(
                action=extra_data.get("action", "UNKNOWN"),
                source=audit_log.source or "backend",
                level=audit_log.level or "INFO",
                layer=audit_log.layer or "Auth",
                module=audit_log.module or "",
                function=audit_log.function or "",
                line_number=audit_log.line_number or 0,
                user_id=audit_log.user_id,
                trace_id=audit_log.trace_id,
                result=extra_data.get("result", "SUCCESS"),
                resource_type=extra_data.get("resource_type"),
                resource_id=UUID(extra_data["resource_id"]) if extra_data.get("resource_id") else None,
                ip_address=extra_data.get("ip_address"),
                user_agent=extra_data.get("user_agent"),
                request_method=extra_data.get("request_method"),
                request_path=extra_data.get("request_path"),
            )
            
            # Get db dict and add id
            audit_data = audit_create.to_db_dict()
            audit_data["id"] = str(audit_log.id)
            
            # Insert using Supabase API (async, fire-and-forget)
            async def _insert_audit_log():
                try:
                    client = _get_raw_supabase_client()
                    return client.table("audit_logs").insert(audit_data).execute()
                except Exception:
                    pass
            
            asyncio.create_task(_insert_audit_log())
            
        except Exception:
            pass

    def enqueue_performance_log(self, performance_log: "PerformanceLog") -> None:
        """
        Enqueue a performance log entry using PerformanceLog model object.
        
        Uses PerformanceLogCreate schema for consistent data conversion.
        
        Args:
            performance_log: PerformanceLog model instance
        """
        if not self._enabled:
            return
        
        # Ensure worker is started (lazy initialization)
        self._ensure_worker_started()
        
        from .schemas import PerformanceLogCreate
        
        # Use schema for data conversion
        perf_create = PerformanceLogCreate(
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
            threshold=performance_log.threshold,
            performance_issue=performance_log.performance_issue,
            web_vitals=performance_log.web_vitals,
            extra_data=performance_log.extra_data,
        )
        
        # Get db dict and add id/created_at
        perf_entry = perf_create.to_db_dict()
        perf_entry["id"] = str(performance_log.id)
        perf_entry["created_at"] = format_timestamp()
        
        # Enqueue (non-blocking)
        try:
            self.performance_queue.put_nowait(perf_entry)
            self._stats["performance_total_enqueued"] += 1
        except asyncio.QueueFull:
            logging.warning("Performance log database queue is full, dropping performance log entry")
            self._stats["performance_total_failed"] += 1

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
        """Enqueue a performance log entry for batch writing to database - Requirements 10.5.
        
        This method is non-blocking and returns immediately.
        The performance log will be written to database in a batch later (50 entries or 5 seconds).
        
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
        if not self._enabled:
            return
        
        # Ensure worker is started (lazy initialization)
        self._ensure_worker_started()
        
        # Prepare performance log entry
        perf_entry = {
            "id": str(uuid4()),
            "source": source or "backend",
            "metric_name": metric_name,
            "metric_value": metric_value,
            "metric_unit": metric_unit,
            "component_name": component_name,
            "trace_id": trace_id,
            "request_id": request_id,
            "user_id": str(user_id) if user_id else None,
            "threshold": threshold,
            "performance_issue": performance_issue,
            "web_vitals": web_vitals,
            "extra_data": extra_data,
            "created_at": format_timestamp(),
        }
        
        # Remove None values
        perf_entry = {k: v for k, v in perf_entry.items() if v is not None}
        
        # Enqueue (non-blocking)
        try:
            self.performance_queue.put_nowait(perf_entry)
            self._stats["performance_total_enqueued"] += 1
        except asyncio.QueueFull:
            # Queue is full - log warning but don't block
            logging.warning("Performance log database queue is full, dropping performance log entry")
            self._stats["performance_total_failed"] += 1
    
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
                extra_data=extra_data,
            )
            
            # Get db dict and add created_at
            system_log_data = system_create.to_db_dict()
            system_log_data["created_at"] = format_timestamp()
            
            # Insert using Supabase API (async)
            async def _insert_system_log():
                try:
                    client = _get_raw_supabase_client()
                    return client.table("system_logs").insert(system_log_data).execute()
                except Exception:
                    # Don't log here to avoid infinite recursion
                    pass
            
            # Run in background task (fire-and-forget)
            asyncio.create_task(_insert_system_log())
            
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
            result: Action result (SUCCESS/FAILED)
            
        Returns:
            Created audit log data as dict, or None if failed
        """
        if not self._enabled:
            return None
        
        try:
            from .schemas import AuditLogCreate
            import inspect
            
            # Auto-detect caller info if not provided
            if not module or not function:
                frame = inspect.currentframe()
                if frame:
                    # Go up the call stack to find the actual caller (skip write_audit_log and create_audit_log_via_api)
                    caller_frame = frame.f_back
                    if caller_frame:
                        caller_frame = caller_frame.f_back  # Skip one more level
                    if caller_frame:
                        if not module:
                            # Get module path from filename
                            filename = caller_frame.f_code.co_filename.replace("\\", "/")
                            if "/backend/src/" in filename:
                                module = filename.split("/backend/src/")[-1].replace("/", ".").replace(".py", "")
                            elif "/src/" in filename:
                                module = filename.split("/src/")[-1].replace("/", ".").replace(".py", "")
                            else:
                                module = caller_frame.f_code.co_filename
                        if not function:
                            function = caller_frame.f_code.co_name
                        if not line_number:
                            line_number = caller_frame.f_lineno
            
            # Use schema for data conversion
            audit_log = AuditLogCreate(
                action=action,
                source="backend",
                level="INFO",
                layer="Auth",
                module=module or "",
                function=function or "",
                line_number=line_number or 0,
                user_id=user_id,
                resource_type=resource_type,
                resource_id=resource_id,
                result=result,
                ip_address=ip_address,
                user_agent=user_agent,
                trace_id=trace_id,
                request_id=request_id,
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

