"""
Global exception handlers for FastAPI application.

This module provides centralized exception handling for all types of exceptions
that can occur in the application, ensuring consistent error responses and
proper logging/monitoring.
"""
import traceback
from typing import Union, Dict, Any
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from pydantic import ValidationError as PydanticValidationError

from ..logger.request import get_trace_id, get_request_id
from .service import exception_service, ExceptionContext
from .exceptions import (
    BaseCustomException,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ConflictError,
    RateLimitError,
    DatabaseError,
    ExternalServiceError,
    InternalError,
)


async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Handle all unhandled exceptions in the application.
    
    This is the catch-all handler for any exception that isn't handled by
    more specific handlers.
    
    Args:
        request: The FastAPI request object
        exc: The unhandled exception
    
    Returns:
        JSONResponse: Standardized error response
    """
    # Extract context information
    context = ExceptionContext(
        trace_id=get_trace_id(request),
        request_id=get_request_id(request),
        user_id=getattr(request.state, 'user_id', None),
        additional_data={
            'url': str(request.url),
            'method': request.method,
            'headers': dict(request.headers),
        }
    )
    
    # Record the exception
    try:
        await exception_service.record_exception(exc, context, source="backend")
    except Exception as log_exc:
        # Don't let logging failures break error handling
        import logging
        logging.error(f"Failed to record exception: {log_exc}", exc_info=True)
    
    # Classify and handle the exception
    classified_exc = exception_service.classify_exception(exc)
    
    # Build error response
    error_response = {
        "error": classified_exc.to_dict(),
        "trace_id": str(context.trace_id) if context.trace_id else None,
        "request_id": context.request_id,
        "timestamp": context.additional_data.get('timestamp') if context.additional_data else None,
    }
    
    return JSONResponse(
        status_code=classified_exc.http_status_code,
        content=error_response
    )


async def custom_exception_handler(request: Request, exc: BaseCustomException) -> JSONResponse:
    """
    Handle custom application exceptions.
    
    Args:
        request: The FastAPI request object
        exc: The custom exception
    
    Returns:
        JSONResponse: Standardized error response
    """
    # Extract context information
    context = ExceptionContext(
        trace_id=get_trace_id(request),
        request_id=get_request_id(request),
        user_id=getattr(request.state, 'user_id', None),
        additional_data={
            'url': str(request.url),
            'method': request.method,
            'headers': dict(request.headers),
        }
    )
    
    # Record the exception
    try:
        await exception_service.record_exception(exc, context, source="backend")
    except Exception as log_exc:
        # Don't let logging failures break error handling
        import logging
        logging.error(f"Failed to record exception: {log_exc}", exc_info=True)
    
    # Build error response
    error_response = {
        "error": exc.to_dict(),
        "trace_id": str(context.trace_id) if context.trace_id else None,
        "request_id": context.request_id,
        "timestamp": context.additional_data.get('timestamp') if context.additional_data else None,
    }
    
    return JSONResponse(
        status_code=exc.http_status_code,
        content=error_response
    )


async def validation_exception_handler(request: Request, exc: Union[RequestValidationError, PydanticValidationError]) -> JSONResponse:
    """
    Handle validation exceptions from FastAPI/Pydantic.
    
    Args:
        request: The FastAPI request object
        exc: The validation exception
    
    Returns:
        JSONResponse: Structured validation error response
    """
    # Extract field errors
    field_errors = {}
    if hasattr(exc, 'errors'):
        for error in exc.errors():
            field_path = '.'.join(str(loc) for loc in error['loc'])
            field_errors[field_path] = error['msg']
    
    # Create custom validation error
    validation_error = ValidationError(
        message="Validation failed",
        field_errors=field_errors,
        original_exception=exc
    )
    
    # Extract context information
    context = ExceptionContext(
        trace_id=get_trace_id(request),
        request_id=get_request_id(request),
        user_id=getattr(request.state, 'user_id', None),
        additional_data={
            'url': str(request.url),
            'method': request.method,
            'validation_errors': field_errors,
        }
    )
    
    # Record the exception
    try:
        await exception_service.record_exception(validation_error, context, source="backend")
    except Exception as log_exc:
        # Don't let logging failures break error handling
        import logging
        logging.error(f"Failed to record exception: {log_exc}", exc_info=True)
    
    # Build error response
    error_response = {
        "error": validation_error.to_dict(),
        "trace_id": str(context.trace_id) if context.trace_id else None,
        "request_id": context.request_id,
        "timestamp": context.additional_data.get('timestamp') if context.additional_data else None,
    }
    
    return JSONResponse(
        status_code=400,
        content=error_response
    )


async def http_exception_handler(request: Request, exc: Union[HTTPException, StarletteHTTPException]) -> JSONResponse:
    """
    Handle HTTP exceptions (404, 401, etc.).
    
    Args:
        request: The FastAPI request object
        exc: The HTTP exception
    
    Returns:
        JSONResponse: Standardized HTTP error response
    """
    # Map HTTP status codes to custom exceptions
    status_code = exc.status_code
    detail = exc.detail if hasattr(exc, 'detail') else str(exc)
    
    if status_code == 401:
        custom_exc = AuthenticationError(detail)
    elif status_code == 403:
        custom_exc = AuthorizationError(detail)
    elif status_code == 404:
        custom_exc = NotFoundError(detail)
    elif status_code == 409:
        custom_exc = ConflictError(detail)
    elif status_code == 429:
        custom_exc = RateLimitError(detail)
    else:
        custom_exc = InternalError(detail)
    
    # Extract context information
    context = ExceptionContext(
        trace_id=get_trace_id(request),
        request_id=get_request_id(request),
        user_id=getattr(request.state, 'user_id', None),
        additional_data={
            'url': str(request.url),
            'method': request.method,
            'original_status_code': status_code,
        }
    )
    
    # Record the exception
    try:
        await exception_service.record_exception(custom_exc, context, source="backend")
    except Exception as log_exc:
        # Don't let logging failures break error handling
        import logging
        logging.error(f"Failed to record exception: {log_exc}", exc_info=True)
    
    # Build error response
    error_response = {
        "error": custom_exc.to_dict(),
        "trace_id": str(context.trace_id) if context.trace_id else None,
        "request_id": context.request_id,
        "timestamp": context.additional_data.get('timestamp') if context.additional_data else None,
    }
    
    return JSONResponse(
        status_code=status_code,
        content=error_response
    )


async def database_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Handle database-related exceptions.
    
    Args:
        request: The FastAPI request object
        exc: The database exception
    
    Returns:
        JSONResponse: Database error response
    """
    # Create database error
    db_error = DatabaseError(
        message="Database operation failed",
        original_exception=exc
    )
    
    # Extract context information
    context = ExceptionContext(
        trace_id=get_trace_id(request),
        request_id=get_request_id(request),
        user_id=getattr(request.state, 'user_id', None),
        additional_data={
            'url': str(request.url),
            'method': request.method,
            'database_error_type': type(exc).__name__,
        }
    )
    
    # Record the exception
    try:
        await exception_service.record_exception(db_error, context, source="backend")
    except Exception as log_exc:
        # Don't let logging failures break error handling
        import logging
        logging.error(f"Failed to record exception: {log_exc}", exc_info=True)
    
    # Build error response (don't expose internal database details)
    error_response = {
        "error": {
            "type": "DatabaseError",
            "message": "A database error occurred",
            "code": "DATABASE_ERROR"
        },
        "trace_id": str(context.trace_id) if context.trace_id else None,
        "request_id": context.request_id,
        "timestamp": context.additional_data.get('timestamp') if context.additional_data else None,
    }
    
    return JSONResponse(
        status_code=500,
        content=error_response
    )


