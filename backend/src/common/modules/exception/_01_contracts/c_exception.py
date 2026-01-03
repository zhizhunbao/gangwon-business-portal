"""Exception constant contracts."""
from typing import Final


class CExceptionField:
    """异常记录字段名常量"""
    
    ID: Final[str] = "id"
    SOURCE: Final[str] = "source"
    LEVEL: Final[str] = "level"
    LAYER: Final[str] = "layer"
    MESSAGE: Final[str] = "message"
    EXCEPTION_TYPE: Final[str] = "exception_type"
    ERROR_CODE: Final[str] = "error_code"
    HTTP_STATUS: Final[str] = "http_status"
    TRACE_ID: Final[str] = "trace_id"
    REQUEST_ID: Final[str] = "request_id"
    USER_ID: Final[str] = "user_id"
    MODULE: Final[str] = "module"
    FUNCTION: Final[str] = "function"
    FILE_PATH: Final[str] = "file_path"
    LINE_NUMBER: Final[str] = "line_number"
    STACK_TRACE: Final[str] = "stack_trace"
    CONTEXT: Final[str] = "context"
    CONTEXT_DATA: Final[str] = "context_data"
    CREATED_AT: Final[str] = "created_at"
    TIMESTAMP: Final[str] = "timestamp"
    DURATION_MS: Final[str] = "duration_ms"
    REQUEST_METHOD: Final[str] = "request_method"
    REQUEST_PATH: Final[str] = "request_path"
    IP_ADDRESS: Final[str] = "ip_address"
    USER_AGENT: Final[str] = "user_agent"
    RESOLVED: Final[str] = "resolved"
    RESOLUTION_NOTES: Final[str] = "resolution_notes"


