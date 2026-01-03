# Design Document: Exception Module Refactoring

## Overview

本设计文档描述了对现有 exception 模块的重构方案，目标是：
1. 确保所有异常使用符合模块分层规范
2. 启用 layer_rule 进行运行时检查
3. 统一异常消息使用标准模板
4. 提供消息格式化工具函数

## Architecture

### 模块结构

```
backend/src/common/modules/exception/
├── _01_contracts/           # 契约层
│   ├── __init__.py
│   ├── i_exception.py       # IException 接口
│   ├── i_exception_classifier.py
│   ├── i_exception_recorder.py
│   ├── i_exception_monitor.py
│   ├── i_exception_service.py
│   ├── i_layer_rule.py      # ILayerRule 接口
│   ├── r_exception.py       # IExceptionRepository 接口
│   ├── d_exception_context.py
│   ├── d_exception_record.py
│   ├── d_exception_stats.py
│   ├── e_exception_type.py
│   ├── e_exception_const.py
│   ├── c_exception.py       # CMessageTemplate (扩展)
│   └── exc_exception.py     # ICustomException 接口
├── _02_abstracts/           # 抽象层
│   ├── __init__.py
│   ├── abstract_classifier.py
│   ├── abstract_recorder.py
│   ├── abstract_monitor.py
│   ├── abstract_layer_rule.py
│   └── abstract_exception.py
├── _03_impls/               # 实现层
│   ├── __init__.py
│   ├── impl_classifier.py
│   ├── impl_recorder.py
│   ├── impl_monitor.py
│   ├── impl_layer_rule.py   # LayerRule 实现 (更新)
│   └── impl_custom_exception.py  # 自定义异常 (更新)
├── _04_services/            # 服务层
│   ├── __init__.py
│   └── service_exception.py
├── _05_dtos/                # DTO层
│   ├── __init__.py
│   └── dto_frontend.py
├── _06_models/              # 模型层
│   └── __init__.py
├── _07_router/              # 路由层
│   ├── __init__.py
│   └── router_exception.py
├── _08_utils/               # 工具层
│   ├── __init__.py
│   ├── code_error.py
│   ├── handler_exception.py
│   └── helper_message.py    # 新增：消息格式化工具
└── __init__.py              # 模块导出
```

### 异常层级规则