def register_exception_handlers(app):
    """
    Register all exception handlers with the FastAPI application.
    
    Args:
        app: The FastAPI application instance
    """
    # Custom exception handlers (most specific first)
    app.add_exception_handler(BaseCustomException, custom_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(PydanticValidationError, validation_exception_handler)
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    
    # Database exception handlers (add specific database exception types as needed)
    # app.add_exception_handler(DatabaseSpecificException, database_exception_handler)
    
    # Global catch-all handler (least specific, handles everything else)
    app.add_exception_handler(Exception, global_exception_handler)


# Exception handler utilities
def create_error_response(
    exception: BaseCustomException,
    trace_id: str = None,
    request_id: str = None
) -> Dict[str, Any]:
    """
    Create a standardized error response dictionary.
    
    Args:
        exception: The exception to create response for
        trace_id: Optional trace ID for correlation
        request_id: Optional request ID for correlation
    
    Returns:
        Dict: Standardized error response
    """
    return {
        "error": exception.to_dict(),
        "trace_id": trace_id,
        "request_id": request_id,
        "timestamp": None,  # Will be set by the handler
    }


def is_client_error(status_code: int) -> bool:
    """Check if status code represents a client error (4xx)."""
    return 400 <= status_code < 500


def is_server_error(status_code: int) -> bool:
    """Check if status code represents a server error (5xx)."""
    return 500 <= status_code < 600


def should_log_stack_trace(exception: BaseCustomException) -> bool:
    """Determine if stack trace should be logged for this exception."""
    # Don't log stack traces for client errors (4xx)
    return not is_client_error(exception.http_status_code)