"""
Exception recorder for logging and storing exception information.

This module is responsible solely for recording exceptions to various
storage systems (logs, database, files).
"""
import traceback
import inspect
import re
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Union
from uuid import UUID, uuid4
from dataclasses import dataclass, asdict

from ..logger import logging_service
from ..logger.schemas import ErrorLogCreate
from .exceptions import BaseCustomException


def file_path_to_module(file_path: Optional[str]) -> str:
    """
    Normalize file path to a consistent module path format.
    
    Handles different environments:
    - Local Windows: C:\\Users\\...\\backend\\src\\common\\modules\\...
    - Local Unix: /home/.../backend/src/common/modules/...
    - Render: /opt/render/project/src/backend/src/common/modules/...
    
    Returns a clean module path like: common.modules.exception.recorder
    """
    if not file_path:
        return "unknown"
    
    # Normalize path separators
    normalized = file_path.replace("\\", "/")
    
    # Find the src/ directory and extract relative path
    # Handle various patterns:
    # - backend/src/common/...
    # - src/backend/src/common/...
    # - /opt/render/project/src/backend/src/common/...
    
    patterns = [
        "/backend/src/",  # Standard backend path
        "/src/backend/src/",  # Render deployment path
        "backend/src/",  # Relative path
    ]
    
    for pattern in patterns:
        if pattern in normalized:
            # Extract everything after the pattern
            idx = normalized.find(pattern)
            relative_path = normalized[idx + len(pattern):]
            # Remove .py extension and convert to module path
            if relative_path.endswith(".py"):
                relative_path = relative_path[:-3]
            return relative_path.replace("/", ".")
    
    # Fallback: try to extract from any src/ directory
    if "/src/" in normalized:
        idx = normalized.rfind("/src/")
        relative_path = normalized[idx + 5:]  # Skip "/src/"
        if relative_path.endswith(".py"):
            relative_path = relative_path[:-3]
        return relative_path.replace("/", ".")
    
    # Last resort: return the filename without extension
    filename = normalized.split("/")[-1]
    if filename.endswith(".py"):
        filename = filename[:-3]
    return filename


@dataclass
class ExceptionRecord:
    """Data model for exception records."""
    id: UUID
    source: str  # "frontend" | "backend"
    level: str  # "ERROR" | "CRITICAL"
    layer: str  # "Exception"
    message: str
    file: Optional[str]
    line_number: Optional[int]
    function: Optional[str]
    trace_id: Optional[UUID]
    request_id: Optional[str]
    user_id: Optional[UUID]
    created_at: datetime
    exception_type: str
    stack_trace: Optional[str]
    context: Dict[str, Any]
    http_status: Optional[int]
    resolved: bool = False
    resolution_notes: Optional[str] = None


@dataclass
class ExceptionContext:
    """Context information for exceptions."""
    trace_id: Optional[UUID] = None
    request_id: Optional[str] = None
    user_id: Optional[UUID] = None
    file_path: Optional[str] = None
    line_number: Optional[int] = None
    function_name: Optional[str] = None
    additional_data: Optional[Dict[str, Any]] = None


