# Requirements Document

## Introduction

本文档定义了基于现有 exception 模块对项目中所有异常使用进行重构的需求。目标是确保所有异常使用符合模块分层规范（module-layering-standard），并验证 layer_rule 是否正确生效。

## Glossary

- **Exception_Module**: 位于 `backend/src/common/modules/exception/` 的异常处理模块
- **Layer_Rule**: 异常层级规则检查器，用于验证异常是否在允许的位置抛出
- **Custom_Exception**: 系统自定义异常类，包括 ValidationError、AuthenticationError、NotFoundError 等
- **Service_Layer**: 业务服务层，位于 `modules/*/service.py`
- **Router_Layer**: 路由层，位于 `modules/*/router.py`
- **Dependencies_Layer**: 依赖注入层，位于 `modules/*/dependencies.py`

## Requirements

### Requirement 1: 异常模块结构验证

**User Story:** As a developer, I want to verify that the exception module follows the module-layering-standard, so that the codebase maintains consistent architecture.

#### Acceptance Criteria

1. THE Exception_Module SHALL have all 8 required layers (_01_contracts through _08_utils)
2. THE Exception_Module SHALL export all public interfaces from the module root `__init__.py`
3. THE Exception_Module SHALL define all custom exceptions in `_03_impls/impl_custom_exception.py`
4. THE Exception_Module SHALL define exception interfaces in `_01_contracts/exc_exception.py`

### Requirement 2: Layer Rule 配置验证

**User Story:** As a developer, I want to verify that layer_rule is properly configured and can be enabled, so that exception usage violations can be detected.

#### Acceptance Criteria

1. THE Layer_Rule SHALL be configurable via environment variable `ENABLE_EXCEPTION_LAYER_CHECK`
2. THE Layer_Rule SHALL support strict mode via environment variable `EXCEPTION_LAYER_STRICT`
3. WHEN `ENABLE_EXCEPTION_LAYER_CHECK` is set to "true", THE Layer_Rule SHALL check exception usage at runtime
4. WHEN strict mode is enabled AND a violation occurs, THE Layer_Rule SHALL raise RuntimeError
5. WHEN strict mode is disabled AND a violation occurs, THE Layer_Rule SHALL emit a warning

### Requirement 3: Service 层异常使用规范

**User Story:** As a developer, I want all service layer files to use only allowed exceptions, so that the architecture boundaries are respected.

#### Acceptance Criteria

1. THE Service_Layer SHALL only raise BUSINESS_EXCEPTIONS (ValidationError, AuthenticationError, AuthorizationError, NotFoundError, ConflictError, RateLimitError)
2. WHEN a service needs to handle database errors, THE Service_Layer SHALL catch and re-raise as appropriate business exceptions
3. THE Service_Layer SHALL import exceptions from `...common.modules.exception`
4. THE Service_Layer SHALL NOT raise DatabaseError, ExternalServiceError, or InternalError directly

### Requirement 4: Router 层异常使用规范

**User Story:** As a developer, I want all router layer files to use only allowed exceptions, so that HTTP responses are properly mapped.

#### Acceptance Criteria

1. THE Router_Layer SHALL only raise BUSINESS_EXCEPTIONS
2. WHEN a router needs to validate input, THE Router_Layer SHALL use ValidationError
3. THE Router_Layer SHALL NOT use HTTPException directly for business logic errors
4. THE Router_Layer SHALL NOT raise DatabaseError, ExternalServiceError, or InternalError directly

### Requirement 5: Dependencies 层异常使用规范

**User Story:** As a developer, I want all dependencies layer files to use only authentication/authorization exceptions, so that security concerns are properly separated.

#### Acceptance Criteria

1. THE Dependencies_Layer SHALL only raise AUTH_EXCEPTIONS (AuthenticationError, AuthorizationError)
2. WHEN authentication fails, THE Dependencies_Layer SHALL raise AuthenticationError
3. WHEN authorization fails, THE Dependencies_Layer SHALL raise AuthorizationError
4. THE Dependencies_Layer SHALL NOT raise ValidationError, NotFoundError, ConflictError, DatabaseError, ExternalServiceError, or InternalError

### Requirement 5.1: 异常层级严格约束

