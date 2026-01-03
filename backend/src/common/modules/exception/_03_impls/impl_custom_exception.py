"""Custom exception implementations.

This module defines concrete exception classes that inherit from
AbstractCustomException and map to specific HTTP status codes.
"""
from typing import Optional, Dict, Any, TYPE_CHECKING

from .._01_contracts import EExceptionType
from .._02_abstracts import AbstractCustomException

if TYPE_CHECKING:
    from .._01_contracts import ILayerRule

# Layer rule instance, injected at module initialization
_layer_rule: Optional["ILayerRule"] = None


def set_layer_rule(rule: "ILayerRule") -> None:
    """Set the layer rule instance for exception checking."""
    global _layer_rule
    _layer_rule = rule


def get_layer_rule() -> Optional["ILayerRule"]:
    """Get the layer rule instance."""
    return _layer_rule


class ValidationError(AbstractCustomException):
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
        self._check_layer_rule()
    
    def _check_layer_rule(self) -> None:
        rule = get_layer_rule()
        if rule:
            rule.check_exception_usage(self.__class__.__name__)
    
    @property
    def http_status_code(self) -> int:
        return 400
    
    @property
    def exception_type(self) -> EExceptionType:
        return EExceptionType.VALIDATION_ERROR
    
    def to_dict(self) -> Dict[str, Any]:
        result = super().to_dict()
        if self.field_errors:
            result["field_errors"] = self.field_errors
        return result


class AuthenticationError(AbstractCustomException):
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
        self._check_layer_rule()
    
    def _check_layer_rule(self) -> None:
        rule = get_layer_rule()
        if rule:
            rule.check_exception_usage(self.__class__.__name__)
    
    @property
    def http_status_code(self) -> int:
        return 401
    
    @property
    def exception_type(self) -> EExceptionType:
        return EExceptionType.AUTHENTICATION_ERROR
    
    def to_dict(self) -> Dict[str, Any]:
        result = super().to_dict()
        if self.auth_method:
            result["auth_method"] = self.auth_method
        return result


class AuthorizationError(AbstractCustomException):
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
        self._check_layer_rule()
    
    def _check_layer_rule(self) -> None:
        rule = get_layer_rule()
        if rule:
            rule.check_exception_usage(self.__class__.__name__)
    
    @property
    def http_status_code(self) -> int:
        return 403
    
    @property
    def exception_type(self) -> EExceptionType:
        return EExceptionType.AUTHORIZATION_ERROR
    
    def to_dict(self) -> Dict[str, Any]:
        result = super().to_dict()
        if self.required_permission:
            result["required_permission"] = self.required_permission
        return result


class NotFoundError(AbstractCustomException):
    """Raised when a requested resource is not found."""
    
    def __init__(
        self,
        message: str = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        original_exception: Optional[Exception] = None
    ):
        # Auto-generate message from resource_type if not provided
        if message is None and resource_type:
            if resource_id:
                message = f"{resource_type} not found: {resource_id}"
            else:
                message = f"{resource_type} not found"
        elif message is None:
            message = "Resource not found"
        
        super().__init__(message, context, original_exception)
        self.resource_type = resource_type
        self.resource_id = resource_id
        self._check_layer_rule()
    
    def _check_layer_rule(self) -> None:
        rule = get_layer_rule()
        if rule:
            rule.check_exception_usage(self.__class__.__name__)
    
    @property
    def http_status_code(self) -> int:
        return 404
    
    @property
    def exception_type(self) -> EExceptionType:
        return EExceptionType.NOT_FOUND_ERROR
    
    def to_dict(self) -> Dict[str, Any]:
        result = super().to_dict()
        if self.resource_type:
            result["resource_type"] = self.resource_type
        if self.resource_id:
            result["resource_id"] = self.resource_id
        return result


