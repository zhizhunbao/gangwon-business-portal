"""Exception interface.

Defines the contract for all custom exceptions.
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional


class IException(ABC):
    """Interface for custom exceptions.
    
    All custom exceptions must implement these properties and methods
    for consistent exception handling across the application.
    """
    
    message: str
    context: Dict[str, Any]
    original_exception: Optional[Exception]
    
    @property
    @abstractmethod
    def http_status_code(self) -> int:
        """Return the HTTP status code for this exception type."""
        pass
    
    @property
    @abstractmethod
    def exception_type(self) -> Any:
        """Return the exception type enum for this exception."""
        pass
    
    @property
    @abstractmethod
    def error_code(self) -> str:
        """Return a machine-readable error code."""
        pass
    
    @abstractmethod
    def to_dict(self) -> Dict[str, Any]:
        """Convert exception to dictionary for API responses."""
        pass
