"""Abstract exception monitor.

Provides common monitoring logic that can be reused by concrete implementations.
"""
from abc import abstractmethod
from typing import Dict, Any, Optional
from datetime import datetime, timezone, timedelta

from .._01_contracts.i_exception_monitor import IExceptionMonitor
from .._01_contracts.d_exception_record import DExceptionRecord
from .._01_contracts.d_exception_stats import DExceptionStats


class AbstractExceptionMonitor(IExceptionMonitor):
    """Abstract base class for exception monitors.
    
    Provides common monitoring logic that can be reused by concrete implementations.
    """
    
    # Default thresholds
    DEFAULT_CRITICAL_THRESHOLD = 10  # Alert after 10 critical exceptions per hour
    DEFAULT_ERROR_THRESHOLD = 100    # Alert after 100 errors per hour
    
    def __init__(self):
        """Initialize abstract exception monitor."""
        self._exception_counts: Dict[str, Dict[str, Any]] = {}
        self._critical_threshold = self.DEFAULT_CRITICAL_THRESHOLD
        self._error_threshold = self.DEFAULT_ERROR_THRESHOLD
    
    def update_stats(self, record: DExceptionRecord) -> None:
        """Update exception statistics for monitoring.
        
        Args:
            record: The exception record to include in statistics
        """
        hour_key = record.created_at.strftime("%Y-%m-%d-%H")
        
        if hour_key not in self._exception_counts:
            self._exception_counts[hour_key] = {
                'total': 0,
                'error': 0,
                'critical': 0,
                'by_type': {}
            }
        
        stats = self._exception_counts[hour_key]
        stats['total'] += 1
        
        if record.level == 'ERROR':
            stats['error'] += 1
        elif record.level == 'CRITICAL':
            stats['critical'] += 1
        
        if record.exception_type not in stats['by_type']:
            stats['by_type'][record.exception_type] = 0
        stats['by_type'][record.exception_type] += 1
    
    @abstractmethod
    async def check_alerts(self, record: DExceptionRecord) -> None:
        """Check if alerts should be triggered based on exception patterns."""
        pass
    
    @abstractmethod
    async def _trigger_alert(self, title: str, message: str) -> None:
        """Trigger an alert for exception monitoring.
        
        Args:
            title: Alert title
            message: Alert message
        """
        pass
    
    def get_stats(self, hours: int = 24) -> DExceptionStats:
        """Get exception statistics for the specified number of hours.
        
        Args:
            hours: Number of hours to include in statistics
        
        Returns:
            Aggregated statistics
        """
        now = datetime.now(timezone.utc)
        total_count = 0
        error_count = 0
        critical_count = 0
        by_type: Dict[str, int] = {}
        by_hour: Dict[str, int] = {}
        
        for i in range(hours):
            hour = now.replace(minute=0, second=0, microsecond=0) - timedelta(hours=i)
            hour_key = hour.strftime("%Y-%m-%d-%H")
            
            if hour_key in self._exception_counts:
                stats = self._exception_counts[hour_key]
                total_count += stats['total']
                error_count += stats['error']
                critical_count += stats['critical']
                by_hour[hour_key] = stats['total']
                
                for exc_type, count in stats['by_type'].items():
                    by_type[exc_type] = by_type.get(exc_type, 0) + count
            else:
                by_hour[hour_key] = 0
        
        # Get top errors
        top_errors = sorted(
            [{'type': k, 'count': v} for k, v in by_type.items()],
            key=lambda x: x['count'],
            reverse=True
        )[:10]
        
        return DExceptionStats(
            total_count=total_count,
            error_count=error_count,
            critical_count=critical_count,
            by_type=by_type,
            by_hour=by_hour,
            top_errors=top_errors
        )
    
    def set_thresholds(
        self,
        critical_threshold: Optional[int] = None,
        error_threshold: Optional[int] = None
    ) -> None:
        """Set alert thresholds.
        
        Args:
            critical_threshold: Number of critical exceptions per hour to trigger alert
            error_threshold: Number of error exceptions per hour to trigger alert
        """
        if critical_threshold is not None:
            self._critical_threshold = critical_threshold
        if error_threshold is not None:
            self._error_threshold = error_threshold
    
    def _should_alert_critical(self, hour_key: str) -> bool:
        """Check if critical alert threshold is exceeded.
        
        Args:
            hour_key: The hour key to check
            
        Returns:
            True if threshold exceeded
        """
        stats = self._exception_counts.get(hour_key, {})
        return stats.get('critical', 0) >= self._critical_threshold
    
    def _should_alert_error(self, hour_key: str) -> bool:
        """Check if error alert threshold is exceeded.
        
        Args:
            hour_key: The hour key to check
            
        Returns:
            True if threshold exceeded
        """
        stats = self._exception_counts.get(hour_key, {})
        return stats.get('error', 0) >= self._error_threshold