class ConflictError(AbstractCustomException):
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
        self._check_layer_rule()
    
    def _check_layer_rule(self) -> None:
        rule = get_layer_rule()
        if rule:
            rule.check_exception_usage(self.__class__.__name__)
    
    @property
    def http_status_code(self) -> int:
        return 409
    
    @property
    def exception_type(self) -> EExceptionType:
        return EExceptionType.CONFLICT_ERROR
    
    def to_dict(self) -> Dict[str, Any]:
        result = super().to_dict()
        if self.conflicting_resource:
            result["conflicting_resource"] = self.conflicting_resource
        return result


class RateLimitError(AbstractCustomException):
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
        self._check_layer_rule()
    
    def _check_layer_rule(self) -> None:
        rule = get_layer_rule()
        if rule:
            rule.check_exception_usage(self.__class__.__name__)
    
    @property
    def http_status_code(self) -> int:
        return 429
    
    @property
    def exception_type(self) -> EExceptionType:
        return EExceptionType.RATE_LIMIT_ERROR
    
    def to_dict(self) -> Dict[str, Any]:
        result = super().to_dict()
        if self.retry_after:
            result["retry_after"] = self.retry_after
        if self.limit_type:
            result["limit_type"] = self.limit_type
        return result


class DatabaseError(AbstractCustomException):
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
        self._check_layer_rule()
    
    def _check_layer_rule(self) -> None:
        rule = get_layer_rule()
        if rule:
            rule.check_exception_usage(self.__class__.__name__)
    
    @property
    def http_status_code(self) -> int:
        return 500
    
    @property
    def exception_type(self) -> EExceptionType:
        return EExceptionType.DATABASE_ERROR
    
    def to_dict(self) -> Dict[str, Any]:
        result = super().to_dict()
        if self.table_name:
            result["table_name"] = self.table_name
        if self.operation:
            result["operation"] = self.operation
        return result


class ExternalServiceError(AbstractCustomException):
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
        self._check_layer_rule()
    
    def _check_layer_rule(self) -> None:
        rule = get_layer_rule()
        if rule:
            rule.check_exception_usage(self.__class__.__name__)
    
    @property
    def http_status_code(self) -> int:
        return 502
    
    @property
    def exception_type(self) -> EExceptionType:
        return EExceptionType.EXTERNAL_SERVICE_ERROR
    
    def to_dict(self) -> Dict[str, Any]:
        result = super().to_dict()
        if self.service_name:
            result["service_name"] = self.service_name
        if self.status_code:
            result["service_status_code"] = self.status_code
        return result


class InternalError(AbstractCustomException):
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
        self._check_layer_rule()
    
    def _check_layer_rule(self) -> None:
        rule = get_layer_rule()
        if rule:
            rule.check_exception_usage(self.__class__.__name__)
    
    @property
    def http_status_code(self) -> int:
        return 500
    
    @property
    def exception_type(self) -> EExceptionType:
        return EExceptionType.INTERNAL_ERROR
    
    @property
    def error_code(self) -> str:
        return self._error_code or super().error_code


# Exception type mapping
EXCEPTION_TYPE_MAP = {
    EExceptionType.VALIDATION_ERROR: ValidationError,
    EExceptionType.AUTHENTICATION_ERROR: AuthenticationError,
    EExceptionType.AUTHORIZATION_ERROR: AuthorizationError,
    EExceptionType.NOT_FOUND_ERROR: NotFoundError,
    EExceptionType.CONFLICT_ERROR: ConflictError,
    EExceptionType.RATE_LIMIT_ERROR: RateLimitError,
    EExceptionType.DATABASE_ERROR: DatabaseError,
    EExceptionType.EXTERNAL_SERVICE_ERROR: ExternalServiceError,
    EExceptionType.INTERNAL_ERROR: InternalError,
}


def create_exception_from_type(
    exception_type: EExceptionType,
    message: str,
    context: Optional[Dict[str, Any]] = None,
    original_exception: Optional[Exception] = None
) -> AbstractCustomException:
    """Factory function to create exception instances from exception type."""
    exception_class = EXCEPTION_TYPE_MAP.get(exception_type, InternalError)
    return exception_class(message, context=context, original_exception=original_exception)
