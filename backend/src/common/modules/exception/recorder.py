"""
Exception recorder for logging and storing exception information.

This module is responsible solely for recording exceptions to various
storage systems (logs, database, files).
"""
import traceback
import inspect
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Union
from uuid import UUID, uuid4
from dataclasses import dataclass, asdict

from ..logger import logging_service
from ..logger.schemas import ErrorLogCreate
from .exceptions import BaseCustomException


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
            # Use unified error logging API
            await logging_service.error(ErrorLogCreate(
                source=record.source,
                error_type=record.exception_type,
                error_message=record.message,
                status_code=record.http_status,
                stack_trace=record.stack_trace,
                layer=record.layer,
                function=record.function,
                line_number=record.line_number,
                trace_id=str(record.trace_id) if record.trace_id else None,
                user_id=record.user_id,
                error_details={
                    "file": record.file,
                    "level": record.level,
                },
                context_data=record.context
            ))
            
        except Exception as e:
            # Fallback logging - don't let logging failures break exception handling
            import logging
            logging.error(f"Failed to log exception: {e}", exc_info=True)


# Global recorder instance
exception_recorder = ExceptionRecorder()