**User Story:** As a developer, I want strict enforcement of exception layer rules, so that architectural violations are prevented.

#### Acceptance Criteria

1. THE Layer_Rule SHALL define the following exception allowances:

**Infrastructure Layer (common/modules/):**
- `interceptor/database.py`: DatabaseError only
- `interceptor/auth.py`: AuthenticationError, AuthorizationError only
- `interceptor/error.py`: ALL_EXCEPTIONS (exception middleware)
- `supabase/service.py`: DatabaseError, ExternalServiceError only
- `supabase/client.py`: ExternalServiceError only
- `integrations/*`: ExternalServiceError, ValidationError only
- `logger/router.py`: NotFoundError, ValidationError only
- `health/service.py`: InternalError, ExternalServiceError only

**Business Layer (modules/):**
- `*/service.py`: BUSINESS_EXCEPTIONS (ValidationError, AuthenticationError, AuthorizationError, NotFoundError, ConflictError, RateLimitError)
- `*/router.py`: BUSINESS_EXCEPTIONS
- `*/dependencies.py`: AUTH_EXCEPTIONS (AuthenticationError, AuthorizationError)
- `*/schemas.py`: NO exceptions allowed
- `*/models.py`: NO exceptions allowed

2. WHEN an exception is raised from a disallowed location, THE Layer_Rule SHALL emit a warning (or raise RuntimeError in strict mode)
3. THE Layer_Rule SHALL be enabled by default in development environment
4. THE Layer_Rule SHALL log all violations for monitoring

### Requirement 6: 异常导入路径统一

**User Story:** As a developer, I want all exception imports to use the module root path, so that the codebase is consistent and maintainable.

#### Acceptance Criteria

1. THE System SHALL import exceptions from `...common.modules.exception` (relative) or `common.modules.exception` (absolute)
2. THE System SHALL NOT import exceptions from internal paths like `_01_contracts` or `_03_impls`
3. WHEN a file needs multiple exception types, THE System SHALL use a single import statement

### Requirement 7: HTTPException 替换

**User Story:** As a developer, I want to replace direct HTTPException usage with custom exceptions, so that error handling is consistent.

#### Acceptance Criteria

1. THE Router_Layer SHALL NOT raise HTTPException directly for business logic errors
2. WHEN external service is unavailable, THE System SHALL raise ExternalServiceError instead of HTTPException(503)
3. THE Exception_Middleware SHALL convert Custom_Exception to appropriate HTTP responses

### Requirement 8: 异常上下文信息完整性

**User Story:** As a developer, I want all exceptions to include proper context information, so that debugging is easier.

#### Acceptance Criteria

1. WHEN raising NotFoundError, THE System SHALL include resource_type parameter
2. WHEN raising ValidationError, THE System SHALL include field_errors when applicable
3. WHEN raising AuthenticationError, THE System SHALL include auth_method when applicable
4. WHEN raising AuthorizationError, THE System SHALL include required_permission when applicable

### Requirement 9: 数据库层异常处理规范

**User Story:** As a developer, I want database layer to use proper exception types, so that database errors are properly categorized and handled.

#### Acceptance Criteria

1. THE Database_Interceptor SHALL raise DatabaseError for all database operation failures
2. THE Supabase_Service SHALL raise ValueError for data validation failures (to be converted to ValidationError by service layer)
3. WHEN a database connection fails, THE System SHALL raise DatabaseError with appropriate context
4. THE Database_Interceptor SHALL include table_name and operation in DatabaseError context

### Requirement 10: 外部服务异常处理规范

**User Story:** As a developer, I want external service errors to be properly categorized, so that service availability issues are clearly identified.

#### Acceptance Criteria

1. WHEN Nice D&B API is not configured, THE System SHALL raise ExternalServiceError with service_name="Nice D&B"
2. WHEN Nice D&B API request fails, THE System SHALL raise ExternalServiceError with appropriate status_code
3. THE System SHALL NOT use HTTPException(503) directly for external service errors
4. THE ExternalServiceError SHALL include service_name and service_url when available

### Requirement 11: 所有自定义异常类启用 Layer Rule 检查

**User Story:** As a developer, I want all custom exception classes to check layer rules, so that architectural violations are detected consistently.