```
┌─────────────────────────────────────────────────────────────────┐
│                     Exception Layer Rules                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Infrastructure Layer (common/modules/)                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ interceptor/database.py  → DatabaseError                 │    │
│  │ interceptor/auth.py      → AuthenticationError,          │    │
│  │                            AuthorizationError            │    │
│  │ interceptor/error.py     → ALL_EXCEPTIONS               │    │
│  │ supabase/service.py      → DatabaseError,               │    │
│  │                            ExternalServiceError          │    │
│  │ integrations/*           → ExternalServiceError,        │    │
│  │                            ValidationError               │    │
│  │ logger/router.py         → NotFoundError, ValidationError│    │
│  │ health/service.py        → InternalError,               │    │
│  │                            ExternalServiceError          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Business Layer (modules/)                                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ */service.py      → BUSINESS_EXCEPTIONS                  │    │
│  │ */router.py       → BUSINESS_EXCEPTIONS                  │    │
│  │ */dependencies.py → AUTH_EXCEPTIONS                      │    │
│  │ */schemas.py      → NO EXCEPTIONS                        │    │
│  │ */models.py       → NO EXCEPTIONS                        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  BUSINESS_EXCEPTIONS = {ValidationError, AuthenticationError,    │
│                         AuthorizationError, NotFoundError,       │
│                         ConflictError, RateLimitError}           │
│                                                                  │
│  AUTH_EXCEPTIONS = {AuthenticationError, AuthorizationError}     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. CMessageTemplate (扩展)

位置: `_01_contracts/c_exception.py`

```python
class CMessageTemplate:
    """异常消息模板 - 扩展版"""
    
    # Authentication Messages
    AUTH_NOT_AUTHENTICATED: Final[str] = "Not authenticated"
    AUTH_INVALID_TOKEN: Final[str] = "Invalid or expired token"
    AUTH_INVALID_PAYLOAD: Final[str] = "Invalid token payload"
    AUTH_INVALID_CREDENTIALS: Final[str] = "Invalid credentials"
    AUTH_USER_NOT_FOUND: Final[str] = "{user_type} not found"
    AUTH_USER_INACTIVE: Final[str] = "{user_type} account is inactive"
    AUTH_INVALID_ID_FORMAT: Final[str] = "Invalid {user_type} ID format"
    AUTH_CREDENTIAL_VALIDATION_FAILED: Final[str] = "Could not validate credentials: {error}"
    
    # Authorization Messages
    AUTHZ_ACCESS_DENIED: Final[str] = "Access denied"
    AUTHZ_PERMISSION_REQUIRED: Final[str] = "{permission} access required"
    AUTHZ_NO_PERMISSION: Final[str] = "You don't have permission to {action}"
    
    # Validation Messages
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
    
    # Not Found Messages
    NOT_FOUND: Final[str] = "{resource_type} not found"
    NOT_FOUND_WITH_ID: Final[str] = "{resource_type} not found: {resource_id}"
    
    # Conflict Messages
    CONFLICT_RESOURCE: Final[str] = "Resource conflict: {resource}"
    CONFLICT_ALREADY_EXISTS: Final[str] = "{resource_type} already exists"
    CONFLICT_ALREADY_APPLIED: Final[str] = "Already applied to {resource_type}"
    
    # Status Transition Messages
    STATUS_INVALID_TRANSITION: Final[str] = "Cannot {action} {resource_type} with status '{current_status}'. Only '{allowed_statuses}' records can be {action_past}"
    
    # Database Messages
    DB_OPERATION_FAILED: Final[str] = "Database {operation} operation failed on table '{table}'"
    DB_CONNECTION_FAILED: Final[str] = "Database connection failed"
    
    # External Service Messages
    EXTERNAL_SERVICE_ERROR: Final[str] = "External service error: {service_name}"
    EXTERNAL_SERVICE_NOT_CONFIGURED: Final[str] = "{service_name} is not configured"
    EXTERNAL_SERVICE_REQUEST_FAILED: Final[str] = "{service_name} request failed"
    
    # Rate Limit Messages
    RATE_LIMIT_EXCEEDED: Final[str] = "Rate limit exceeded"
    RATE_LIMIT_RETRY_AFTER: Final[str] = "Rate limit exceeded. Retry after {seconds} seconds"
    
    # Internal Error Messages
    INTERNAL_ERROR: Final[str] = "Internal server error"
    
    # Business Module Messages - User/Auth
    USER_ACCOUNT_PENDING: Final[str] = "Account pending approval"
    USER_ACCOUNT_SUSPENDED: Final[str] = "Account is suspended"
    USER_INVALID_RESET_TOKEN: Final[str] = "Invalid reset token"
    USER_RESET_TOKEN_EXPIRED: Final[str] = "Reset token has expired"
    USER_CURRENT_PASSWORD_INCORRECT: Final[str] = "Current password is incorrect"
    
    # Business Module Messages - Project
    PROJECT_ALREADY_APPLIED: Final[str] = "Already applied to this project"
    PROJECT_INACTIVE: Final[str] = "Cannot apply to project with status '{status}'. Only active projects accept applications"
    
    # Business Module Messages - Performance
    PERFORMANCE_EDIT_NOT_ALLOWED: Final[str] = "Cannot edit performance record with status '{status}'. Only 'draft' or 'revision_requested' records can be edited"
    PERFORMANCE_DELETE_NOT_ALLOWED: Final[str] = "Cannot delete performance record with status '{status}'. Only 'draft' records can be deleted"
    PERFORMANCE_SUBMIT_NOT_ALLOWED: Final[str] = "Cannot submit performance record with status '{status}'. Only 'draft' or 'revision_requested' records can be submitted"
    PERFORMANCE_APPROVE_NOT_ALLOWED: Final[str] = "Cannot approve performance record with status '{status}'. Only 'submitted' records can be approved"
    PERFORMANCE_REJECT_NOT_ALLOWED: Final[str] = "Cannot reject performance record with status '{status}'. Only 'submitted' records can be rejected"
    PERFORMANCE_REVISION_NOT_ALLOWED: Final[str] = "Cannot request revision for performance record with status '{status}'. Only 'submitted' records can be sent back for revision"
    
    # Business Module Messages - Messages
    MESSAGE_BROADCAST_ADMIN_ONLY: Final[str] = "Only admins can send broadcast messages"
    MESSAGE_NO_RECIPIENTS: Final[str] = "No recipients specified"
    
    # Business Module Messages - Upload
    UPLOAD_MIME_TYPE_NOT_ALLOWED: Final[str] = "MIME type '{mime_type}' is not allowed for {file_category} files"
    UPLOAD_FILE_NOT_FOUND: Final[str] = "File not found"
    UPLOAD_FILE_DELETED: Final[str] = "文件不存在或已被删除: {filename}"