class ExceptionRecorder:
    """Service for recording exceptions to various storage systems."""
    
    async def record_direct(
        self,
        exception: Union[Exception, BaseCustomException],
        context: Optional[ExceptionContext] = None,
        source: str = "backend",
        error_code: Optional[str] = None,
        status_code: Optional[int] = None,
        stack_trace: Optional[str] = None,
        exception_details: Optional[Dict[str, Any]] = None
    ) -> ExceptionRecord:
        """
        Record an exception directly with provided parameters.
        
        This method is used when exception details are already extracted
        and we want to record them directly without additional processing.
        
        Args:
            exception: The exception to record
            context: Additional context information
            source: Source of the exception ("frontend" or "backend")
            error_code: Optional error code
            status_code: HTTP status code if applicable
            stack_trace: Pre-formatted stack trace
            exception_details: Additional exception details
        
        Returns:
            ExceptionRecord: The recorded exception data
        """
        # Extract context information
        ctx = context or ExceptionContext()
        
        # Use provided stack trace or extract it
        if not stack_trace:
            stack_trace = self._get_stack_trace(exception)
        
        # Get location information
        file_path, line_number, function_name = self._get_location_info(exception)
        
        # Override with context if provided
        if ctx.file_path:
            file_path = ctx.file_path
        if ctx.line_number:
            line_number = ctx.line_number
        if ctx.function_name:
            function_name = ctx.function_name
        
        # Determine severity level
        level = self._determine_level(exception)
        
        # Build context with additional details
        context_data = self._build_context(exception, ctx)
        if exception_details:
            context_data.update(exception_details)
        
        # Create exception record
        record = ExceptionRecord(
            id=uuid4(),
            source=source,
            level=level,
            layer="Exception",
            message=str(exception),
            file=file_path,
            line_number=line_number,
            function=function_name,
            trace_id=ctx.trace_id,
            request_id=ctx.request_id,
            user_id=ctx.user_id,
            created_at=datetime.now(),
            exception_type=self._get_exception_type(exception),
            stack_trace=stack_trace,
            context=context_data,
            http_status=status_code or getattr(exception, 'http_status_code', None),
            resolved=False,
            resolution_notes=None
        )
        
        # Record to logging systems
        await self._log_exception(record)
        
        return record

    async def record(
        self,
        exception: Union[Exception, BaseCustomException],
        context: Optional[ExceptionContext] = None,
        source: str = "backend"
    ) -> ExceptionRecord:
        """
        Record an exception with full context information.
        
        Args:
            exception: The exception to record
            context: Additional context information
            source: Source of the exception ("frontend" or "backend")
        
        Returns:
            ExceptionRecord: The recorded exception data
        """
        # Extract context information
        ctx = context or ExceptionContext()
        
        # Get stack trace and location information
        stack_trace = self._get_stack_trace(exception)
        file_path, line_number, function_name = self._get_location_info(exception)
        
        # Override with context if provided
        if ctx.file_path:
            file_path = ctx.file_path
        if ctx.line_number:
            line_number = ctx.line_number
        if ctx.function_name:
            function_name = ctx.function_name
        
        # Determine severity level
        level = self._determine_level(exception)
        
        # Create exception record
        record = ExceptionRecord(
            id=uuid4(),
            source=source,
            level=level,
            layer="Exception",
            message=str(exception),
            file=file_path,
            line_number=line_number,
            function=function_name,
            trace_id=ctx.trace_id,
            request_id=ctx.request_id,
            user_id=ctx.user_id,
            created_at=datetime.now(),
            exception_type=self._get_exception_type(exception),
            stack_trace=stack_trace,
            context=self._build_context(exception, ctx),
            http_status=getattr(exception, 'http_status_code', None),
            resolved=False,
            resolution_notes=None
        )
        
        # Record to logging systems
        await self._log_exception(record)
        
        return record
    
    def _get_exception_type(self, exception: Exception) -> str:
        """Get the exception type string."""
        if isinstance(exception, BaseCustomException):
            return exception.exception_type.value
        return type(exception).__name__
    
    def _determine_level(self, exception: Exception) -> str:
        """Determine the severity level of an exception."""
        if isinstance(exception, BaseCustomException):
            # 根据 HTTP 状态码判断级别
            status_code = getattr(exception, 'http_status_code', 500)
            
            # 4xx 是业务异常，不是真正的错误
            if 400 <= status_code < 500:
                if status_code in (401, 403):
                    return "INFO"  # 认证/授权失败
                elif status_code == 404:
                    return "INFO"  # 资源不存在
                else:
                    return "WARNING"  # 其他客户端错误 (400, 422 等)
            
            # Critical exceptions that require immediate attention
            critical_types = {"DatabaseError", "ExternalServiceError", "InternalError"}
            if exception.exception_type.value in critical_types:
                return "CRITICAL"
        
        return "ERROR"
    
    def _get_stack_trace(self, exception: Exception) -> str:
        """Get formatted stack trace for the exception."""
        if hasattr(exception, '__traceback__') and exception.__traceback__:
            return ''.join(traceback.format_exception(
                type(exception), exception, exception.__traceback__
            ))
        else:
            # If no traceback is available, create a minimal stack trace
            current_exc = traceback.format_exc()
            if current_exc and current_exc.strip() != "NoneType: None":
                return current_exc
            else:
                # Fallback: create a basic exception representation
                return f"{type(exception).__name__}: {str(exception)}\n"
    
    def _get_location_info(self, exception: Exception) -> tuple[Optional[str], Optional[int], Optional[str]]:
        """Extract file, line, and function information from exception."""
        try:
            if hasattr(exception, '__traceback__') and exception.__traceback__:
                tb = exception.__traceback__
                while tb.tb_next:
                    tb = tb.tb_next
                
                frame = tb.tb_frame
                return frame.f_code.co_filename, tb.tb_lineno, frame.f_code.co_name
            else:
                # Fallback to current frame
                frame = inspect.currentframe()
                if frame and frame.f_back:
                    frame = frame.f_back
                    return frame.f_code.co_filename, frame.f_lineno, frame.f_code.co_name
        except Exception:
            pass
        
        return None, None, None
    
    def _build_context(self, exception: Exception, ctx: ExceptionContext) -> Dict[str, Any]:
        """Build context dictionary for the exception."""
        context = {}
        
        # Add exception-specific context
        if isinstance(exception, BaseCustomException):
            context.update(exception.context)
        
        # Add additional context data
        if ctx.additional_data:
            context.update(ctx.additional_data)
        
        # Add original exception info if available
        if hasattr(exception, 'original_exception') and exception.original_exception:
            context['original_exception'] = {
                'type': type(exception.original_exception).__name__,
                'message': str(exception.original_exception)
            }
        
        return context
    
    async def _log_exception(self, record: ExceptionRecord) -> None:
        """Log the exception using the unified logging service."""
        try:
            # Extract request info from context for proper logging
            request_method = record.context.get('request_method')
            request_path = record.context.get('request_path')
            ip_address = record.context.get('ip_address')
            
            # Convert file path to module path format
            module_path = file_path_to_module(record.file)
            
            # INFO/WARNING 级别的业务异常记录到 app.log，不污染 error.log
            if record.level in ("INFO", "WARNING"):
                from ..logger.schemas import AppLogCreate
                await logging_service.app(AppLogCreate(
                    source=record.source,
                    level=record.level,
                    message=f"[{record.exception_type}] {record.message}",
                    layer=record.layer,
                    module=module_path,
                    function=record.function,
                    line_number=record.line_number,
                    file_path=record.file,
                    trace_id=str(record.trace_id) if record.trace_id else None,
                    request_id=record.request_id,
                    user_id=record.user_id,
                    request_method=request_method,
                    request_path=request_path,
                    ip_address=ip_address,
                    response_status=record.http_status,
                    extra_data={
                        "exception_type": record.exception_type,
                        "context": {k: v for k, v in record.context.items() 
                                   if k not in ('request_method', 'request_path', 'ip_address')},
                    }
                ))
            else:
                # ERROR/CRITICAL 级别记录到 error.log
                await logging_service.error(ErrorLogCreate(
                    source=record.source,
                    error_type=record.exception_type,
                    error_message=record.message,
                    status_code=record.http_status,
                    stack_trace=record.stack_trace,
                    layer=record.layer,
                    module=module_path,
                    function=record.function,
                    line_number=record.line_number,
                    trace_id=str(record.trace_id) if record.trace_id else None,
                    request_id=record.request_id,
                    user_id=record.user_id,
                    request_method=request_method,
                    request_path=request_path,
                    ip_address=ip_address,
                    error_details={
                        "level": record.level,
                    },
                    context_data={k: v for k, v in record.context.items() 
                                 if k not in ('request_method', 'request_path', 'ip_address')}
                ))
            
        except Exception as e:
            # Fallback logging - don't let logging failures break exception handling
            import logging
            logging.error(f"Failed to log exception: {e}", exc_info=True)


# Global recorder instance
exception_recorder = ExceptionRecorder()