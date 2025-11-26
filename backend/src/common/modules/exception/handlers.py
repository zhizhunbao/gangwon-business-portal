"""
Exception handlers for FastAPI.

This module provides global exception handlers for various exception types.
"""
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
import traceback

from ..config import settings
from ..logger import logger
from .exceptions import AppException
from .responses import create_error_response, get_trace_id


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    """Handle application exceptions."""
    trace_id = get_trace_id(request)

    # Log error with context
    logger.error(
        f"Application error: {exc.message}",
        exc_info=exc,
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

