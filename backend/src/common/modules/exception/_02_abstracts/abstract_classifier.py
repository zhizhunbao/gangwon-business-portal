"""Abstract exception classifier.

Provides common classification logic that can be reused by concrete implementations.
"""
from abc import abstractmethod
from typing import List

from .._01_contracts.i_exception import IException
from .._01_contracts.i_exception_classifier import IExceptionClassifier


class AbstractExceptionClassifier(IExceptionClassifier):
    """Abstract base class for exception classifiers.
    
    Provides common classification logic that can be reused by concrete implementations.
    Subclasses must implement the classify() method.
    """
    
    # Keywords for classification
    VALIDATION_KEYWORDS = ["validation", "invalid", "format", "required"]
    AUTH_KEYWORDS = ["authentication", "login", "credential", "token"]
    AUTHZ_KEYWORDS = ["authorization", "permission", "access denied", "forbidden"]
    NOT_FOUND_KEYWORDS = ["not found", "does not exist", "missing"]
    CONFLICT_KEYWORDS = ["conflict", "duplicate", "already exists"]
    RATE_LIMIT_KEYWORDS = ["rate limit", "too many requests", "throttle"]
    DATABASE_KEYWORDS = ["database", "connection", "sql", "query"]
    EXTERNAL_KEYWORDS = ["external", "service", "api", "http", "timeout"]
    
    @abstractmethod
    def classify(self, exception: Exception) -> IException:
        """Classify an exception into the appropriate custom exception type."""
        pass
    
    def _matches_keywords(self, message: str, keywords: List[str]) -> bool:
        """Check if message contains any of the keywords.
        
        Args:
            message: The message to check
            keywords: List of keywords to match
            
        Returns:
            True if any keyword is found in the message
        """
        message_lower = message.lower()
        return any(kw in message_lower for kw in keywords)
    
    def _is_validation_error(self, message: str, exc_type: str) -> bool:
        """Check if exception is a validation error."""
        return (self._matches_keywords(message, self.VALIDATION_KEYWORDS) or
                exc_type in ["ValidationError", "ValueError"])
    
    def _is_authentication_error(self, message: str, exc_type: str) -> bool:
        """Check if exception is an authentication error."""
        return self._matches_keywords(message, self.AUTH_KEYWORDS)
    
    def _is_authorization_error(self, message: str, exc_type: str) -> bool:
        """Check if exception is an authorization error."""
        return self._matches_keywords(message, self.AUTHZ_KEYWORDS)
    
    def _is_not_found_error(self, message: str, exc_type: str) -> bool:
        """Check if exception is a not found error."""
        return (self._matches_keywords(message, self.NOT_FOUND_KEYWORDS) or
                exc_type == "DoesNotExist")
    
    def _is_conflict_error(self, message: str, exc_type: str) -> bool:
        """Check if exception is a conflict error."""
        return self._matches_keywords(message, self.CONFLICT_KEYWORDS)
    
    def _is_rate_limit_error(self, message: str, exc_type: str) -> bool:
        """Check if exception is a rate limit error."""
        return self._matches_keywords(message, self.RATE_LIMIT_KEYWORDS)
    
    def _is_database_error(self, message: str, exc_type: str) -> bool:
        """Check if exception is a database error."""
        return (self._matches_keywords(message, self.DATABASE_KEYWORDS) or
                exc_type.startswith("SQL"))
    
    def _is_external_service_error(self, message: str, exc_type: str) -> bool:
        """Check if exception is an external service error."""
        return self._matches_keywords(message, self.EXTERNAL_KEYWORDS)
