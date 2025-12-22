"""
Exception handling module.

This module provides a comprehensive exception handling system with automatic
classification, context collection, and integration with the logging system.

Usage:
    from common.modules.exception import (
        ValidationError,
        AuthenticationError,
        NotFoundError,
        ExceptionService,
        exception_service
    )
    
    # Raise custom exceptions
    raise ValidationError("Invalid email format", field_errors={"email": "Invalid format"})
    
    # Use exception service
    await exception_service.record_exception(exc, context)
"""

from .exceptions import (
    # Base exception
    BaseCustomException,
    AppException,
    
    # Exception types enum
    ExceptionType,
    
    # Specific exception classes
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ConflictError,
    RateLimitError,
    DatabaseError,
    ExternalServiceError,
    InternalError,
    
    # Utility functions
    EXCEPTION_TYPE_MAP,
    create_exception_from_type,
)

from .service import (
    # Service class and instance
    ExceptionService,
    exception_service,
)

from .classifier import (
    # Classifier
    ExceptionClassifier,
    exception_classifier,
)

from .recorder import (
    # Data models
    ExceptionRecord,
    ExceptionContext,
    
    # Recorder
    ExceptionRecorder,
    exception_recorder,
)

from .monitor import (
    # Monitor and stats
    ExceptionStats,
    ExceptionMonitor,
    exception_monitor,
)

from .handlers import (
    # Exception handlers
    global_exception_handler,
    custom_exception_handler,
    validation_exception_handler,
    http_exception_handler,
    database_exception_handler,
    register_exception_handlers,
    
    # Utilities
    create_error_response,
    is_client_error,
    is_server_error,
    should_log_stack_trace,
)

from .middleware import (
    # Middleware
    ExceptionMiddleware,
    create_exception_middleware,
    add_exception_middleware,
)

__all__ = [
    # Base
    "BaseCustomException",
    "AppException",
    "ExceptionType",
    
    # Exception classes
    "ValidationError",
    "AuthenticationError", 
    "AuthorizationError",
    "NotFoundError",
    "ConflictError",
    "RateLimitError",
    "DatabaseError",
    "ExternalServiceError",
    "InternalError",
    
    # Utilities
    "EXCEPTION_TYPE_MAP",
    "create_exception_from_type",
    
    # Service
    "ExceptionService",
    "exception_service",
    
    # Classifier
    "ExceptionClassifier",
    "exception_classifier",
    
    # Recorder
    "ExceptionRecord",
    "ExceptionContext", 
    "ExceptionRecorder",
    "exception_recorder",
    
    # Monitor
    "ExceptionStats",
    "ExceptionMonitor",
    "exception_monitor",
    
    # Handlers
    "global_exception_handler",
    "custom_exception_handler",
    "validation_exception_handler",
    "http_exception_handler",
    "database_exception_handler",
    "register_exception_handlers",
    "create_error_response",
    "is_client_error",
    "is_server_error",
    "should_log_stack_trace",
    
    # Middleware
    "ExceptionMiddleware",
    "create_exception_middleware",
    "add_exception_middleware",
]