#### Acceptance Criteria

1. THE ValidationError class SHALL call _check_layer_rule() in __init__
2. THE AuthenticationError class SHALL call _check_layer_rule() in __init__
3. THE AuthorizationError class SHALL call _check_layer_rule() in __init__
4. THE NotFoundError class SHALL call _check_layer_rule() in __init__
5. THE ConflictError class SHALL call _check_layer_rule() in __init__
6. THE RateLimitError class SHALL call _check_layer_rule() in __init__
7. THE DatabaseError class SHALL call _check_layer_rule() in __init__
8. THE ExternalServiceError class SHALL call _check_layer_rule() in __init__
9. THE InternalError class SHALL call _check_layer_rule() in __init__

### Requirement 12: 异常消息使用标准模板

**User Story:** As a developer, I want all exception messages to use standardized templates from CMessageTemplate, so that error messages are consistent and internationalization-ready.

#### Acceptance Criteria

1. WHEN raising NotFoundError, THE System SHALL use CMessageTemplate.NOT_FOUND or CMessageTemplate.NOT_FOUND_WITH_ID
2. WHEN raising ValidationError, THE System SHALL use CMessageTemplate.VALIDATION_FAILED or CMessageTemplate.VALIDATION_FIELD
3. WHEN raising DatabaseError, THE System SHALL use CMessageTemplate.DB_ERROR
4. WHEN raising ExternalServiceError, THE System SHALL use CMessageTemplate.EXTERNAL_SERVICE
5. WHEN raising AuthenticationError for token issues, THE System SHALL use CMessageTemplate.TOKEN_INVALID or CMessageTemplate.TOKEN_EXPIRED
6. THE System SHALL NOT use hardcoded message strings for common error scenarios
7. THE CMessageTemplate class SHALL be imported from `...common.modules.exception`

### Requirement 12.1: CMessageTemplate 完整性

**User Story:** As a developer, I want CMessageTemplate to cover all common error scenarios, so that I don't need to create custom messages.

#### Acceptance Criteria

THE CMessageTemplate class SHALL define the following message templates:

**Authentication Messages:**
1. AUTH_NOT_AUTHENTICATED = "Not authenticated"
2. AUTH_INVALID_TOKEN = "Invalid or expired token"
3. AUTH_INVALID_PAYLOAD = "Invalid token payload"
4. AUTH_INVALID_CREDENTIALS = "Invalid credentials"
5. AUTH_USER_NOT_FOUND = "{user_type} not found"
6. AUTH_USER_INACTIVE = "{user_type} account is inactive"
7. AUTH_INVALID_ID_FORMAT = "Invalid {user_type} ID format"
8. AUTH_CREDENTIAL_VALIDATION_FAILED = "Could not validate credentials: {error}"

**Authorization Messages:**
9. AUTHZ_ACCESS_DENIED = "Access denied"
10. AUTHZ_PERMISSION_REQUIRED = "{permission} access required"
11. AUTHZ_NO_PERMISSION = "You don't have permission to {action}"

**Validation Messages:**
12. VALIDATION_FAILED = "Validation failed"
13. VALIDATION_FIELD_ERROR = "Validation failed: {field} - {error}"
14. VALIDATION_INVALID_VALUE = "Invalid {field}. Must be one of: {allowed_values}"
15. VALIDATION_REQUIRED_FIELD = "{field} is required"
16. VALIDATION_FILE_SIZE = "File size ({actual_size}MB) exceeds maximum allowed size of {max_size}MB"
17. VALIDATION_FILE_TYPE = "File type '{file_type}' is not allowed. Allowed types: {allowed_types}"
18. VALIDATION_FILE_EXTENSION = "File extension '{extension}' is not allowed. Allowed extensions: {allowed_extensions}"
19. VALIDATION_EMAIL_IN_USE = "Email already in use"
20. VALIDATION_BUSINESS_NUMBER_IN_USE = "Business number already registered"
21. VALIDATION_OPERATION_FAILED = "Failed to {operation}"

**Not Found Messages:**
22. NOT_FOUND = "{resource_type} not found"
23. NOT_FOUND_WITH_ID = "{resource_type} not found: {resource_id}"

