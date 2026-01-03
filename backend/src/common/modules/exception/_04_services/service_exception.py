"""Exception service for coordinating exception handling operations.

This module provides a unified interface for exception handling by
coordinating the classifier, recorder, and monitor services.
"""
from typing import Optional, Union, Dict, Any
from uuid import UUID

from .._01_contracts import (
    DExceptionContext,
    DExceptionRecord,
    DExceptionStats,
    IExceptionClassifier,
    IExceptionRecorder,
    IExceptionMonitor,
    IExceptionService,
    IException,
)
from .._03_impls import (
    exception_classifier,
    exception_recorder,
    exception_monitor,
    AbstractCustomException,
)


class ExceptionService(IExceptionService):
    """
    Unified service for exception handling coordination.
    
    This service coordinates between the classifier, recorder, and monitor
    to provide a single interface for exception handling operations.
    
    Follows Dependency Inversion Principle - depends on abstractions (interfaces),
    with concrete implementations injected via constructor.
    """
    
    def __init__(
        self,
        classifier: Optional[IExceptionClassifier] = None,
        recorder: Optional[IExceptionRecorder] = None,
        monitor: Optional[IExceptionMonitor] = None,
    ):
        """Initialize the exception service with optional dependency injection.
        
        Args:
            classifier: Exception classifier implementation (defaults to global instance)
            recorder: Exception recorder implementation (defaults to global instance)
            monitor: Exception monitor implementation (defaults to global instance)
        """
        self._classifier = classifier or exception_classifier
        self._recorder = recorder or exception_recorder
        self._monitor = monitor or exception_monitor
    
    async def record_exception(
        self,
        exception: Union[Exception, IException],
        context: Optional[DExceptionContext] = None,
        source: str = "backend"
    ) -> DExceptionRecord:
        """
        Record an exception with full context information.
        
        This method coordinates the full exception handling process:
        1. Records the exception via the recorder
        2. Updates monitoring statistics
        3. Checks for alert conditions
        """
        record = await self._recorder.record(exception, context, source)
        self._monitor.update_stats(record)
        await self._monitor.check_alerts(record)
        return record
    
    def classify_exception(self, exception: Exception) -> IException:
        """Classify an exception into the appropriate custom exception type."""
        return self._classifier.classify(exception)
    
    def get_stats(self, hours: int = 24) -> DExceptionStats:
        """Get exception statistics for the specified number of hours."""
        return self._monitor.get_stats(hours)
    
    def set_alert_thresholds(
        self, 
        critical_threshold: Optional[int] = None, 
        error_threshold: Optional[int] = None
    ) -> None:
        """Set alert thresholds for exception monitoring."""
        self._monitor.set_thresholds(critical_threshold, error_threshold)
    
    async def create_exception(
        self,
        source: str,
        exception_type: str,
        exception_message: str,
        error_code: Optional[str] = None,
        status_code: Optional[int] = None,
        trace_id: Optional[str] = None,
        request_id: Optional[str] = None,
        user_id: Optional[UUID] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        request_method: Optional[str] = None,
        request_path: Optional[str] = None,
        request_data: Optional[Dict[str, Any]] = None,
        stack_trace: Optional[str] = None,
        exception_details: Optional[Dict[str, Any]] = None,
        context_data: Optional[Dict[str, Any]] = None,
    ) -> DExceptionRecord:
        """Create an exception record directly (for API endpoints)."""
        context = DExceptionContext(
            trace_id=UUID(trace_id) if trace_id else None,
            request_id=request_id,
            user_id=user_id,
            additional_data={
                'ip_address': ip_address,
                'user_agent': user_agent,
                'request_method': request_method,
                'request_path': request_path,
                'request_data': request_data,
                **(context_data or {})
            }
        )
        
        class MockException(Exception):
            def __init__(self, message: str, exc_type: str):
                super().__init__(message)
                self.name = exc_type
                self.__class__.__name__ = exc_type
        
        mock_exception = MockException(exception_message, exception_type)
        
        return await self._recorder.record_direct(
            exception=mock_exception,
            context=context,
            source=source,
            error_code=error_code,
            status_code=status_code,
            stack_trace=stack_trace,
            exception_details=exception_details
        )


# Global exception service instance
exception_service = ExceptionService()
