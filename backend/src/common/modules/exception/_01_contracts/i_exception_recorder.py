"""Exception recorder interface.

Defines the contract for exception recording.
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, Union

from .i_exception import IException
from .d_exception_record import DExceptionRecord
from .d_exception_context import DExceptionContext


class IExceptionRecorder(ABC):
    """Interface for exception recording."""
    
    @abstractmethod
    async def record(
        self,
        exception: Union[Exception, IException],
        context: Optional[DExceptionContext] = None,
        source: str = "backend"
    ) -> DExceptionRecord:
        """Record an exception with full context information."""
        pass
    
    @abstractmethod
    async def record_direct(
        self,
        exception: Union[Exception, IException],
        context: Optional[DExceptionContext] = None,
        source: str = "backend",
        error_code: Optional[str] = None,
        status_code: Optional[int] = None,
        stack_trace: Optional[str] = None,
        exception_details: Optional[Dict[str, Any]] = None
    ) -> DExceptionRecord:
        """Record an exception directly with provided parameters."""
        pass
