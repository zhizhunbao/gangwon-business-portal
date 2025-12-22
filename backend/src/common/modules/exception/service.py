"""
Exception service for coordinating exception handling operations.

This module provides a unified interface for exception handling by
coordinating the classifier, recorder, and monitor services.
"""
from typing import Optional, Union, List, Dict, Any
from uuid import UUID
from datetime import datetime

from .exceptions import BaseCustomException
from .classifier import exception_classifier
from .recorder import exception_recorder, ExceptionContext, ExceptionRecord
from .monitor import exception_monitor, ExceptionStats


class ExceptionService:
    """
    Unified service for exception handling coordination.
    
    This service coordinates between the classifier, recorder, and monitor
    to provide a single interface for exception handling operations.
    """
    
    def __init__(self):
        """Initialize the exception service."""
        self._classifier = exception_classifier
        self._recorder = exception_recorder
        self._monitor = exception_monitor
    
    async def record_exception(
        self,
        exception: Union[Exception, BaseCustomException],
        context: Optional[ExceptionContext] = None,
        source: str = "backend"
    ) -> ExceptionRecord:
        """
        Record an exception with full context information.
        
        This method coordinates the full exception handling process:
        1. Records the exception via the recorder
        2. Updates monitoring statistics
        3. Checks for alert conditions
        
        Args:
            exception: The exception to record
            context: Additional context information
            source: Source of the exception ("frontend" or "backend")
        
        Returns:
            ExceptionRecord: The recorded exception data
        """
        # Record the exception
        record = await self._recorder.record(exception, context, source)
        
        # Update monitoring statistics
        self._monitor.update_stats(record)
        
        # Check for alerts
        await self._monitor.check_alerts(record)
        
        return record
    
    def classify_exception(self, exception: Exception) -> BaseCustomException:
        """
        Classify an exception into the appropriate custom exception type.
        
        Args:
            exception: The exception to classify
        
        Returns:
            BaseCustomException: The classified exception
        """
        return self._classifier.classify(exception)
    
    def get_stats(self, hours: int = 24) -> ExceptionStats:
        """
        Get exception statistics for the specified number of hours.
        
        Args:
            hours: Number of hours to include in statistics
        
        Returns:
            ExceptionStats: Aggregated statistics
        """
        return self._monitor.get_stats(hours)
    
    def set_alert_thresholds(self, critical_threshold: int = None, error_threshold: int = None):
        """
        Set alert thresholds for exception monitoring.
        
        Args:
            critical_threshold: Number of critical exceptions per hour to trigger alert
            error_threshold: Number of error exceptions per hour to trigger alert
        """
        self._monitor.set_thresholds(critical_threshold, error_threshold)
    
    async def create_exception(
        self,
        source: str,
        exception_type: str,
        exception_message: str,
        error_code: Optional[str] = None,
        status_code: Optional[int] = None,
        trace_id: Optional[str] = None,
        user_id: Optional[UUID] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        request_method: Optional[str] = None,
        request_path: Optional[str] = None,
        request_data: Optional[Dict[str, Any]] = None,
        stack_trace: Optional[str] = None,
        exception_details: Optional[Dict[str, Any]] = None,
        context_data: Optional[Dict[str, Any]] = None,
    ) -> ExceptionRecord:
        """
        Create an exception record directly (for API endpoints).
        
        Args:
            source: Source of the exception ("frontend" or "backend")
            exception_type: Type of the exception
            exception_message: Exception message
            error_code: Optional error code
            status_code: Optional HTTP status code
            trace_id: Optional trace ID
            user_id: Optional user ID
            ip_address: Optional IP address
            user_agent: Optional user agent
            request_method: Optional request method
            request_path: Optional request path
            request_data: Optional request data
            stack_trace: Optional stack trace
            exception_details: Optional exception details
            context_data: Optional context data
        
        Returns:
            ExceptionRecord: The created exception record
        """
        # Create exception context
        context = ExceptionContext(
            trace_id=UUID(trace_id) if trace_id else None,
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
        
        # Create a mock exception object
        class MockException(Exception):
            def __init__(self, message: str, exc_type: str):
                super().__init__(message)
                self.name = exc_type
                self.__class__.__name__ = exc_type
        
        mock_exception = MockException(exception_message, exception_type)
        
        # Record the exception
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