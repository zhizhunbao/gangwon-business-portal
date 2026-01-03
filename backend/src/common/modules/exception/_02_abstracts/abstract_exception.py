"""Abstract base class for custom exceptions.

This module defines the abstract base exception class that all custom
exceptions must inherit from.
"""
from typing import Optional, Dict, Any

from .._01_contracts import EExceptionType, ICustomException


class AbstractCustomException(Exception, ICustomException):
    """Abstract base class for all custom exceptions in the system.
    
    Provides common implementation for exception handling while requiring
    subclasses to define their specific behavior.
    """
    
    def __init__(
        self,
        message: str,
        context: Optional[Dict[str, Any]] = None,
        original_exception: Optional[Exception] = None
    ):
        super().__init__(message)
        self._message = message
        self._context = context or {}
        self._original_exception = original_exception
    
    @property
    def message(self) -> str:
        return self._message
    
    @property
    def context(self) -> Dict[str, Any]:
        return self._context
    
    @property
    def original_exception(self) -> Optional[Exception]:
        return self._original_exception
    
    @property
    def http_status_code(self) -> int:
        """Default to 500 Internal Server Error."""
        return 500
    
    @property
    def exception_type(self) -> EExceptionType:
        """Default to INTERNAL_ERROR."""
        return EExceptionType.INTERNAL_ERROR
    
    @property
    def error_code(self) -> str:
        """Return the exception type value as error code."""
        return self.exception_type.value
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert the exception to a dictionary representation."""
        code = self._context.get("error_code") or self.error_code
        if hasattr(code, 'value'):
            code = code.value
            
        result = {
            "type": self.exception_type.value,
            "message": self._message,
            "code": code,
        }
        other_context = {k: v for k, v in self._context.items() if k != "error_code"}
        if other_context:
            result["context"] = other_context
        return result
