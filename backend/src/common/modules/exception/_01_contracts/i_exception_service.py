"""Exception service interface.

Defines the contract for the unified exception service.
"""
from abc import ABC, abstractmethod
from typing import Optional, Union

from .i_exception import IException
from .d_exception_record import DExceptionRecord
from .d_exception_stats import DExceptionStats
from .d_exception_context import DExceptionContext


class IExceptionService(ABC):
    """Interface for the unified exception service."""
    
    @abstractmethod
    async def record_exception(
        self,
        exception: Union[Exception, IException],
        context: Optional[DExceptionContext] = None,
        source: str = "backend"
    ) -> DExceptionRecord:
        """Record an exception with full context information."""
        pass
    
    @abstractmethod
    def classify_exception(self, exception: Exception) -> IException:
        """Classify an exception into the appropriate custom exception type."""
        pass
    
    @abstractmethod
    def get_stats(self, hours: int = 24) -> DExceptionStats:
        """Get exception statistics for the specified number of hours."""
        pass
    
    @abstractmethod
    def set_alert_thresholds(
        self,
        critical_threshold: Optional[int] = None,
        error_threshold: Optional[int] = None
    ) -> None:
        """Set alert thresholds for exception monitoring."""
        pass
