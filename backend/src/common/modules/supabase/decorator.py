"""
Supabase operation logging decorator.

Decorator for automatically logging Supabase database operations.
"""
from functools import wraps
from typing import Any, Callable, Optional
import time

from fastapi import Request

from ..logger.request import get_request_context, get_trace_id


def log_db_pool_operation(
    operation_name: str,
    log_level: str = "INFO",
):
    """
    Decorator for automatically logging database pool operations to db_pool.log.
    
    This decorator is completely independent from db.session module.
    It writes directly to db_pool.log using file_writer.
    
    Args:
        operation_name: Name of the operation (e.g., "connection_established", "client_initialized")
        log_level: Log level (DEBUG, INFO, WARNING, ERROR)
    
    Example:
        @log_db_pool_operation(operation_name="supabase_client_initialized")
        def initialize_client():
            ...
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            try:
                result = await func(*args, **kwargs)
                
                # Log success
                from ..logger.file_writer import file_log_writer
                file_log_writer.write_db_pool_log(
                    level=log_level,
                    message=f"{operation_name} succeeded",
                    extra_data={
                        "operation": operation_name,
                        "module": func.__module__,
                        "function": func.__name__,
                    },
                )
                
                return result
            except Exception as e:
                # Log error
                from ..logger.file_writer import file_log_writer
                file_log_writer.write_db_pool_log(
                    level="ERROR",
                    message=f"{operation_name} failed: {str(e)}",
                    extra_data={
                        "operation": operation_name,
                        "module": func.__module__,
                        "function": func.__name__,
                        "error": str(e),
                        "error_type": type(e).__name__,
                    },
                )
                raise
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            try:
                result = func(*args, **kwargs)
                
                # Log success
                from ..logger.file_writer import file_log_writer
                file_log_writer.write_db_pool_log(
                    level=log_level,
                    message=f"{operation_name} succeeded",
                    extra_data={
                        "operation": operation_name,
                        "module": func.__module__,
                        "function": func.__name__,
                    },
                )
                
                return result
            except Exception as e:
                # Log error
                from ..logger.file_writer import file_log_writer
                file_log_writer.write_db_pool_log(
                    level="ERROR",
                    message=f"{operation_name} failed: {str(e)}",
                    extra_data={
                        "operation": operation_name,
                        "module": func.__module__,
                        "function": func.__name__,
                        "error": str(e),
                        "error_type": type(e).__name__,
                    },
                )
                raise
        
        # Return appropriate wrapper based on whether function is async
        import inspect
        if inspect.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator

