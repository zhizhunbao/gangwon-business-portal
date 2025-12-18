"""Database log writer for application logs using Supabase API.

This module provides asynchronous batch writing of logs to Supabase database.
Uses a queue-based approach to batch insert logs, reducing database overhead.

Features:
- Asynchronous queue-based writing (non-blocking)
- Batch insertion (configurable batch size and interval)
- Log level filtering (only important logs go to database)
- Failure handling with graceful degradation
"""
import asyncio
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from uuid import UUID, uuid4
from collections import deque

from ..config import settings
from ..supabase.client import get_supabase_client


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
        self.min_log_level = getattr(settings, "LOG_DB_MIN_LEVEL", "WARNING")  # Only ERROR/WARNING by default
        
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
        
        # Control flags
        self._shutdown_event = asyncio.Event()
        self._worker_task: Optional[asyncio.Task] = None
        self._enabled = getattr(settings, "LOG_DB_ENABLED", True)  # Can be disabled via config
        
        # Statistics
        self._stats = {
            "total_enqueued": 0,
            "total_written": 0,
            "total_failed": 0,
            "last_write_time": None,
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
    
    async def _flush_batch(self, batch: list[Dict[str, Any]]) -> None:
        """Flush a batch of log entries to Supabase."""
        if not batch:
            return
        
        try:
            client = get_supabase_client()
            
            # Prepare data for batch insert
            log_data = []
            for entry in batch:
                # Ensure required fields
                log_entry = {
                    "id": str(entry.get("id", uuid4())),
                    "source": entry.get("source", "backend"),
                    "level": entry.get("level", "INFO"),
                    "message": entry.get("message", ""),
                    "module": entry.get("module"),
                    "function": entry.get("function"),
                    "line_number": entry.get("line_number"),
                    "trace_id": entry.get("trace_id"),
                    "user_id": str(entry["user_id"]) if entry.get("user_id") else None,
                    "ip_address": entry.get("ip_address"),
                    "user_agent": entry.get("user_agent"),
                    "request_method": entry.get("request_method"),
                    "request_path": entry.get("request_path"),
                    "request_data": entry.get("request_data"),
                    "response_status": entry.get("response_status"),
                    "duration_ms": entry.get("duration_ms"),
                    "extra_data": entry.get("extra_data"),
                    "created_at": entry.get("created_at", datetime.now().isoformat()),
                }
                
                # Remove None values (Supabase will use defaults)
                log_entry = {k: v for k, v in log_entry.items() if v is not None}
                log_data.append(log_entry)
            
            # Batch insert using Supabase API
            # Note: Supabase Python client's execute() is synchronous, so we run it in a thread
            # to avoid blocking the event loop
            def _insert_batch():
                return client.table("application_logs").insert(log_data).execute()
            
            result = await asyncio.to_thread(_insert_batch)
            
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
    
    def _should_write_to_db(self, level: str) -> bool:
        """Check if log level should be written to database."""
        if not self._enabled:
            return False
        
        log_priority = self.log_levels.get(level.upper(), 0)
        min_priority = self.log_levels.get(self.min_log_level.upper(), 0)
        return log_priority >= min_priority
    
    def enqueue_log(
        self,
        source: str,
        level: str,
        message: str,
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
        # Check if this log level should be written to database
        if not self._should_write_to_db(level):
            return
        
        # Ensure worker is started (lazy initialization)
        self._ensure_worker_started()
        
        # Prepare log entry
        log_entry = {
            "id": str(uuid4()),
            "source": source,
            "level": level.upper(),
            "message": message,
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
            "extra_data": extra_data,
            "created_at": datetime.now().isoformat(),
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
    
    def get_stats(self) -> Dict[str, Any]:
        """Get writer statistics."""
        return {
            **self._stats,
            "queue_size": self.log_queue.qsize(),
            "enabled": self._enabled,
            "min_log_level": self.min_log_level,
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
        
        # Flush remaining entries
        remaining = []
        while not self.log_queue.empty():
            try:
                remaining.append(self.log_queue.get_nowait())
            except asyncio.QueueEmpty:
                break
        
        if remaining:
            await self._flush_batch(remaining)


# Singleton instance
db_log_writer = DatabaseLogWriter()

