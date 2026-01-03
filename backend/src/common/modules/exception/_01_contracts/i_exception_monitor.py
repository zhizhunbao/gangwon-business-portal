"""Exception monitor interface.

Defines the contract for exception monitoring and alerting.
"""
from abc import ABC, abstractmethod
from typing import Optional

from .d_exception_record import DExceptionRecord
from .d_exception_stats import DExceptionStats


class IExceptionMonitor(ABC):
    """Interface for exception monitoring and alerting."""
    
    @abstractmethod
    def update_stats(self, record: DExceptionRecord) -> None:
        """Update exception statistics for monitoring."""
        pass
    
    @abstractmethod
    async def check_alerts(self, record: DExceptionRecord) -> None:
        """Check if alerts should be triggered based on exception patterns."""
        pass
    
    @abstractmethod
    def get_stats(self, hours: int = 24) -> DExceptionStats:
        """Get exception statistics for the specified number of hours."""
        pass
    
    @abstractmethod
    def set_thresholds(
        self,
        critical_threshold: Optional[int] = None,
        error_threshold: Optional[int] = None
    ) -> None:
        """Set alert thresholds."""
        pass
