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
from typing import Dict, Any, Optional, Union
from uuid import UUID, uuid4
from collections import deque

from ..config import settings
# Import database models for consistent data structure
from ..db.models import AppLog, ErrorLog, SystemLog, AuditLog, PerformanceLog


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


from .utils import format_timestamp


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
        self.min_system_log_level = getattr(settings, "LOG_DB_SYSTEM_MIN_LEVEL", "WARNING")  # System logs: WARNING and above by default
        
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
        log_id: Optional[UUID] = None,
    ) -> Dict[str, Any]:
        """
        Create app log data dictionary using AppLog model structure.
        
        This ensures database inserts match exactly with the AppLog model definition.
        """
        # Create data dictionary matching AppLog model fields
        log_data = {
            "id": str(log_id or uuid4()),
            "source": source,
            "level": level.upper(),
            "message": message,
            "created_at": format_timestamp(),
        }
        
        # Add optional fields (only if not None, matching model nullable fields)
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
        
        # Only add non-None values (Supabase will use defaults for None values)
        for key, value in optional_fields.items():
            if value is not None:
                log_data[key] = value
        
        return log_data
    
    def _create_error_log_data(
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
        user_id: Optional[Union[str, UUID]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        request_method: Optional[str] = None,
        request_path: Optional[str] = None,
        request_data: Optional[Dict[str, Any]] = None,
        error_details: Optional[Dict[str, Any]] = None,
        context_data: Optional[Dict[str, Any]] = None,
        log_id: Optional[UUID] = None,
    ) -> Dict[str, Any]:
        """
        Create error log data dictionary using ErrorLog model structure.
        
        This ensures database inserts match exactly with the ErrorLog model definition.
        """
        # Create data dictionary matching ErrorLog model fields
        error_data = {
            "id": str(log_id or uuid4()),
            "source": source,
            "error_type": error_type,
            "error_message": error_message,
            "created_at": format_timestamp(),
        }
        
        # Add optional fields (only if not None, matching model nullable fields)
        optional_fields = {
            "error_code": error_code,
            "status_code": status_code,
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
                error_data[key] = value
        
        return error_data
    
    def _create_performance_log_data(
        self,
        source: str,
        metric_name: str,
        metric_value: float,
        metric_unit: str = "ms",
        layer: Optional[str] = None,
        module: Optional[str] = None,
        component_name: Optional[str] = None,
        trace_id: Optional[str] = None,
        request_id: Optional[str] = None,
        user_id: Optional[Union[str, UUID]] = None,
        threshold: Optional[float] = None,
        performance_issue: Optional[str] = None,
        web_vitals: Optional[Dict[str, Any]] = None,
        extra_data: Optional[Dict[str, Any]] = None,
        log_id: Optional[UUID] = None,
    ) -> Dict[str, Any]:
        """
        Create performance log data dictionary using PerformanceLog model structure.
        
        This ensures database inserts match exactly with the PerformanceLog model definition.
        """
        # Create data dictionary matching PerformanceLog model fields
        perf_data = {
            "id": str(log_id or uuid4()),
            "source": source,
            "metric_name": metric_name,
            "metric_value": metric_value,
            "metric_unit": metric_unit,
            "created_at": format_timestamp(),
        }
        
        # Add optional fields (only if not None, matching model nullable fields)
        optional_fields = {
            "layer": layer,
            "module": module,
            "component_name": component_name,
            "trace_id": trace_id,
            "request_id": request_id,
            "user_id": str(user_id) if user_id else None,
            "threshold": threshold,
            "performance_issue": performance_issue,
            "web_vitals": web_vitals,
            "extra_data": extra_data,
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
                    trace_id=entry.get("trace_id"),
                    request_id=entry.get("request_id"),
                    user_id=entry.get("user_id"),
                    ip_address=entry.get("ip_address"),
                    user_agent=entry.get("user_agent"),
                    request_method=entry.get("request_method"),
                    request_path=entry.get("request_path"),
                    request_data=entry.get("request_data"),
                    response_status=entry.get("response_status"),
                    duration_ms=entry.get("duration_ms"),
                    extra_data=entry.get("extra_data"),
                    log_id=UUID(entry["id"]) if entry.get("id") else None,
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
                    layer=entry.get("layer"),
                    module=entry.get("module"),
                    component_name=entry.get("component_name"),
                    trace_id=entry.get("trace_id"),
                    request_id=entry.get("request_id"),
                    user_id=entry.get("user_id"),
                    threshold=entry.get("threshold"),
                    performance_issue=entry.get("performance_issue"),
                    web_vitals=entry.get("web_vitals"),
                    extra_data=entry.get("extra_data"),
                    log_id=UUID(entry["id"]) if entry.get("id") else None,
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
        
        Args:
            app_log: AppLog model instance
        """
        # Check if this log level should be written to database
        if not self._should_write_to_db(app_log.level):
            return
        
        # Ensure worker is started (lazy initialization)
        self._ensure_worker_started()
        
        # Convert model to dictionary for database insertion
        # Use the model's attributes directly
        log_entry = {
            "id": str(app_log.id),
            "source": app_log.source,
            "level": app_log.level,
            "message": app_log.message,
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
            "created_at": format_timestamp(),
        }
        
        # Remove None values (Supabase will use defaults)
        log_entry = {k: v for k, v in log_entry.items() if v is not None}
        
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
        
        Args:
            error_log: ErrorLog model instance
        """
        if not self._enabled:
            return
        
        try:
            # Convert model to dictionary for database insertion
            error_data = {
                "id": str(error_log.id),
                "source": error_log.source,
                "error_type": error_log.error_type,
                "error_message": error_log.error_message,
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
                "created_at": format_timestamp(),
            }
            
            # Remove None values
            error_data = {k: v for k, v in error_data.items() if v is not None}
            
            # Insert using Supabase API (async, fire-and-forget)
            async def _insert_error_log():
                try:
                    client = _get_logged_supabase_client()
                    return await client.table("error_logs").insert(error_data).execute()
                except Exception:
                    pass
            
            asyncio.create_task(_insert_error_log())
            
        except Exception:
            pass

    def enqueue_audit_log(self, audit_log: "AuditLog") -> None:
        """
        Enqueue an audit log entry using AuditLog model object.
        
        Args:
            audit_log: AuditLog model instance
        """
        if not self._enabled:
            return
        
        try:
            # Convert model to dictionary for database insertion
            audit_data = {
                "id": str(audit_log.id),
                "action": audit_log.action,
                "user_id": str(audit_log.user_id) if audit_log.user_id else None,
                "resource_type": audit_log.resource_type,
                "resource_id": str(audit_log.resource_id) if audit_log.resource_id else None,
                "ip_address": audit_log.ip_address,
                "user_agent": audit_log.user_agent,
            }
            
            # Remove None values
            audit_data = {k: v for k, v in audit_data.items() if v is not None}
            
            # Insert using Supabase API (async, fire-and-forget)
            async def _insert_audit_log():
                try:
                    client = _get_logged_supabase_client()
                    return await client.table("audit_logs").insert(audit_data).execute()
                except Exception:
                    pass
            
            asyncio.create_task(_insert_audit_log())
            
        except Exception:
            pass

    def enqueue_performance_log(self, performance_log: "PerformanceLog") -> None:
        """
        Enqueue a performance log entry using PerformanceLog model object.
        
        Args:
            performance_log: PerformanceLog model instance
        """
        if not self._enabled:
            return
        
        # Ensure worker is started (lazy initialization)
        self._ensure_worker_started()
        
        # Convert model to dictionary for database insertion
        perf_entry = {
            "id": str(performance_log.id),
            "source": performance_log.source,
            "metric_name": performance_log.metric_name,
            "metric_value": performance_log.metric_value,
            "metric_unit": performance_log.metric_unit,
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
            "created_at": format_timestamp(),
        }
        
        # Remove None values
        perf_entry = {k: v for k, v in perf_entry.items() if v is not None}
        
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
            # Use model-based data creation for consistency
            error_data = self._create_error_log_data(
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
            
            # Insert using Supabase API (async)
            async def _insert_error_log():
                try:
                    client = _get_logged_supabase_client()
                    return await client.table("error_logs").insert(error_data).execute()
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
        process_id: Optional[int] = None,
        thread_name: Optional[str] = None,
        extra_data: Optional[dict[str, Any]] = None,
    ) -> None:
        """Write a system log entry to system_logs table (async, non-blocking).
        
        Args:
            level: Log level (DEBUG/INFO/WARNING/ERROR/CRITICAL)
            message: Log message
            logger_name: Logger name (e.g., uvicorn, sqlalchemy)
            module: Module name
            function: Function name
            line_number: Line number
            process_id: Process ID
            thread_name: Thread name
            extra_data: Additional context data
        """
        if not self._enabled:
            return
        
        # Check if system log level should be written to database
        if not self._should_write_system_log_to_db(level):
            return
        
        try:
            system_log_data = {
                "id": str(uuid4()),
                "level": level.upper(),
                "message": message,
                "logger_name": logger_name,
                "module": module,
                "function": function,
                "line_number": line_number,
                "process_id": process_id,
                "thread_name": thread_name,
                "extra_data": extra_data,
            }
            
            # Remove None values
            system_log_data = {k: v for k, v in system_log_data.items() if v is not None}
            
            # Insert using Supabase API (async)
            async def _insert_system_log():
                try:
                    client = _get_logged_supabase_client()
                    return await client.table("system_logs").insert(system_log_data).execute()
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
        extra_data: Optional[dict[str, Any]] = None,
    ) -> Optional[dict[str, Any]]:
        """Write an audit log entry to audit_logs table (async, non-blocking).
        
        Args:
            action: Action type (e.g., 'login', 'create', 'update', 'delete', 'approve')
            user_id: User ID who performed the action
            resource_type: Type of resource (e.g., 'member', 'performance', 'project')
            resource_id: ID of the affected resource
            ip_address: IP address of the user
            user_agent: User agent string
            extra_data: Additional context data
            
        Returns:
            Created audit log data as dict, or None if failed
        """
        if not self._enabled:
            return None
        
        try:
            audit_data = {
                "id": str(uuid4()),
                "user_id": str(user_id) if user_id else None,
                "action": action,
                "resource_type": resource_type,
                "resource_id": str(resource_id) if resource_id else None,
                "ip_address": ip_address,
                "user_agent": user_agent,
            }
            
            if extra_data:
                audit_data.update(extra_data)
            
            # Remove None values
            audit_data = {k: v for k, v in audit_data.items() if v is not None}
            
            # Insert using raw Supabase API (async) - avoid circular logging
            result = await _async_insert("audit_logs", audit_data)
            return result
                
        except Exception as e:
            # Log the specific error for debugging, but don't fail (graceful degradation)
            import logging
            logging.warning(f"Failed to write audit log to database: {str(e)}", exc_info=False)
            return None


# Singleton instance
db_log_writer = DatabaseLogWriter()

