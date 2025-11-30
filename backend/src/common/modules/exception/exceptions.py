"""Custom exception classes for the application."""
from typing import Any, Optional


class AppException(Exception):
    """Base application exception.

    All custom exceptions should inherit from this class.
    """

    def __init__(
        self,
        message: str,
        status_code: int = 500,
        error_code: Optional[str] = None,
        details: Optional[dict[str, Any]] = None,
    ):
        """
        Initialize application exception.

        Args:
            message: Human-readable error message
            status_code: HTTP status code
            error_code: Application-specific error code (e.g., "RESOURCE_NOT_FOUND")
            details: Additional error details
        """
        self.message = message
        self.status_code = status_code
        self.error_code = error_code or self.__class__.__name__
        self.details = details or {}
        super().__init__(self.message)


class NotFoundError(AppException):
    """Resource not found exception (404)."""

    def __init__(self, resource: str = "Resource", details: Optional[dict[str, Any]] = None):
        super().__init__(
            message=f"{resource} not found",
            status_code=404,
            error_code="RESOURCE_NOT_FOUND",
            details=details,
        )


class ValidationError(AppException):
    """Validation error exception (400)."""

    def __init__(self, message: str, details: Optional[dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=400,
            error_code="VALIDATION_ERROR",
            details=details,
        )


class UnauthorizedError(AppException):
    """Unauthorized access exception (401)."""

    def __init__(self, message: str = "Unauthorized", details: Optional[dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=401,
            error_code="UNAUTHORIZED",
            details=details,
        )


class ForbiddenError(AppException):
    """Forbidden access exception (403)."""

    def __init__(self, message: str = "Forbidden", details: Optional[dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=403,
            error_code="FORBIDDEN",
            details=details,
        )


class ConflictError(AppException):
    """Resource conflict exception (409)."""

    def __init__(self, message: str = "Resource conflict", details: Optional[dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=409,
            error_code="RESOURCE_CONFLICT",
            details=details,
        )


class BadRequestError(AppException):
    """Bad request exception (400)."""

    def __init__(self, message: str = "Bad request", details: Optional[dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=400,
            error_code="BAD_REQUEST",
            details=details,
        )


class InternalServerError(AppException):
    """Internal server error exception (500)."""

    def __init__(self, message: str = "Internal server error", details: Optional[dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=500,
            error_code="INTERNAL_SERVER_ERROR",
            details=details,
        )


class ServiceUnavailableError(AppException):
    """Service unavailable exception (503)."""

    def __init__(self, message: str = "Service unavailable", details: Optional[dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=503,
            error_code="SERVICE_UNAVAILABLE",
            details=details,
        )























