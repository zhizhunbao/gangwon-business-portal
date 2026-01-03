"""Exception interface contract."""
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any

from .e_exception_type import EExceptionType


class ICustomException(ABC):
    """Interface for all custom exceptions in the system."""
    
    @property
    @abstractmethod
    def message(self) -> str:
        """The error message."""
        ...
    
    @property
    @abstractmethod
    def context(self) -> Dict[str, Any]:
        """Additional context information."""
        ...
    
    @property
    @abstractmethod
    def original_exception(self) -> Optional[Exception]:
        """The original exception that caused this exception."""
        ...
    
    @property
    @abstractmethod
    def http_status_code(self) -> int:
        """The HTTP status code."""
        ...
    
    @property
    @abstractmethod
    def exception_type(self) -> EExceptionType:
        """The type of this exception."""
        ...
    
    @property
    @abstractmethod
    def error_code(self) -> str:
        """The error code."""
        ...
    
    @abstractmethod
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        ...
