"""
Exception monitoring and alerting system.

This module is responsible solely for monitoring exception patterns,
maintaining statistics, and triggering alerts based on thresholds.
"""
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any
from dataclasses import dataclass

from ..logger import logging_service
from .recorder import ExceptionRecord


@dataclass
class ExceptionStats:
    """Exception statistics for monitoring."""
    total_count: int
    error_count: int
    critical_count: int
    by_type: Dict[str, int]
    by_hour: Dict[str, int]
    top_errors: List[Dict[str, Any]]


class ExceptionMonitor:
    """Service for monitoring exception patterns and triggering alerts."""
    
    def __init__(self):
        """Initialize the exception monitor."""
        self._exception_counts = {}
        self._critical_threshold = 10  # Alert after 10 critical exceptions per hour
        self._error_threshold = 100    # Alert after 100 errors per hour
    
    def update_stats(self, record: ExceptionRecord) -> None:
        """
        Update exception statistics for monitoring.
        
        Args:
            record: The exception record to include in statistics
        """
        # Update counters
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
    
    async def check_alerts(self, record: ExceptionRecord) -> None:
        """
        Check if alerts should be triggered based on exception patterns.
        
        Args:
            record: The exception record to check for alert conditions
        """
        hour_key = record.created_at.strftime("%Y-%m-%d-%H")
        stats = self._exception_counts.get(hour_key, {})
        
        # Check critical exception threshold
        if record.level == 'CRITICAL' and stats.get('critical', 0) >= self._critical_threshold:
            await self._trigger_alert(
                "Critical Exception Threshold Exceeded",
                f"Critical exceptions in the last hour: {stats['critical']}"
            )
        
        # Check error exception threshold
        if stats.get('error', 0) >= self._error_threshold:
            await self._trigger_alert(
                "Error Exception Threshold Exceeded",
                f"Error exceptions in the last hour: {stats['error']}"
            )
    
    async def _trigger_alert(self, title: str, message: str) -> None:
        """
        Trigger an alert for exception monitoring.
        
        Args:
            title: Alert title
            message: Alert message
        """
        try:
            # Log the alert
            await logging_service.log(
                source="backend",
                level="CRITICAL",
                layer="Exception",
                message=f"ALERT: {title} - {message}",
                extra_data={"alert_type": "exception_threshold"}
            )
            
            # TODO: Integrate with external alerting system (email, Slack, etc.)
            # For now, just log the alert
            
        except Exception as e:
            import logging
            logging.error(f"Failed to trigger alert: {e}", exc_info=True)
    
    def get_stats(self, hours: int = 24) -> ExceptionStats:
        """
        Get exception statistics for the specified number of hours.
        
        Args:
            hours: Number of hours to include in statistics
        
        Returns:
            ExceptionStats: Aggregated statistics
        """
        now = datetime.now(timezone.utc)
        total_count = 0
        error_count = 0
        critical_count = 0
        by_type = {}
        by_hour = {}
        
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
        
        return ExceptionStats(
            total_count=total_count,
            error_count=error_count,
            critical_count=critical_count,
            by_type=by_type,
            by_hour=by_hour,
            top_errors=top_errors
        )
    
    def set_thresholds(self, critical_threshold: int = None, error_threshold: int = None):
        """
        Set alert thresholds.
        
        Args:
            critical_threshold: Number of critical exceptions per hour to trigger alert
            error_threshold: Number of error exceptions per hour to trigger alert
        """
        if critical_threshold is not None:
            self._critical_threshold = critical_threshold
        if error_threshold is not None:
            self._error_threshold = error_threshold


# Global monitor instance
exception_monitor = ExceptionMonitor()