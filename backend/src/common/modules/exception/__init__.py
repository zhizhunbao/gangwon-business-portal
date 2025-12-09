"""Exception handling module."""
from .exceptions import (
    AppException,
    NotFoundError,
    ValidationError,
    UnauthorizedError,
    ForbiddenError,
    ConflictError,
    BadRequestError,
    InternalServerError,
    ServiceUnavailableError,
)
from .handlers import (
    app_exception_handler,
    http_exception_handler,
    validation_exception_handler,
    sqlalchemy_exception_handler,
    general_exception_handler,
)
from .responses import create_error_response
# Import get_trace_id from logger module (moved for better organization)
from ..logger.request import get_trace_id
from .router import router as exception_router
from .service import ExceptionService

# Create service instance
exception_service = ExceptionService()

__all__ = [
    # Exception classes
    "AppException",
    "NotFoundError",
    "ValidationError",
    "UnauthorizedError",
    "ForbiddenError",
    "ConflictError",
    "BadRequestError",
    "InternalServerError",
    "ServiceUnavailableError",
    # Exception handlers
    "app_exception_handler",
    "http_exception_handler",
    "validation_exception_handler",
    "sqlalchemy_exception_handler",
    "general_exception_handler",
    # Response utilities
    "create_error_response",
    "get_trace_id",
    # Router
    "exception_router",
    # Service
    "ExceptionService",
    "exception_service",
]