```

### 2. Message Helper Functions (新增)

位置: `_08_utils/helper_message.py`

```python
from .._01_contracts.c_exception import CMessageTemplate


def format_not_found_message(resource_type: str, resource_id: str = None) -> str:
    """格式化 NotFoundError 消息"""
    if resource_id:
        return CMessageTemplate.NOT_FOUND_WITH_ID.format(
            resource_type=resource_type, 
            resource_id=resource_id
        )
    return CMessageTemplate.NOT_FOUND.format(resource_type=resource_type)


def format_validation_message(field: str = None, error: str = None) -> str:
    """格式化 ValidationError 消息"""
    if field and error:
        return CMessageTemplate.VALIDATION_FIELD_ERROR.format(field=field, error=error)
    return CMessageTemplate.VALIDATION_FAILED


def format_db_error_message(operation: str, table: str) -> str:
    """格式化 DatabaseError 消息"""
    return CMessageTemplate.DB_OPERATION_FAILED.format(operation=operation, table=table)


def format_external_service_message(service_name: str) -> str:
    """格式化 ExternalServiceError 消息"""
    return CMessageTemplate.EXTERNAL_SERVICE_ERROR.format(service_name=service_name)


def format_auth_user_not_found(user_type: str) -> str:
    """格式化用户未找到消息"""
    return CMessageTemplate.AUTH_USER_NOT_FOUND.format(user_type=user_type)


def format_auth_user_inactive(user_type: str) -> str:
    """格式化用户未激活消息"""
    return CMessageTemplate.AUTH_USER_INACTIVE.format(user_type=user_type)


def format_status_transition_error(
    action: str, 
    resource_type: str, 
    current_status: str, 
    allowed_statuses: str,
    action_past: str
) -> str:
    """格式化状态转换错误消息"""
    return CMessageTemplate.STATUS_INVALID_TRANSITION.format(
        action=action,
        resource_type=resource_type,
        current_status=current_status,
        allowed_statuses=allowed_statuses,
        action_past=action_past
    )
```

### 3. Custom Exception Classes (更新)

位置: `_03_impls/impl_custom_exception.py`

所有自定义异常类都需要调用 `_check_layer_rule()`:

```python
class ValidationError(AbstractCustomException):
    def __init__(self, message: str = None, ...):
        if message is None:
            message = CMessageTemplate.VALIDATION_FAILED
        super().__init__(message, context, original_exception)
        self._check_layer_rule()  # 已有

class AuthenticationError(AbstractCustomException):
    def __init__(self, message: str = None, ...):
        if message is None:
            message = CMessageTemplate.AUTH_NOT_AUTHENTICATED
        super().__init__(message, context, original_exception)
        self._check_layer_rule()  # 新增

class AuthorizationError(AbstractCustomException):
    def __init__(self, message: str = None, ...):
        if message is None:
            message = CMessageTemplate.AUTHZ_ACCESS_DENIED
        super().__init__(message, context, original_exception)
        self._check_layer_rule()  # 新增

class NotFoundError(AbstractCustomException):
    def __init__(self, message: str = None, resource_type: str = None, ...):
        if message is None and resource_type:
            message = CMessageTemplate.NOT_FOUND.format(resource_type=resource_type)
        elif message is None:
            message = "Resource not found"
        super().__init__(message, context, original_exception)
        self._check_layer_rule()  # 新增

# ... 其他异常类类似
```

### 4. LayerRule (更新)

位置: `_03_impls/impl_layer_rule.py`

```python
class LayerRule(AbstractLayerRule):
    def __init__(self):
        # 默认在开发环境启用
        self._enable_check = os.getenv(
            "ENABLE_EXCEPTION_LAYER_CHECK", 
            "true" if os.getenv("ENV", "development") == "development" else "false"
        ).lower() == "true"
        
        self._strict_mode = os.getenv(
            "EXCEPTION_LAYER_STRICT", "false"
        ).lower() == "true"
        
        self._log_violations = True  # 记录所有违规
