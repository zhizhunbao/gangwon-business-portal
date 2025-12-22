"""
Exception classifier for automatic exception type detection.

This module is responsible solely for classifying exceptions into
appropriate custom exception types based on exception characteristics.
"""
from typing import Union

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


class ExceptionClassifier:
    """Service for classifying exceptions into appropriate custom exception types."""
    
    def classify(self, exception: Exception) -> BaseCustomException:
        """
        Classify an exception into the appropriate custom exception type.
        
        Args:
            exception: The exception to classify
        
        Returns:
            BaseCustomException: The classified exception
        """
        # If it's already a custom exception, return as-is
        if isinstance(exception, BaseCustomException):
            return exception
        
        # Get exception type name and message
        exc_type = type(exception).__name__
        exc_message = str(exception)
        
        # Classification logic based on exception type and message
        if self._is_validation_error(exc_message, exc_type):
            return ValidationError(exc_message, original_exception=exception)
        
        elif self._is_authentication_error(exc_message, exc_type):
            return AuthenticationError(exc_message, original_exception=exception)
        
        elif self._is_authorization_error(exc_message, exc_type):
            return AuthorizationError(exc_message, original_exception=exception)
        
        elif self._is_not_found_error(exc_message, exc_type):
            return NotFoundError(exc_message, original_exception=exception)
        
        elif self._is_conflict_error(exc_message, exc_type):
            return ConflictError(exc_message, original_exception=exception)
        
        elif self._is_rate_limit_error(exc_message, exc_type):
            return RateLimitError(exc_message, original_exception=exception)
        
        elif self._is_database_error(exc_message, exc_type):
            return DatabaseError(exc_message, original_exception=exception)
        
        elif self._is_external_service_error(exc_message, exc_type):
            return ExternalServiceError(exc_message, original_exception=exception)
        
        else:
            # Default to internal error
            return InternalError(exc_message, original_exception=exception)
    
    def _is_validation_error(self, message: str, exc_type: str) -> bool:
        """Check if exception is a validation error."""
        return ("validation" in message.lower() or 
                "invalid" in message.lower() or
                exc_type in ["ValidationError", "ValueError"])
    
    def _is_authentication_error(self, message: str, exc_type: str) -> bool:
        """Check if exception is an authentication error."""
        return ("authentication" in message.lower() or 
                "login" in message.lower() or
                "credential" in message.lower())
    
    def _is_authorization_error(self, message: str, exc_type: str) -> bool:
        """Check if exception is an authorization error."""
        return ("authorization" in message.lower() or 
                "permission" in message.lower() or
                "access denied" in message.lower())
    
    def _is_not_found_error(self, message: str, exc_type: str) -> bool:
        """Check if exception is a not found error."""
        return ("not found" in message.lower() or 
                exc_type == "DoesNotExist" or
                "does not exist" in message.lower())
    
    def _is_conflict_error(self, message: str, exc_type: str) -> bool:
        """Check if exception is a conflict error."""
        return ("conflict" in message.lower() or 
                "duplicate" in message.lower() or
                "already exists" in message.lower())
    
    def _is_rate_limit_error(self, message: str, exc_type: str) -> bool:
        """Check if exception is a rate limit error."""
        return ("rate limit" in message.lower() or 
                "too many requests" in message.lower() or
                "throttle" in message.lower())
    
    def _is_database_error(self, message: str, exc_type: str) -> bool:
        """Check if exception is a database error."""
        return ("database" in message.lower() or 
                "connection" in message.lower() or
                "sql" in message.lower() or
                exc_type.startswith("SQL"))
    
    def _is_external_service_error(self, message: str, exc_type: str) -> bool:
        """Check if exception is an external service error."""
        return ("external" in message.lower() or 
                "service" in message.lower() or
                "api" in message.lower() or
                "http" in message.lower())


# Global classifier instance
exception_classifier = ExceptionClassifier()