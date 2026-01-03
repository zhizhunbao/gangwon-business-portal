"""Message formatting helper functions.

This module provides utility functions for formatting exception messages
using the standard message templates from CMessageTemplate.
"""
from .._01_contracts.c_exception import CMessageTemplate


def format_not_found_message(resource_type: str, resource_id: str = None) -> str:
    """Format NotFoundError message.
    
    Args:
        resource_type: Type of resource (e.g., "User", "Project")
        resource_id: Optional resource identifier
        
    Returns:
        Formatted message string
    """
    if resource_id:
        return CMessageTemplate.NOT_FOUND_WITH_ID.format(
            resource_type=resource_type, 
            resource_id=resource_id
        )
    return CMessageTemplate.NOT_FOUND.format(resource_type=resource_type)


def format_validation_message(field: str = None, error: str = None) -> str:
    """Format ValidationError message.
    
    Args:
        field: Field name that failed validation
        error: Error description
        
    Returns:
        Formatted message string
    """
    if field and error:
        return CMessageTemplate.VALIDATION_FIELD_ERROR.format(field=field, error=error)
    return CMessageTemplate.VALIDATION_FAILED


def format_db_error_message(operation: str, table: str) -> str:
    """Format DatabaseError message.
    
    Args:
        operation: Database operation (e.g., "insert", "update", "delete")
        table: Table name
        
    Returns:
        Formatted message string
    """
    return CMessageTemplate.DB_ERROR.format(operation=operation, table=table)


def format_external_service_message(service_name: str) -> str:
    """Format ExternalServiceError message.
    
    Args:
        service_name: Name of the external service
        
    Returns:
        Formatted message string
    """
    return CMessageTemplate.EXTERNAL_SERVICE_ERROR.format(service_name=service_name)


def format_auth_user_not_found(user_type: str) -> str:
    """Format authentication user not found message.
    
    Args:
        user_type: Type of user (e.g., "User", "Member", "Admin")
        
    Returns:
        Formatted message string
    """
    return CMessageTemplate.AUTH_USER_NOT_FOUND.format(user_type=user_type)


def format_auth_user_inactive(user_type: str) -> str:
    """Format authentication user inactive message.
    
    Args:
        user_type: Type of user (e.g., "User", "Member", "Admin")
        
    Returns:
        Formatted message string
    """
    return CMessageTemplate.AUTH_USER_INACTIVE.format(user_type=user_type)


def format_status_transition_error(
    action: str, 
    resource_type: str, 
    current_status: str, 
    allowed_statuses: str,
    action_past: str
) -> str:
    """Format status transition error message.
    
    Args:
        action: Action being attempted (e.g., "edit", "delete", "submit")
        resource_type: Type of resource (e.g., "performance record")
        current_status: Current status of the resource
        allowed_statuses: Comma-separated list of allowed statuses
        action_past: Past tense of action (e.g., "edited", "deleted", "submitted")
        
    Returns:
        Formatted message string
    """
    return CMessageTemplate.STATUS_INVALID_TRANSITION.format(
        action=action,
        resource_type=resource_type,
        current_status=current_status,
        allowed_statuses=allowed_statuses,
        action_past=action_past
    )


def format_permission_required(permission: str) -> str:
    """Format permission required message.
    
    Args:
        permission: Required permission (e.g., "Admin", "Member")
        
    Returns:
        Formatted message string
    """
    return CMessageTemplate.AUTHZ_PERMISSION_REQUIRED.format(permission=permission)


def format_no_permission(action: str) -> str:
    """Format no permission message.
    
    Args:
        action: Action being denied (e.g., "access this file", "delete this record")
        
    Returns:
        Formatted message string
    """
    return CMessageTemplate.AUTHZ_NO_PERMISSION.format(action=action)


def format_invalid_value(field: str, allowed_values: str) -> str:
    """Format invalid value message.
    
    Args:
        field: Field name
        allowed_values: Comma-separated list of allowed values
        
    Returns:
        Formatted message string
    """
    return CMessageTemplate.VALIDATION_INVALID_VALUE.format(
        field=field, 
        allowed_values=allowed_values
    )


def format_required_field(field: str) -> str:
    """Format required field message.
    
    Args:
        field: Field name
        
    Returns:
        Formatted message string
    """
    return CMessageTemplate.VALIDATION_REQUIRED_FIELD.format(field=field)


def format_file_size_error(actual_size: float, max_size: float) -> str:
    """Format file size error message.
    
    Args:
        actual_size: Actual file size in MB
        max_size: Maximum allowed size in MB
        
    Returns:
        Formatted message string
    """
    return CMessageTemplate.VALIDATION_FILE_SIZE.format(
        actual_size=actual_size, 
        max_size=max_size
    )


def format_file_extension_error(extension: str, allowed_extensions: str) -> str:
    """Format file extension error message.
    
    Args:
        extension: File extension
        allowed_extensions: Comma-separated list of allowed extensions
        
    Returns:
        Formatted message string
    """
    return CMessageTemplate.VALIDATION_FILE_EXTENSION.format(
        extension=extension, 
        allowed_extensions=allowed_extensions
    )


def format_operation_failed(operation: str) -> str:
    """Format operation failed message.
    
    Args:
        operation: Operation that failed (e.g., "create member", "delete attachment")
        
    Returns:
        Formatted message string
    """
    return CMessageTemplate.VALIDATION_OPERATION_FAILED.format(operation=operation)