class CMessageTemplate:
    """异常消息模板"""
    
    # ========== Logging Messages ==========
    AUTH_FAILED: Final[str] = "Auth: {function} FAILED"
    AUTH_SUCCESS: Final[str] = "Auth: {function} OK"
    TOKEN_EXPIRED: Final[str] = "Token expired for user {user_id}"
    DB_OPERATION: Final[str] = "DB {operation} {table} {status} ({duration_ms:.2f}ms)"
    DB_SLOW_QUERY: Final[str] = "DB {operation} {table} {status} ({duration_ms:.2f}ms) [SLOW]"
    API_ERROR: Final[str] = "API {method} {path} failed: {status_code}"
    
    # ========== Authentication Messages ==========
    AUTH_NOT_AUTHENTICATED: Final[str] = "Not authenticated"
    AUTH_INVALID_TOKEN: Final[str] = "Invalid or expired token"
    AUTH_INVALID_PAYLOAD: Final[str] = "Invalid token payload"
    AUTH_INVALID_CREDENTIALS: Final[str] = "Invalid credentials"
    AUTH_USER_NOT_FOUND: Final[str] = "{user_type} not found"
    AUTH_USER_INACTIVE: Final[str] = "{user_type} account is inactive"
    AUTH_INVALID_ID_FORMAT: Final[str] = "Invalid {user_type} ID format"
    AUTH_CREDENTIAL_VALIDATION_FAILED: Final[str] = "Could not validate credentials: {error}"
    
    # ========== Authorization Messages ==========
    AUTHZ_ACCESS_DENIED: Final[str] = "Access denied"
    AUTHZ_PERMISSION_REQUIRED: Final[str] = "{permission} access required"
    AUTHZ_NO_PERMISSION: Final[str] = "You don't have permission to {action}"
    
    # ========== Validation Messages ==========
    VALIDATION_FAILED: Final[str] = "Validation failed"
    VALIDATION_FIELD_ERROR: Final[str] = "Validation failed: {field} - {error}"
    VALIDATION_INVALID_VALUE: Final[str] = "Invalid {field}. Must be one of: {allowed_values}"
    VALIDATION_REQUIRED_FIELD: Final[str] = "{field} is required"
    VALIDATION_FILE_SIZE: Final[str] = "File size ({actual_size}MB) exceeds maximum allowed size of {max_size}MB"
    VALIDATION_FILE_TYPE: Final[str] = "File type '{file_type}' is not allowed. Allowed types: {allowed_types}"
    VALIDATION_FILE_EXTENSION: Final[str] = "File extension '{extension}' is not allowed. Allowed extensions: {allowed_extensions}"
    VALIDATION_EMAIL_IN_USE: Final[str] = "Email already in use"
    VALIDATION_BUSINESS_NUMBER_IN_USE: Final[str] = "Business number already registered"
    VALIDATION_OPERATION_FAILED: Final[str] = "Failed to {operation}"
    
    # ========== Not Found Messages ==========
    NOT_FOUND: Final[str] = "{resource_type} not found"
    NOT_FOUND_WITH_ID: Final[str] = "{resource_type} not found: {resource_id}"
    
    # ========== Conflict Messages ==========
    CONFLICT_RESOURCE: Final[str] = "Resource conflict: {resource}"
    CONFLICT_ALREADY_EXISTS: Final[str] = "{resource_type} already exists"
    CONFLICT_ALREADY_APPLIED: Final[str] = "Already applied to {resource_type}"
    
    # ========== Status Transition Messages ==========
    STATUS_INVALID_TRANSITION: Final[str] = "Cannot {action} {resource_type} with status '{current_status}'. Only '{allowed_statuses}' records can be {action_past}"
    
    # ========== Database Messages ==========
    DB_ERROR: Final[str] = "Database {operation} operation failed on table '{table}'"
    DB_CONNECTION_FAILED: Final[str] = "Database connection failed"
    
    # ========== External Service Messages ==========
    EXTERNAL_SERVICE_ERROR: Final[str] = "External service error: {service_name}"
    EXTERNAL_SERVICE_NOT_CONFIGURED: Final[str] = "{service_name} is not configured"
    EXTERNAL_SERVICE_REQUEST_FAILED: Final[str] = "{service_name} request failed"
    
    # ========== Rate Limit Messages ==========
    RATE_LIMIT_EXCEEDED: Final[str] = "Rate limit exceeded"
    RATE_LIMIT_RETRY_AFTER: Final[str] = "Rate limit exceeded. Retry after {seconds} seconds"
    
    # ========== Internal Error Messages ==========
    INTERNAL_ERROR: Final[str] = "Internal server error"
    
    # ========== Business Module Messages - User/Auth ==========
    USER_ACCOUNT_PENDING: Final[str] = "Account pending approval"
    USER_ACCOUNT_SUSPENDED: Final[str] = "Account is suspended"
    USER_INVALID_RESET_TOKEN: Final[str] = "Invalid reset token"
    USER_RESET_TOKEN_EXPIRED: Final[str] = "Reset token has expired"
    USER_CURRENT_PASSWORD_INCORRECT: Final[str] = "Current password is incorrect"
    
    # ========== Business Module Messages - Project ==========
    PROJECT_ALREADY_APPLIED: Final[str] = "Already applied to this project"
    PROJECT_INACTIVE: Final[str] = "Cannot apply to project with status '{status}'. Only active projects accept applications"
    
    # ========== Business Module Messages - Performance ==========
    PERFORMANCE_EDIT_NOT_ALLOWED: Final[str] = "Cannot edit performance record with status '{status}'. Only 'draft' or 'revision_requested' records can be edited"
    PERFORMANCE_DELETE_NOT_ALLOWED: Final[str] = "Cannot delete performance record with status '{status}'. Only 'draft' records can be deleted"
    PERFORMANCE_SUBMIT_NOT_ALLOWED: Final[str] = "Cannot submit performance record with status '{status}'. Only 'draft' or 'revision_requested' records can be submitted"
    PERFORMANCE_APPROVE_NOT_ALLOWED: Final[str] = "Cannot approve performance record with status '{status}'. Only 'submitted' records can be approved"
    PERFORMANCE_REJECT_NOT_ALLOWED: Final[str] = "Cannot reject performance record with status '{status}'. Only 'submitted' records can be rejected"
    PERFORMANCE_REVISION_NOT_ALLOWED: Final[str] = "Cannot request revision for performance record with status '{status}'. Only 'submitted' records can be sent back for revision"
    
    # ========== Business Module Messages - Messages ==========
    MESSAGE_BROADCAST_ADMIN_ONLY: Final[str] = "Only admins can send broadcast messages"
    MESSAGE_NO_RECIPIENTS: Final[str] = "No recipients specified"
    
    # ========== Business Module Messages - Upload ==========
    UPLOAD_MIME_TYPE_NOT_ALLOWED: Final[str] = "MIME type '{mime_type}' is not allowed for {file_category} files"
    UPLOAD_FILE_NOT_FOUND: Final[str] = "File not found"
    UPLOAD_FILE_DELETED: Final[str] = "文件不存在或已被删除: {filename}"
    
    # ========== Legacy Aliases (for backward compatibility during migration) ==========
    TOKEN_INVALID: Final[str] = AUTH_INVALID_TOKEN
    VALIDATION_FIELD: Final[str] = VALIDATION_FIELD_ERROR
    CONFLICT: Final[str] = CONFLICT_RESOURCE
    EXTERNAL_SERVICE: Final[str] = EXTERNAL_SERVICE_ERROR
    RATE_LIMIT: Final[str] = RATE_LIMIT_EXCEEDED


class CFieldFormat:
    """字段格式规范"""
    
    MESSAGE_MAX_LENGTH: Final[int] = 500
    STACK_TRACE_MAX_LENGTH: Final[int] = 10000
    MODULE_SEPARATOR: Final[str] = "."
    REQUEST_ID_SEPARATOR: Final[str] = "-"
    TIMESTAMP_FORMAT: Final[str] = "%Y-%m-%d %H:%M:%S.%f"
    HOUR_KEY_FORMAT: Final[str] = "%Y-%m-%d-%H"


class CSensitiveField:
    """敏感字段定义，日志中应过滤或脱敏"""
    
    FIELDS: Final[frozenset] = frozenset({
        "password",
        "token",
        "secret",
        "key",
        "credential",
        "authorization",
        "api_key",
        "access_token",
        "refresh_token",
    })
    
    FILTERED_VALUE: Final[str] = "[FILTERED]"
