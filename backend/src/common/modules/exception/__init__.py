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
    validation_exception_handler,
    sqlalchemy_exception_handler,
    general_exception_handler,
)
from .responses import create_error_response, get_trace_id

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
    "validation_exception_handler",
    "sqlalchemy_exception_handler",
    "general_exception_handler",
    # Response utilities
    "create_error_response",
    "get_trace_id",
]