```

## Data Models

无新增数据模型，使用现有的 `DExceptionContext`, `DExceptionRecord` 等。

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Layer Rule Enforcement

*For any* exception raised in the system, if layer_rule is enabled, the exception type must be in the allowed set for that file location.

**Validates: Requirements 2.3, 3.1, 4.1, 5.1, 5.1.1**

### Property 2: Exception Message Template Consistency

*For any* NotFoundError raised with a resource_type parameter, the message must match the pattern "{resource_type} not found" or "{resource_type} not found: {resource_id}".

**Validates: Requirements 12.1, 12.1.22, 12.1.23**

### Property 3: Custom Exception Layer Rule Check

*For any* custom exception class instantiation, the `_check_layer_rule()` method must be called during `__init__`.

**Validates: Requirements 11.1-11.9**

### Property 4: Exception Middleware HTTP Response Mapping

*For any* ICustomException raised during request processing, the exception middleware must convert it to an HTTP response with the correct status code matching `exception.http_status_code`.

**Validates: Requirements 7.3**

### Property 5: Database Error Context Completeness

*For any* DatabaseError raised by the database interceptor, the exception must include `table_name` and `operation` in its context.

**Validates: Requirements 9.4**

### Property 6: External Service Error Context

*For any* ExternalServiceError raised, the exception must include `service_name` in its context.

**Validates: Requirements 10.4**

## Error Handling

### 异常处理流程

```
┌─────────────────────────────────────────────────────────────────┐
│                    Exception Handling Flow                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Exception Raised                                             │
│     ↓                                                            │
│  2. _check_layer_rule() called                                   │
│     ├─ If violation & strict mode → RuntimeError                 │
│     └─ If violation & not strict → Warning logged                │
│     ↓                                                            │
│  3. Exception propagates to middleware                           │
│     ↓                                                            │
│  4. ExceptionMiddleware catches exception                        │
│     ├─ If ICustomException → Convert to HTTP response            │
│     ├─ If HTTPException → Pass through                           │
│     └─ If other → Convert to 500 Internal Server Error           │
│     ↓                                                            │
│  5. exception_service.record_exception() called                  │
│     ↓                                                            │
│  6. HTTP Response returned to client                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 错误码映射

| Exception Type | HTTP Status | Error Code |
|---------------|-------------|------------|
| ValidationError | 400 | VALIDATION_ERROR |
| AuthenticationError | 401 | AUTHENTICATION_ERROR |
| AuthorizationError | 403 | AUTHORIZATION_ERROR |
| NotFoundError | 404 | NOT_FOUND_ERROR |
| ConflictError | 409 | CONFLICT_ERROR |
| RateLimitError | 429 | RATE_LIMIT_ERROR |
| DatabaseError | 500 | DATABASE_ERROR |
| ExternalServiceError | 502 | EXTERNAL_SERVICE_ERROR |
| InternalError | 500 | INTERNAL_ERROR |

## Testing Strategy

### Unit Tests

1. **CMessageTemplate Tests**
   - 验证所有消息模板常量存在
   - 验证消息模板格式化正确

2. **Helper Function Tests**
   - 验证 `format_not_found_message()` 输出正确
   - 验证 `format_validation_message()` 输出正确
   - 验证 `format_db_error_message()` 输出正确
   - 验证 `format_external_service_message()` 输出正确

3. **LayerRule Tests**
   - 验证环境变量配置生效
   - 验证允许的异常列表正确
   - 验证违规检测正确

### Property-Based Tests

使用 Hypothesis 库进行属性测试：

1. **Property 1: Layer Rule Enforcement**
   - 生成随机文件路径和异常类型
   - 验证 layer_rule 正确判断是否允许

2. **Property 2: Exception Message Template Consistency**
   - 生成随机 resource_type
   - 验证 NotFoundError 消息格式正确

3. **Property 3: Custom Exception Layer Rule Check**
   - 验证所有异常类都调用了 _check_layer_rule()

4. **Property 4: Exception Middleware HTTP Response Mapping**
   - 生成随机异常
   - 验证 HTTP 响应状态码正确

5. **Property 5: Database Error Context Completeness**
   - 生成随机表名和操作
   - 验证 DatabaseError 包含正确上下文

6. **Property 6: External Service Error Context**
   - 生成随机服务名
   - 验证 ExternalServiceError 包含正确上下文

### Integration Tests

1. **API 异常响应测试**
   - 验证各种异常返回正确的 HTTP 状态码
   - 验证错误响应格式正确

2. **Layer Rule 集成测试**
   - 验证在实际代码路径中 layer_rule 正确工作
