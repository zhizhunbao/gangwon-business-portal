"""
Exception handling module.

This module provides a comprehensive exception handling system with automatic
classification, context collection, and integration with the logging system.

Structure:
- _01_contracts/  - Interfaces (Protocol/ABC) and Data contracts
- _02_abstracts/  - Abstract base classes (ABC)
- _03_impls/      - Concrete implementations
- _04_services/   - Service layer (unified entry point)
- _05_dtos/       - Data transfer objects (Pydantic models)
- _06_models/     - Database models (placeholder)
- _07_router/     - API routes
- _08_utils/      - Utilities (codes, handlers)

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

# _01_contracts - Interfaces and Data contracts
from ._01_contracts import (
    # Interfaces
    IException,
    IExceptionClassifier,
    IExceptionRecorder,
    IExceptionMonitor,
    IExceptionService,
    ILayerRule,
    ICustomException,
    # Repository interfaces
    IExceptionRepository,
    # Enums
    EExceptionType,
    EExceptionLevel,
    EExceptionSource,
    EExceptionLayer,
    # Constants
    CExceptionField,
    CMessageTemplate,
    CFieldFormat,
    CSensitiveField,
    # Data contracts
    DExceptionContext,
    DExceptionRecord,
    DExceptionStats,
)

# _02_abstracts - Abstract base classes
from ._02_abstracts import (
    AbstractExceptionClassifier,
    AbstractExceptionRecorder,
    AbstractExceptionMonitor,
    AbstractLayerRule,
    AbstractCustomException,
)

# _03_impls - Implementations
from ._03_impls import (
    # Classifier
    ExceptionClassifier,
    exception_classifier,
    # Recorder
    ExceptionRecorder,
    exception_recorder,
    file_path_to_module,
    # Monitor
    ExceptionMonitor,
    exception_monitor,
    # Layer Rule
    LayerRule,
    layer_rule,
    # Custom Exceptions
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ConflictError,
    RateLimitError,
    DatabaseError,
    ExternalServiceError,
    InternalError,
    EXCEPTION_TYPE_MAP,
    create_exception_from_type,
    set_layer_rule,
    get_layer_rule,
)

# Initialize layer rule for exception checking
set_layer_rule(layer_rule)

# _04_services - Service layer
from ._04_services import (
    ExceptionService,
    exception_service,
)

# _05_dtos - Data transfer objects
from ._05_dtos import (
    FrontendExceptionCreate,
    FrontendExceptionBatch,
    FrontendExceptionBatchResponse,
)

# _08_utils - Utilities
from ._08_utils import (
    ErrorCode,
    global_exception_handler,
    custom_exception_handler,
    validation_exception_handler,
    http_exception_handler,
    database_exception_handler,
    register_exception_handlers,
    create_error_response,
    is_client_error,
    is_server_error,
    should_log_stack_trace,
    # Message Helpers
    format_not_found_message,
    format_validation_message,
    format_db_error_message,
    format_external_service_message,
    format_auth_user_not_found,
    format_auth_user_inactive,
    format_status_transition_error,
    format_permission_required,
    format_no_permission,
    format_invalid_value,
    format_required_field,
    format_file_size_error,
    format_file_extension_error,
    format_operation_failed,
)

# Middleware from interceptor module
from ..interceptor.error import (
    ExceptionMiddleware,
    add_exception_middleware,
)


def create_exception_middleware(debug: bool = False):
    """创建异常中间件"""
    return ExceptionMiddleware(None, debug=debug)


__all__ = [
    # Interfaces
    "IException",
    "IExceptionClassifier",
    "IExceptionRecorder",
    "IExceptionMonitor",
    "IExceptionService",
    "ILayerRule",
    "ICustomException",
    
    # Repository interfaces
    "IExceptionRepository",
    
    # Enums
    "EExceptionType",
    "EExceptionLevel",
    "EExceptionSource",
    "EExceptionLayer",
    
    # Constants
    "CExceptionField",
    "CMessageTemplate",
    "CFieldFormat",
    "CSensitiveField",
    
    # Data contracts
    "DExceptionContext",
    "DExceptionRecord",
    "DExceptionStats",
    
    # Abstract base classes
    "AbstractExceptionClassifier",
    "AbstractExceptionRecorder",
    "AbstractExceptionMonitor",
    "AbstractLayerRule",
    "AbstractCustomException",
    
    # Implementations
    "ExceptionClassifier",
    "exception_classifier",
    "ExceptionRecorder",
    "exception_recorder",
    "file_path_to_module",
    "ExceptionMonitor",
    "exception_monitor",
    "LayerRule",
    "layer_rule",
    
    # Service
    "ExceptionService",
    "exception_service",
    
    # Exception types
    "ValidationError",
    "AuthenticationError",
    "AuthorizationError",
    "NotFoundError",
    "ConflictError",
    "RateLimitError",
    "DatabaseError",
    "ExternalServiceError",
    "InternalError",
    "EXCEPTION_TYPE_MAP",
    "create_exception_from_type",
    "set_layer_rule",
    "get_layer_rule",
    
    # DTOs
    "FrontendExceptionCreate",
    "FrontendExceptionBatch",
    "FrontendExceptionBatchResponse",
    
    # Error Codes
    "ErrorCode",
    
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
    
    # Message Helpers
    "format_not_found_message",
    "format_validation_message",
    "format_db_error_message",
    "format_external_service_message",
    "format_auth_user_not_found",
    "format_auth_user_inactive",
    "format_status_transition_error",
    "format_permission_required",
    "format_no_permission",
    "format_invalid_value",
    "format_required_field",
    "format_file_size_error",
    "format_file_extension_error",
    "format_operation_failed",
    
    # Middleware
    "ExceptionMiddleware",
    "create_exception_middleware",
    "add_exception_middleware",
]