**Conflict Messages:**
24. CONFLICT_RESOURCE = "Resource conflict: {resource}"
25. CONFLICT_ALREADY_EXISTS = "{resource_type} already exists"
26. CONFLICT_ALREADY_APPLIED = "Already applied to {resource_type}"

**Status Transition Messages:**
27. STATUS_INVALID_TRANSITION = "Cannot {action} {resource_type} with status '{current_status}'. Only '{allowed_statuses}' records can be {action_past}"

**Database Messages:**
28. DB_OPERATION_FAILED = "Database {operation} operation failed on table '{table}'"
29. DB_CONNECTION_FAILED = "Database connection failed"

**External Service Messages:**
30. EXTERNAL_SERVICE_ERROR = "External service error: {service_name}"
31. EXTERNAL_SERVICE_NOT_CONFIGURED = "{service_name} is not configured"
32. EXTERNAL_SERVICE_REQUEST_FAILED = "{service_name} request failed"

**Rate Limit Messages:**
33. RATE_LIMIT_EXCEEDED = "Rate limit exceeded"
34. RATE_LIMIT_RETRY_AFTER = "Rate limit exceeded. Retry after {seconds} seconds"

**Internal Error Messages:**
35. INTERNAL_ERROR = "Internal server error"

**Business Module Messages - User/Auth:**
36. USER_ACCOUNT_PENDING = "Account pending approval"
37. USER_ACCOUNT_SUSPENDED = "Account is suspended"
38. USER_INVALID_RESET_TOKEN = "Invalid reset token"
39. USER_RESET_TOKEN_EXPIRED = "Reset token has expired"
40. USER_CURRENT_PASSWORD_INCORRECT = "Current password is incorrect"

**Business Module Messages - Project:**
41. PROJECT_ALREADY_APPLIED = "Already applied to this project"
42. PROJECT_INACTIVE = "Cannot apply to project with status '{status}'. Only active projects accept applications"

**Business Module Messages - Performance:**
43. PERFORMANCE_EDIT_NOT_ALLOWED = "Cannot edit performance record with status '{status}'. Only 'draft' or 'revision_requested' records can be edited"
44. PERFORMANCE_DELETE_NOT_ALLOWED = "Cannot delete performance record with status '{status}'. Only 'draft' records can be deleted"
45. PERFORMANCE_SUBMIT_NOT_ALLOWED = "Cannot submit performance record with status '{status}'. Only 'draft' or 'revision_requested' records can be submitted"
46. PERFORMANCE_APPROVE_NOT_ALLOWED = "Cannot approve performance record with status '{status}'. Only 'submitted' records can be approved"
47. PERFORMANCE_REJECT_NOT_ALLOWED = "Cannot reject performance record with status '{status}'. Only 'submitted' records can be rejected"
48. PERFORMANCE_REVISION_NOT_ALLOWED = "Cannot request revision for performance record with status '{status}'. Only 'submitted' records can be sent back for revision"

**Business Module Messages - Messages:**
49. MESSAGE_BROADCAST_ADMIN_ONLY = "Only admins can send broadcast messages"
50. MESSAGE_NO_RECIPIENTS = "No recipients specified"

**Business Module Messages - Upload:**
51. UPLOAD_MIME_TYPE_NOT_ALLOWED = "MIME type '{mime_type}' is not allowed for {file_category} files"
52. UPLOAD_FILE_NOT_FOUND = "File not found"
53. UPLOAD_FILE_DELETED = "文件不存在或已被删除: {filename}"

### Requirement 13: 异常消息格式化工具函数

**User Story:** As a developer, I want helper functions to format exception messages, so that message creation is consistent and error-free.

#### Acceptance Criteria

1. THE Exception_Module SHALL provide a format_not_found_message(resource_type, resource_id=None) function
2. THE Exception_Module SHALL provide a format_validation_message(field=None, error=None) function
3. THE Exception_Module SHALL provide a format_db_error_message(operation, table) function
4. THE Exception_Module SHALL provide a format_external_service_message(service_name) function
5. WHEN resource_id is provided, THE format_not_found_message SHALL use NOT_FOUND_WITH_ID template
6. WHEN resource_id is not provided, THE format_not_found_message SHALL use NOT_FOUND template
