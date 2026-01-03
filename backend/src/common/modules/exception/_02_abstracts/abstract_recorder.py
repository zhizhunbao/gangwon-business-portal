"""Abstract exception recorder.

Provides common recording logic that can be reused by concrete implementations.
"""
from abc import abstractmethod
from typing import Dict, Any, Optional, Union
import traceback
import inspect

from .._01_contracts.i_exception import IException
from .._01_contracts.i_exception_recorder import IExceptionRecorder
from .._01_contracts.d_exception_record import DExceptionRecord
from .._01_contracts.d_exception_context import DExceptionContext


class AbstractExceptionRecorder(IExceptionRecorder):
    """Abstract base class for exception recorders.
    
    Provides common recording logic that can be reused by concrete implementations.
    """
    
    # Severity level mapping
    LEVEL_CRITICAL = "CRITICAL"
    LEVEL_ERROR = "ERROR"
    LEVEL_WARNING = "WARNING"
    LEVEL_INFO = "INFO"
    
    # Critical exception types that require immediate attention
    CRITICAL_TYPES = {"DatabaseError", "ExternalServiceError", "InternalError"}
    
    @abstractmethod
    async def record(
        self,
        exception: Union[Exception, IException],
        context: Optional[DExceptionContext] = None,
        source: str = "backend"
    ) -> DExceptionRecord:
        """Record an exception with full context information."""
        pass
    
    @abstractmethod
    async def record_direct(
        self,
        exception: Union[Exception, IException],
        context: Optional[DExceptionContext] = None,
        source: str = "backend",
        error_code: Optional[str] = None,
        status_code: Optional[int] = None,
        stack_trace: Optional[str] = None,
        exception_details: Optional[Dict[str, Any]] = None
    ) -> DExceptionRecord:
        """Record an exception directly with provided parameters."""
        pass
    
    def _get_exception_type(self, exception: Exception) -> str:
        """Get the exception type string.
        
        Args:
            exception: The exception to get type from
            
        Returns:
            Exception type name as string
        """
        if hasattr(exception, 'exception_type'):
            exc_type = exception.exception_type
            return exc_type.value if hasattr(exc_type, 'value') else str(exc_type)
        return type(exception).__name__
    
    def _determine_level(self, exception: Exception) -> str:
        """Determine the severity level of an exception.
        
        Args:
            exception: The exception to determine level for
            
        Returns:
            Severity level string (CRITICAL, ERROR, WARNING, INFO)
        """
        # Check for custom exception with http_status_code
        if hasattr(exception, 'http_status_code'):
            status_code = exception.http_status_code
            
            # Check for critical types first
            if hasattr(exception, 'exception_type'):
                exc_type = exception.exception_type
                type_value = exc_type.value if hasattr(exc_type, 'value') else str(exc_type)
                if type_value in self.CRITICAL_TYPES:
                    return self.LEVEL_CRITICAL
            
            # 5xx is server error
            if status_code >= 500:
                return self.LEVEL_ERROR
            
            # 4xx client errors also recorded as ERROR
            if 400 <= status_code < 500:
                return self.LEVEL_ERROR
        
        return self.LEVEL_ERROR
    
    def _get_stack_trace(self, exception: Exception) -> str:
        """Get formatted stack trace for the exception.
        
        Args:
            exception: The exception to get stack trace from
            
        Returns:
            Formatted stack trace string
        """
        if hasattr(exception, '__traceback__') and exception.__traceback__:
            return ''.join(traceback.format_exception(
                type(exception), exception, exception.__traceback__
            ))
        else:
            current_exc = traceback.format_exc()
            if current_exc and current_exc.strip() != "NoneType: None":
                return current_exc
            return f"{type(exception).__name__}: {str(exception)}\n"
    
    def _get_location_info(self, exception: Exception) -> tuple:
        """Extract file, line, and function information from exception.
        
        Args:
            exception: The exception to extract location from
            
        Returns:
            Tuple of (file_path, line_number, function_name)
        """
        try:
            if hasattr(exception, '__traceback__') and exception.__traceback__:
                tb = exception.__traceback__
                while tb.tb_next:
                    tb = tb.tb_next
                
                frame = tb.tb_frame
                return frame.f_code.co_filename, tb.tb_lineno, frame.f_code.co_name
            else:
                frame = inspect.currentframe()
                if frame and frame.f_back:
                    frame = frame.f_back
                    return frame.f_code.co_filename, frame.f_lineno, frame.f_code.co_name
        except Exception:
            pass
        
        return None, None, None
    
    def _build_context(self, exception: Exception, ctx: DExceptionContext) -> Dict[str, Any]:
        """Build context dictionary for the exception.
        
        Args:
            exception: The exception
            ctx: Exception context
            
        Returns:
            Context dictionary
        """
        context = {}
        
        # Add exception-specific context
        if hasattr(exception, 'context') and exception.context:
            context.update(exception.context)
        
        # Add additional context data
        if ctx and ctx.additional_data:
            context.update(ctx.additional_data)
        
        # Add original exception info if available
        if hasattr(exception, 'original_exception') and exception.original_exception:
            context['original_exception'] = {
                'type': type(exception.original_exception).__name__,
                'message': str(exception.original_exception)
            }
        
        return context
