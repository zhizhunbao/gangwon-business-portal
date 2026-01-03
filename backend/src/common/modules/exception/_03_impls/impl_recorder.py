"""Exception recorder implementation.

Concrete implementation of exception recording.
"""
from datetime import datetime
from typing import Optional, Dict, Any, Union
from uuid import uuid4

from .._02_abstracts import AbstractExceptionRecorder, AbstractCustomException
from .._01_contracts import DExceptionContext, DExceptionRecord
from ...logger import logging_service
from ...logger.schemas import ErrorLogCreate


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
    
    normalized = file_path.replace("\\", "/")
    
    patterns = [
        "/backend/src/",
        "/src/backend/src/",
        "backend/src/",
    ]
    
    for pattern in patterns:
        if pattern in normalized:
            idx = normalized.find(pattern)
            relative_path = normalized[idx + len(pattern):]
            if relative_path.endswith(".py"):
                relative_path = relative_path[:-3]
            return relative_path.replace("/", ".")
    
    if "/src/" in normalized:
        idx = normalized.rfind("/src/")
        relative_path = normalized[idx + 5:]
        if relative_path.endswith(".py"):
            relative_path = relative_path[:-3]
        return relative_path.replace("/", ".")
    
    filename = normalized.split("/")[-1]
    if filename.endswith(".py"):
        filename = filename[:-3]
    return filename


class ExceptionRecorder(AbstractExceptionRecorder):
    """Service for recording exceptions to various storage systems.
    
    Inherits common logic from AbstractExceptionRecorder:
    - _get_exception_type()
    - _determine_level()
    - _get_stack_trace()
    - _get_location_info()
    - _build_context()
    """
    
    async def record_direct(
        self,
        exception: Union[Exception, AbstractCustomException],
        context: Optional[DExceptionContext] = None,
        source: str = "backend",
        error_code: Optional[str] = None,
        status_code: Optional[int] = None,
        stack_trace: Optional[str] = None,
        exception_details: Optional[Dict[str, Any]] = None
    ) -> DExceptionRecord:
        """Record an exception directly with provided parameters."""
        ctx = context or DExceptionContext()
        
        # Use inherited methods from AbstractExceptionRecorder
        if not stack_trace:
            stack_trace = self._get_stack_trace(exception)
        
        file_path, line_number, function_name = self._get_location_info(exception)
        
        # Override with context if provided
        if ctx.file_path:
            file_path = ctx.file_path
        if ctx.line_number:
            line_number = ctx.line_number
        if ctx.function_name:
            function_name = ctx.function_name
        
        level = self._determine_level(exception)
        
        context_data = self._build_context(exception, ctx)
        if exception_details:
            context_data.update(exception_details)
        
        record = DExceptionRecord(
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
        
        await self._log_exception(record)
        
        return record

    async def record(
        self,
        exception: Union[Exception, AbstractCustomException],
        context: Optional[DExceptionContext] = None,
        source: str = "backend"
    ) -> DExceptionRecord:
        """Record an exception with full context information."""
        ctx = context or DExceptionContext()
        
        # Use inherited methods from AbstractExceptionRecorder
        stack_trace = self._get_stack_trace(exception)
        file_path, line_number, function_name = self._get_location_info(exception)
        
        # Override with context if provided
        if ctx.file_path:
            file_path = ctx.file_path
        if ctx.line_number:
            line_number = ctx.line_number
        if ctx.function_name:
            function_name = ctx.function_name
        
        level = self._determine_level(exception)
        
        record = DExceptionRecord(
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
        
        await self._log_exception(record)
        
        return record
    
    async def _log_exception(self, record: DExceptionRecord) -> None:
        """Log the exception using the unified logging service.
        
        This is the only method specific to this implementation,
        as it depends on the concrete logging_service.
        """
        try:
            request_method = record.context.get('request_method')
            request_path = record.context.get('request_path')
            ip_address = record.context.get('ip_address')
            
            module_path = file_path_to_module(record.file)
            
            await logging_service.error(ErrorLogCreate(
                source=record.source,
                level=record.level,
                error_type=record.exception_type,
                error_message=record.message,
                status_code=record.http_status,
                stack_trace=record.stack_trace,
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
                context_data={
                    k: v for k, v in record.context.items() 
                    if k not in ('request_method', 'request_path', 'ip_address')
                }
            ))
            
        except Exception as e:
            import logging
            logging.error(f"Failed to log exception: {e}", exc_info=True)


# Global recorder instance
exception_recorder = ExceptionRecorder()
