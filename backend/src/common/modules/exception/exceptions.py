"""
Custom exception classes for the exception handling system.

This module defines a hierarchical structure of custom exceptions that map to specific
HTTP status codes and provide context-specific error handling capabilities.
"""
from typing import Optional, Dict, Any
from enum import Enum


class ExceptionType(Enum):
    """Enumeration of all exception types in the system."""
    
    # Frontend Exception Types (for classification purposes)
    NETWORK_ERROR = "NetworkError"
    API_ERROR = "ApiError"
    VALIDATION_ERROR = "ValidationError"
    AUTH_ERROR = "AuthError"
    RENDER_ERROR = "RenderError"
    RUNTIME_ERROR = "RuntimeError"
    
    # Backend Exception Types
    AUTHENTICATION_ERROR = "AuthenticationError"
    AUTHORIZATION_ERROR = "AuthorizationError"
    NOT_FOUND_ERROR = "NotFoundError"
    CONFLICT_ERROR = "ConflictError"
    RATE_LIMIT_ERROR = "RateLimitError"
    DATABASE_ERROR = "DatabaseError"
    EXTERNAL_SERVICE_ERROR = "ExternalServiceError"
    INTERNAL_ERROR = "InternalError"


class BaseCustomException(Exception):
    """
    Base class for all custom exceptions in the system.
    
    Provides common functionality for HTTP status mapping, context data,
    and exception classification.
    """
    
    def __init__(
        self,
        message: str,
        context: Optional[Dict[str, Any]] = None,
        original_exception: Optional[Exception] = None
    ):
        """
        Initialize base exception.
        
        Args:
            message: Human-readable error message
            context: Additional context data specific to the exception
            original_exception: Original exception that caused this exception (if any)
        """
        super().__init__(message)
        self.message = message
        self.context = context or {}
        self.original_exception = original_exception
    
    @property
    def http_status_code(self) -> int:
        """Return the HTTP status code for this exception type."""
        return 500  # Default to internal server error
    
    @property
    def exception_type(self) -> ExceptionType:
        """Return the exception type enum for this exception."""
        return ExceptionType.INTERNAL_ERROR  # Default type
    
    @property
    def error_code(self) -> str:
        """Return a machine-readable error code."""
        return self.exception_type.value
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert exception to dictionary for API responses."""
        return {
            "type": self.exception_type.value,
            "message": self.message,
            "code": self.error_code,
            "context": self.context
        }


# Validation Exceptions (HTTP 400)
class ValidationError(BaseCustomException):
    """Raised when data validation fails."""
    
    def __init__(
        self,
        message: str = "Validation failed",
        field_errors: Optional[Dict[str, str]] = None,
        context: Optional[Dict[str, Any]] = None,
        original_exception: Optional[Exception] = None
    ):
        super().__init__(message, context, original_exception)
        self.field_errors = field_errors or {}
    
    @property
    def http_status_code(self) -> int:
        return 400
    
    @property
    def exception_type(self) -> ExceptionType:
        return ExceptionType.VALIDATION_ERROR
    
    def to_dict(self) -> Dict[str, Any]:
        result = super().to_dict()
        if self.field_errors:
            result["field_errors"] = self.field_errors
        return result


# Authentication Exceptions (HTTP 401)
class AuthenticationError(BaseCustomException):
    """Raised when authentication fails."""
    
    def __init__(
        self,
        message: str = "Authentication failed",
        auth_method: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        original_exception: Optional[Exception] = None
    ):
        super().__init__(message, context, original_exception)
        self.auth_method = auth_method
    
    @property
    def http_status_code(self) -> int:
        return 401
    
    @property
    def exception_type(self) -> ExceptionType:
        return ExceptionType.AUTHENTICATION_ERROR
    
    def to_dict(self) -> Dict[str, Any]:
        result = super().to_dict()
        if self.auth_method:
            result["auth_method"] = self.auth_method
        return result


# Authorization Exceptions (HTTP 403)
class AuthorizationError(BaseCustomException):
    """Raised when authorization fails."""
    
    def __init__(
        self,
        message: str = "Access denied",
        required_permission: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        original_exception: Optional[Exception] = None
    ):
        super().__init__(message, context, original_exception)
        self.required_permission = required_permission
    
    @property
    def http_status_code(self) -> int:
        return 403
    
    @property
    def exception_type(self) -> ExceptionType:
        return ExceptionType.AUTHORIZATION_ERROR
    
    def to_dict(self) -> Dict[str, Any]:
        result = super().to_dict()
        if self.required_permission:
            result["required_permission"] = self.required_permission
        return result


# Not Found Exceptions (HTTP 404)
class NotFoundError(BaseCustomException):
    """Raised when a requested resource is not found."""
    
    def __init__(
        self,
        message: str = "Resource not found",
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        original_exception: Optional[Exception] = None
    ):
        super().__init__(message, context, original_exception)
        self.resource_type = resource_type
        self.resource_id = resource_id
    
    @property
    def http_status_code(self) -> int:
        return 404
    
    @property
    def exception_type(self) -> ExceptionType:
        return ExceptionType.NOT_FOUND_ERROR
    
    def to_dict(self) -> Dict[str, Any]:
        result = super().to_dict()
        if self.resource_type:
            result["resource_type"] = self.resource_type
        if self.resource_id:
            result["resource_id"] = self.resource_id
        return result


# Conflict Exceptions (HTTP 409)
class ConflictError(BaseCustomException):
    """Raised when a resource conflict occurs."""
    
    def __init__(
        self,
        message: str = "Resource conflict",
        conflicting_resource: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        original_exception: Optional[Exception] = None
    ):
        super().__init__(message, context, original_exception)
        self.conflicting_resource = conflicting_resource
    
    @property
    def http_status_code(self) -> int:
        return 409
    
    @property
    def exception_type(self) -> ExceptionType:
        return ExceptionType.CONFLICT_ERROR
    
    def to_dict(self) -> Dict[str, Any]:
        result = super().to_dict()
        if self.conflicting_resource:
            result["conflicting_resource"] = self.conflicting_resource
        return result


# Rate Limit Exceptions (HTTP 429)
class RateLimitError(BaseCustomException):
    """Raised when rate limiting is triggered."""
    
    def __init__(
        self,
        message: str = "Rate limit exceeded",
        retry_after: Optional[int] = None,
        limit_type: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        original_exception: Optional[Exception] = None
    ):
        super().__init__(message, context, original_exception)
        self.retry_after = retry_after
        self.limit_type = limit_type
    
    @property
    def http_status_code(self) -> int:
        return 429
    
    @property
    def exception_type(self) -> ExceptionType:
        return ExceptionType.RATE_LIMIT_ERROR
    
    def to_dict(self) -> Dict[str, Any]:
        result = super().to_dict()
        if self.retry_after:
            result["retry_after"] = self.retry_after
        if self.limit_type:
            result["limit_type"] = self.limit_type
        return result


# Database Exceptions (HTTP 500)
class DatabaseError(BaseCustomException):
    """Raised when database operations fail."""
    
    def __init__(
        self,
        message: str = "Database operation failed",
        table_name: Optional[str] = None,
        operation: Optional[str] = None,
        query: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        original_exception: Optional[Exception] = None
    ):
        super().__init__(message, context, original_exception)
        self.table_name = table_name
        self.operation = operation
        self.query = query
    
    @property
    def http_status_code(self) -> int:
        return 500
    
    @property
    def exception_type(self) -> ExceptionType:
        return ExceptionType.DATABASE_ERROR
    
    def to_dict(self) -> Dict[str, Any]:
        result = super().to_dict()
        if self.table_name:
            result["table_name"] = self.table_name
        if self.operation:
            result["operation"] = self.operation
        # Don't include query in response for security reasons
        return result


# External Service Exceptions (HTTP 502)
class ExternalServiceError(BaseCustomException):
    """Raised when external service calls fail."""
    
    def __init__(
        self,
        message: str = "External service error",
        service_name: Optional[str] = None,
        service_url: Optional[str] = None,
        status_code: Optional[int] = None,
        context: Optional[Dict[str, Any]] = None,
        original_exception: Optional[Exception] = None
    ):
        super().__init__(message, context, original_exception)
        self.service_name = service_name
        self.service_url = service_url
        self.status_code = status_code
    
    @property
    def http_status_code(self) -> int:
        return 502
    
    @property
    def exception_type(self) -> ExceptionType:
        return ExceptionType.EXTERNAL_SERVICE_ERROR
    
    def to_dict(self) -> Dict[str, Any]:
        result = super().to_dict()
        if self.service_name:
            result["service_name"] = self.service_name
        if self.status_code:
            result["service_status_code"] = self.status_code
        # Don't include service_url for security reasons
        return result


# Internal Exceptions (HTTP 500)
class InternalError(BaseCustomException):
    """Raised for internal server errors."""
    
    def __init__(
        self,
        message: str = "Internal server error",
        error_code: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        original_exception: Optional[Exception] = None
    ):
        super().__init__(message, context, original_exception)
        self._error_code = error_code
    
    @property
    def http_status_code(self) -> int:
        return 500
    
    @property
    def exception_type(self) -> ExceptionType:
        return ExceptionType.INTERNAL_ERROR
    
    @property
    def error_code(self) -> str:
        return self._error_code or super().error_code


# Exception mapping for easy lookup
EXCEPTION_TYPE_MAP = {
    ExceptionType.VALIDATION_ERROR: ValidationError,
    ExceptionType.AUTHENTICATION_ERROR: AuthenticationError,
    ExceptionType.AUTHORIZATION_ERROR: AuthorizationError,
    ExceptionType.NOT_FOUND_ERROR: NotFoundError,
    ExceptionType.CONFLICT_ERROR: ConflictError,
    ExceptionType.RATE_LIMIT_ERROR: RateLimitError,
    ExceptionType.DATABASE_ERROR: DatabaseError,
    ExceptionType.EXTERNAL_SERVICE_ERROR: ExternalServiceError,
    ExceptionType.INTERNAL_ERROR: InternalError,
}


# Alias for backward compatibility
AppException = BaseCustomException


def create_exception_from_type(
    exception_type: ExceptionType,
    message: str,
    context: Optional[Dict[str, Any]] = None,
    original_exception: Optional[Exception] = None
) -> BaseCustomException:
    """
    Factory function to create exception instances from exception type.
    
    Args:
        exception_type: The type of exception to create
        message: Error message
        context: Additional context data
        original_exception: Original exception that caused this
    
    Returns:
        Instance of the appropriate exception class
    """
    exception_class = EXCEPTION_TYPE_MAP.get(exception_type, InternalError)
    return exception_class(message, context=context, original_exception=original_exception)