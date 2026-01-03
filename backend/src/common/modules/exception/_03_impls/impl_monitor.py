"""Exception monitor implementation.

Concrete implementation of exception monitoring and alerting.
"""
from .._02_abstracts import AbstractExceptionMonitor
from .._01_contracts import DExceptionRecord, DExceptionStats
from ...logger import logging_service


class ExceptionMonitor(AbstractExceptionMonitor):
    """Service for monitoring exception patterns and triggering alerts."""
    
    def __init__(self):
        """Initialize the exception monitor."""
        super().__init__()
    
    async def check_alerts(self, record: DExceptionRecord) -> None:
        """Check if alerts should be triggered based on exception patterns."""
        hour_key = record.created_at.strftime("%Y-%m-%d-%H")
        stats = self._exception_counts.get(hour_key, {})
        
        if record.level == 'CRITICAL' and stats.get('critical', 0) >= self._critical_threshold:
            await self._trigger_alert(
                "Critical Exception Threshold Exceeded",
                f"Critical exceptions in the last hour: {stats['critical']}"
            )
        
        if stats.get('error', 0) >= self._error_threshold:
            await self._trigger_alert(
                "Error Exception Threshold Exceeded",
                f"Error exceptions in the last hour: {stats['error']}"
            )
    
    async def _trigger_alert(self, title: str, message: str) -> None:
        """Trigger an alert for exception monitoring."""
        try:
            await logging_service.log(
                source="backend",
                level="CRITICAL",
                layer="Exception",
                message=f"ALERT: {title} - {message}",
                extra_data={"alert_type": "exception_threshold"}
            )
            
            # TODO: Integrate with external alerting system (email, Slack, etc.)
            
        except Exception as e:
            import logging
            logging.error(f"Failed to trigger alert: {e}", exc_info=True)
    
    def get_stats(self, hours: int = 24) -> DExceptionStats:
        """Get exception statistics for the specified number of hours."""
        base_stats = super().get_stats(hours)
        
        return DExceptionStats(
            total_count=base_stats.total_count,
            error_count=base_stats.error_count,
            critical_count=base_stats.critical_count,
            by_type=base_stats.by_type,
            by_hour=base_stats.by_hour,
            top_errors=base_stats.top_errors
        )


# Global monitor instance
exception_monitor = ExceptionMonitor()
