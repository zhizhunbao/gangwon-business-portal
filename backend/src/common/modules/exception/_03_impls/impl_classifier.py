"""Exception classifier implementation.

Concrete implementation of exception classification.
"""
from .._02_abstracts import AbstractExceptionClassifier, AbstractCustomException
from .impl_custom_exception import (
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


class ExceptionClassifier(AbstractExceptionClassifier):
    """Service for classifying exceptions into appropriate custom exception types."""
    
    def classify(self, exception: Exception) -> AbstractCustomException:
        """
        Classify an exception into the appropriate custom exception type.
        
        Args:
            exception: The exception to classify
        
        Returns:
            AbstractCustomException: The classified exception
        """
        if isinstance(exception, AbstractCustomException):
            return exception
        
        exc_type = type(exception).__name__
        exc_message = str(exception)
        
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
            return InternalError(exc_message, original_exception=exception)


# Global classifier instance
exception_classifier = ExceptionClassifier()
