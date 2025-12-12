"""
Exception handlers for FastAPI.

This module provides global exception handlers for various exception types.
"""
from fastapi import Request, status, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
import traceback
from typing import Optional
from uuid import UUID

from ..config import settings
from .exceptions import AppException
from .responses import create_error_response
from ..logger.request import get_trace_id


def _record_exception_to_file(
    request: Request,
    exc: Exception,
    error_code: Optional[str] = None,
    status_code: int = 500,
    user_id: Optional[UUID] = None,
):
    """
    Record exception to file log.
    
    This function attempts to record the exception but doesn't fail if it can't
    (to avoid recursive errors).
    """
    try:
        from .service import ExceptionService
        
        trace_id = get_trace_id(request)
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")
        
        # Get request data (sanitized - only first 1000 chars to avoid huge payloads)
        request_data = None
        try:
            if hasattr(request, "_body"):
                body = request._body
                if body and len(body) < 1000:
                    import json
                    request_data = json.loads(body.decode("utf-8"))
        except Exception:
            pass  # Ignore errors when reading request body
        
        exception_service = ExceptionService()
        exception_service.create_exception(
            source="backend",
            exception_type=type(exc).__name__,
            exception_message=str(exc),
            error_code=error_code,
            status_code=status_code,
            trace_id=trace_id,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            request_method=request.method,
            request_path=request.url.path,
            request_data=request_data,
            exc=exc,
        )
    except Exception:
        # Silently fail to avoid recursive errors
        pass


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    """Handle application exceptions."""
    trace_id = get_trace_id(request)
    
    # Get user_id from request state if available
    user_id = None
    if hasattr(request.state, "user_id"):
        user_id = request.state.user_id

    # Record 5xx errors to database (no terminal logging)
    if exc.status_code >= 500:
        _record_exception_to_file(
            request=request,
            exc=exc,
            error_code=exc.error_code,
            status_code=exc.status_code,
            user_id=user_id,
        )

    # Include details only in debug mode
    include_details = settings.DEBUG

    response = create_error_response(
        message=exc.message,
        status_code=exc.status_code,
        error_code=exc.error_code,
        details=exc.details if include_details else None,
        trace_id=trace_id,
        include_details=include_details,
    )

    return JSONResponse(status_code=exc.status_code, content=response)


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Handle HTTP exceptions (FastAPI's HTTPException)."""
    trace_id = get_trace_id(request)
    
    # Get user_id from request state if available
    user_id = None
    if hasattr(request.state, "user_id"):
        user_id = request.state.user_id
    
    # Extract detail message from HTTPException
    # HTTPException.detail can be a string, dict, or list
    detail = exc.detail
    if isinstance(detail, dict):
        message = detail.get("message", detail.get("detail", "HTTP error"))
    elif isinstance(detail, list):
        message = "HTTP error"
    else:
        message = str(detail) if detail else "HTTP error"
    
    # Record 5xx errors to database (no terminal logging)
    if exc.status_code >= 500:
        _record_exception_to_file(
            request=request,
            exc=exc,
            error_code="HTTP_SERVER_ERROR",
            status_code=exc.status_code,
            user_id=user_id,
        )
    
    # Include details only in debug mode
    include_details = settings.DEBUG
    
    # Format error code based on status code
    error_code = f"HTTP_{exc.status_code}"
    if exc.status_code >= 500:
        error_code = "HTTP_SERVER_ERROR"
    elif exc.status_code == 404:
        error_code = "NOT_FOUND"
    elif exc.status_code == 401:
        error_code = "UNAUTHORIZED"
    elif exc.status_code == 403:
        error_code = "FORBIDDEN"
    elif exc.status_code == 400:
        error_code = "BAD_REQUEST"
    
    response = create_error_response(
        message=message,
        status_code=exc.status_code,
        error_code=error_code,
        details={"detail": detail} if include_details and detail else None,
        trace_id=trace_id,
        include_details=include_details,
    )
    
    return JSONResponse(status_code=exc.status_code, content=response)


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Handle validation exceptions."""
    trace_id = get_trace_id(request)
    errors = exc.errors()

    # Don't log validation errors to terminal, just return error response
    # But record to exception log file for debugging (especially in DEBUG mode)
    if settings.DEBUG:
        # Get user_id from request state if available
        user_id = None
        if hasattr(request.state, "user_id"):
            user_id = request.state.user_id
        
        # Record validation error to file for debugging
        try:
            from .service import ExceptionService
            
            ip_address = request.client.host if request.client else None
            user_agent = request.headers.get("user-agent")
            
            # Format validation errors as a readable message
            error_messages = []
            for error in errors:
                loc = " -> ".join(str(loc_item) for loc_item in error.get("loc", []))
                msg = error.get("msg", "Validation error")
                error_messages.append(f"{loc}: {msg}")
            
            exception_message = f"Validation error: {'; '.join(error_messages)}"
            
            service = ExceptionService()
            service.create_exception(
                source="backend",
                exception_type="RequestValidationError",
                exception_message=exception_message,
                error_code="VALIDATION_ERROR",
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                trace_id=trace_id,
                request_path=request.url.path,
                request_method=request.method,
                ip_address=ip_address,
                user_agent=user_agent,
                user_id=user_id,
                context_data={"validation_errors": errors},
            )
        except Exception:
            pass  # Ignore errors when recording validation exceptions

    # Format error messages for response - always include details for validation errors
    simplified_errors = []
    for error in errors:
        loc = " -> ".join(str(loc_item) for loc_item in error.get("loc", []))
        msg = error.get("msg", "Validation error")
        simplified_errors.append(f"{loc}: {msg}")

    # Always include validation error details in response for debugging
    error_details = {
        "validation_errors": errors,  # Full error details
        "simplified_errors": simplified_errors,  # Human-readable format
    }

    response = create_error_response(
        message=f"Validation error: {'; '.join(simplified_errors)}",
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        error_code="VALIDATION_ERROR",
        details=error_details,
        trace_id=trace_id,
        include_details=True,  # Always include details for validation errors
    )

    return JSONResponse(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, content=response)


async def sqlalchemy_exception_handler(
    request: Request, exc: SQLAlchemyError
) -> JSONResponse:
    """Handle SQLAlchemy exceptions."""
    trace_id = get_trace_id(request)
    
    # Get user_id from request state if available
    user_id = None
    if hasattr(request.state, "user_id"):
        user_id = request.state.user_id

    # Check for integrity errors (constraint violations)
    if isinstance(exc, IntegrityError):
        error_message = "Database integrity constraint violation"
        error_code = "DATABASE_INTEGRITY_ERROR"
    else:
        error_message = "Database error occurred"
        error_code = "DATABASE_ERROR"
    
    # Record database errors to database (no terminal logging)
    _record_exception_to_file(
        request=request,
        exc=exc,
        error_code=error_code,
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        user_id=user_id,
    )

    # Never expose database details in production
    details = {"original_error": str(exc)} if settings.DEBUG else None

    response = create_error_response(
        message=error_message,
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        error_code=error_code,
        details=details,
        trace_id=trace_id,
        include_details=settings.DEBUG,
    )

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content=response
    )


async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle general/unexpected exceptions."""
    trace_id = get_trace_id(request)
    
    # Get user_id from request state if available
    user_id = None
    if hasattr(request.state, "user_id"):
        user_id = request.state.user_id

    # Record unexpected exceptions to database (no terminal logging)
    _record_exception_to_file(
        request=request,
        exc=exc,
        error_code="INTERNAL_SERVER_ERROR",
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        user_id=user_id,
    )

    # In production, don't expose exception details
    message = "Internal server error"
    details = None

    if settings.DEBUG:
        message = f"Unexpected error: {str(exc)}"
        details = {
            "exception_type": type(exc).__name__,
            "exception_message": str(exc),
            "traceback": traceback.format_exc(),
        }

    response = create_error_response(
        message=message,
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        error_code="INTERNAL_SERVER_ERROR",
        details=details,
        trace_id=trace_id,
        include_details=settings.DEBUG,
    )

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content=response
    )

