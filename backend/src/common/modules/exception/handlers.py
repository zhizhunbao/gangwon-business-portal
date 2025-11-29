"""
Exception handlers for FastAPI.

This module provides global exception handlers for various exception types.
"""
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
import traceback
from typing import Optional
from uuid import UUID

from ..config import settings
from ..logger import logger
from .exceptions import AppException
from .responses import create_error_response, get_trace_id


async def _record_exception_to_db(
    request: Request,
    exc: Exception,
    error_code: Optional[str] = None,
    status_code: int = 500,
    user_id: Optional[UUID] = None,
):
    """
    Record exception to database asynchronously.
    
    This function attempts to record the exception but doesn't fail if it can't
    (to avoid recursive errors).
    """
    try:
        from ..db.session import AsyncSessionLocal
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
        
        async with AsyncSessionLocal() as db:
            exception_service = ExceptionService()
            await exception_service.create_exception(
                db=db,
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
    except Exception as e:
        # Silently fail to avoid recursive errors
        logger.debug(f"Failed to record exception to database: {str(e)}")


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    """Handle application exceptions."""
    trace_id = get_trace_id(request)
    
    # Get user_id from request state if available
    user_id = None
    if hasattr(request.state, "user_id"):
        user_id = request.state.user_id

    # Use appropriate log level based on status code
    # 4xx errors (client errors) are expected in normal operation, use warning
    # 5xx errors (server errors) are unexpected, use error
    if exc.status_code >= 500:
        log_level = logger.error
        log_message = f"Application error: {exc.message}"
        include_exc_info = True
        # Record 5xx errors to database
        await _record_exception_to_db(
            request=request,
            exc=exc,
            error_code=exc.error_code,
            status_code=exc.status_code,
            user_id=user_id,
        )
    elif exc.status_code >= 400:
        log_level = logger.warning
        log_message = f"Client error: {exc.message}"
        include_exc_info = False
    else:
        log_level = logger.info
        log_message = f"Application response: {exc.message}"
        include_exc_info = False

    # Log with appropriate level
    log_level(
        log_message,
        exc_info=exc if include_exc_info else None,
        extra={
            "error_code": exc.error_code,
            "status_code": exc.status_code,
            "trace_id": trace_id,
            "path": request.url.path,
            "method": request.method,
        },
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


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Handle validation exceptions."""
    trace_id = get_trace_id(request)
    errors = exc.errors()

    # Log validation error
    logger.warning(
        "Validation error",
        extra={
            "errors": errors,
            "trace_id": trace_id,
            "path": request.url.path,
            "method": request.method,
        },
    )

    # Include validation details only in debug mode
    include_details = settings.DEBUG

    response = create_error_response(
        message="Validation error",
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        error_code="VALIDATION_ERROR",
        details={"validation_errors": errors} if include_details else None,
        trace_id=trace_id,
        include_details=include_details,
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
        # In production, don't expose database details
        if settings.DEBUG:
            logger.error(
                f"Database integrity error: {str(exc)}",
                exc_info=exc,
                extra={
                    "trace_id": trace_id,
                    "path": request.url.path,
                    "method": request.method,
                },
            )
        else:
            logger.error(
                "Database integrity error",
                exc_info=exc,
                extra={
                    "trace_id": trace_id,
                    "path": request.url.path,
                    "method": request.method,
                },
            )
    else:
        error_message = "Database error occurred"
        error_code = "DATABASE_ERROR"
        logger.error(
            f"Database error: {str(exc)}",
            exc_info=exc,
            extra={
                "trace_id": trace_id,
                "path": request.url.path,
                "method": request.method,
            },
        )
    
    # Record database errors to database
    await _record_exception_to_db(
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

    # Log full exception with stack trace
    logger.error(
        f"Unexpected error: {type(exc).__name__}: {str(exc)}",
        exc_info=exc,
        extra={
            "trace_id": trace_id,
            "path": request.url.path,
            "method": request.method,
            "exception_type": type(exc).__name__,
        },
    )
    
    # Record unexpected exceptions to database
    await _record_exception_to_db(
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

