"""Exception handling utilities.

Contains error codes, handlers, and message formatting helpers.
"""
from .code_error import ErrorCode, ErrorInfo
from .handler_exception import (
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
)
from .helper_message import (
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

__all__ = [
    # Codes
    "ErrorCode",
    "ErrorInfo",
    
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
]
