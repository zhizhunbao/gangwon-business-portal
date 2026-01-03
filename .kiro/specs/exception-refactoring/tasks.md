# Implementation Plan: Exception Module Refactoring

## Overview

本实现计划将异常模块重构为符合模块分层规范的架构，包括扩展消息模板、添加工具函数、启用 layer_rule 检查，以及更新所有业务模块的异常使用。

## Tasks

- [x] 1. 扩展 CMessageTemplate 消息模板
  - 在 `_01_contracts/c_exception.py` 中添加所有 53 个消息模板
  - 包括 Authentication、Authorization、Validation、NotFound、Conflict、Database、ExternalService、RateLimit、Internal 和业务模块消息
  - _Requirements: 12.1.1-12.1.53_

- [x] 2. 创建消息格式化工具函数
  - [x] 2.1 创建 `_08_utils/helper_message.py` 文件
    - 实现 `format_not_found_message(resource_type, resource_id=None)`
    - 实现 `format_validation_message(field=None, error=None)`
    - 实现 `format_db_error_message(operation, table)`
    - 实现 `format_external_service_message(service_name)`
    - 实现 `format_auth_user_not_found(user_type)`
    - 实现 `format_auth_user_inactive(user_type)`
    - 实现 `format_status_transition_error(...)`
    - _Requirements: 13.1-13.6_

  - [x] 2.2 更新 `_08_utils/__init__.py` 导出新函数
    - _Requirements: 13.1_

  - [x] 2.3 更新模块根 `__init__.py` 导出新函数
    - _Requirements: 6.1_

- [x] 3. 更新自定义异常类添加 layer_rule 检查
  - [x] 3.1 更新 `impl_custom_exception.py` 中所有异常类
    - ValidationError 已有 `_check_layer_rule()` 调用
    - AuthenticationError 添加 `_check_layer_rule()` 调用
    - AuthorizationError 添加 `_check_layer_rule()` 调用
    - NotFoundError 添加 `_check_layer_rule()` 调用
    - ConflictError 添加 `_check_layer_rule()` 调用
    - RateLimitError 添加 `_check_layer_rule()` 调用
    - DatabaseError 添加 `_check_layer_rule()` 调用
    - ExternalServiceError 添加 `_check_layer_rule()` 调用
    - InternalError 添加 `_check_layer_rule()` 调用
    - _Requirements: 11.1-11.9_

  - [ ]* 3.2 Write property test for layer rule check
    - **Property 3: Custom Exception Layer Rule Check**
    - **Validates: Requirements 11.1-11.9**

- [x] 4. 更新 LayerRule 配置
  - [x] 4.1 更新 `impl_layer_rule.py` 默认启用开发环境检查
    - 修改 `_enable_check` 默认值逻辑
    - 添加 `_log_violations` 属性
    - _Requirements: 2.1, 2.2, 5.1.3, 5.1.4_

  - [ ]* 4.2 Write property test for layer rule enforcement
    - **Property 1: Layer Rule Enforcement**
    - **Validates: Requirements 2.3, 3.1, 4.1, 5.1, 5.1.1**

- [x] 5. Checkpoint - 确保异常模块更新完成
  - 确保所有测试通过，如有问题请询问用户

- [x] 6. 更新 member/router.py 替换 HTTPException
  - [x] 6.1 将 HTTPException(503) 替换为 ExternalServiceError
    - 导入 ExternalServiceError
    - 使用 CMessageTemplate.EXTERNAL_SERVICE_NOT_CONFIGURED
    - 使用 CMessageTemplate.EXTERNAL_SERVICE_REQUEST_FAILED
    - _Requirements: 7.1, 7.2, 10.1, 10.2, 10.3_

- [x] 7. 更新 user/dependencies.py 使用消息模板
  - [x] 7.1 替换硬编码消息为 CMessageTemplate
    - "Not authenticated" → CMessageTemplate.AUTH_NOT_AUTHENTICATED
    - "Invalid token payload" → CMessageTemplate.AUTH_INVALID_PAYLOAD
    - "User not found" → format_auth_user_not_found("User")
    - "Member not found" → format_auth_user_not_found("Member")
    - "Admin not found" → format_auth_user_not_found("Admin")
    - "Inactive user" → format_auth_user_inactive("User")
    - "Member account is inactive" → format_auth_user_inactive("Member")
    - "Admin account is inactive" → format_auth_user_inactive("Admin")
    - "Invalid user ID format" → CMessageTemplate.AUTH_INVALID_ID_FORMAT
    - "Member access required" → CMessageTemplate.AUTHZ_PERMISSION_REQUIRED
    - "Admin access required" → CMessageTemplate.AUTHZ_PERMISSION_REQUIRED
    - _Requirements: 5.2, 5.3, 12.1-12.7_

- [x] 8. 更新 user/service.py 使用消息模板
  - [x] 8.1 替换硬编码消息为 CMessageTemplate
    - "Invalid credentials" → CMessageTemplate.AUTH_INVALID_CREDENTIALS
    - "Business number already registered" → CMessageTemplate.VALIDATION_BUSINESS_NUMBER_IN_USE
    - "Email already registered" → CMessageTemplate.VALIDATION_EMAIL_IN_USE
    - "Failed to create member" → CMessageTemplate.VALIDATION_OPERATION_FAILED
    - "Account pending approval" → CMessageTemplate.USER_ACCOUNT_PENDING
    - "Account is suspended" → CMessageTemplate.USER_ACCOUNT_SUSPENDED
    - "Invalid reset token" → CMessageTemplate.USER_INVALID_RESET_TOKEN
    - "Reset token has expired" → CMessageTemplate.USER_RESET_TOKEN_EXPIRED
    - "Current password is incorrect" → CMessageTemplate.USER_CURRENT_PASSWORD_INCORRECT
    - _Requirements: 12.1-12.7_

- [x] 9. 更新 member/service.py 使用消息模板
  - [x] 9.1 替换 NotFoundError 使用 resource_type 参数
    - `raise NotFoundError("Member")` → `raise NotFoundError(resource_type="Member")`
    - _Requirements: 8.1, 12.1_

  - [x] 9.2 替换 ValidationError 使用消息模板
    - "Email already in use" → CMessageTemplate.VALIDATION_EMAIL_IN_USE
    - _Requirements: 12.1_

- [x] 10. 更新 content/service.py 使用消息模板
  - [x] 10.1 替换 NotFoundError 使用 resource_type 参数
    - `raise NotFoundError("Notice")` → `raise NotFoundError(resource_type="Notice")`
    - `raise NotFoundError("Press Release")` → `raise NotFoundError(resource_type="Press Release")`
    - `raise NotFoundError("Banner")` → `raise NotFoundError(resource_type="Banner")`
    - _Requirements: 8.1, 12.1_

- [x] 11. 更新 content/router.py 使用消息模板
  - [x] 11.1 替换 ValidationError 使用消息模板
    - "Invalid banner_key..." → CMessageTemplate.VALIDATION_INVALID_VALUE
    - "Image is required..." → CMessageTemplate.VALIDATION_REQUIRED_FIELD
    - "Invalid content_type..." → CMessageTemplate.VALIDATION_INVALID_VALUE
    - _Requirements: 12.1_

- [x] 12. 更新 messages/service.py 使用消息模板
  - [x] 12.1 替换 NotFoundError 使用 resource_type 参数
    - `raise NotFoundError("Message")` → `raise NotFoundError(resource_type="Message")`
    - `raise NotFoundError("Thread")` → `raise NotFoundError(resource_type="Thread")`
    - _Requirements: 8.1, 12.1_

  - [x] 12.2 替换 ValidationError 使用消息模板
    - "Failed to create message" → CMessageTemplate.VALIDATION_OPERATION_FAILED
    - "Only admins can send broadcast messages" → CMessageTemplate.MESSAGE_BROADCAST_ADMIN_ONLY
    - "No recipients specified" → CMessageTemplate.MESSAGE_NO_RECIPIENTS
    - "Failed to create broadcast" → CMessageTemplate.VALIDATION_OPERATION_FAILED
    - _Requirements: 12.1_

- [x] 13. 更新 project/service.py 使用消息模板
  - [x] 13.1 替换 NotFoundError 使用 resource_type 参数
    - `raise NotFoundError("Project")` → `raise NotFoundError(resource_type="Project")`
    - `raise NotFoundError("Project application")` → `raise NotFoundError(resource_type="Project application")`
    - _Requirements: 8.1, 12.1_

  - [x] 13.2 替换 ValidationError 使用消息模板
    - "Cannot apply to project..." → CMessageTemplate.PROJECT_INACTIVE
    - "Project already applied" → CMessageTemplate.PROJECT_ALREADY_APPLIED
    - _Requirements: 12.1_

- [x] 14. 更新 performance/service.py 使用消息模板
  - [x] 14.1 替换 NotFoundError 使用 resource_type 参数
    - `raise NotFoundError("Performance record")` → `raise NotFoundError(resource_type="Performance record")`
    - _Requirements: 8.1, 12.1_

  - [x] 14.2 替换 AuthorizationError 使用消息模板
    - "You don't have permission..." → CMessageTemplate.AUTHZ_NO_PERMISSION
    - _Requirements: 12.1_

  - [x] 14.3 替换 ValidationError 使用消息模板
    - "Cannot edit performance record..." → CMessageTemplate.PERFORMANCE_EDIT_NOT_ALLOWED
    - "Cannot delete performance record..." → CMessageTemplate.PERFORMANCE_DELETE_NOT_ALLOWED
    - "Cannot submit performance record..." → CMessageTemplate.PERFORMANCE_SUBMIT_NOT_ALLOWED
    - "Cannot approve performance record..." → CMessageTemplate.PERFORMANCE_APPROVE_NOT_ALLOWED
    - "Cannot reject performance record..." → CMessageTemplate.PERFORMANCE_REJECT_NOT_ALLOWED
    - "Cannot request revision..." → CMessageTemplate.PERFORMANCE_REVISION_NOT_ALLOWED
    - _Requirements: 12.1_

- [x] 15. 更新 support/service.py 使用消息模板
  - [x] 15.1 替换 NotFoundError 使用 resource_type 参数
    - `raise NotFoundError("FAQ")` → `raise NotFoundError(resource_type="FAQ")`
    - _Requirements: 8.1, 12.1_

- [x] 16. 更新 upload/service.py 使用消息模板
  - [x] 16.1 替换 NotFoundError 使用消息模板
    - "File not found" → CMessageTemplate.UPLOAD_FILE_NOT_FOUND
    - "文件不存在或已被删除..." → CMessageTemplate.UPLOAD_FILE_DELETED
    - _Requirements: 8.1, 12.1_

  - [x] 16.2 替换 ValidationError 使用消息模板
    - "File size..." → CMessageTemplate.VALIDATION_FILE_SIZE
    - "File extension..." → CMessageTemplate.VALIDATION_FILE_EXTENSION
    - "MIME type..." → CMessageTemplate.UPLOAD_MIME_TYPE_NOT_ALLOWED
    - "File type..." → CMessageTemplate.VALIDATION_FILE_TYPE
    - "Failed to create attachment record" → CMessageTemplate.VALIDATION_OPERATION_FAILED
    - "Failed to delete attachment record" → CMessageTemplate.VALIDATION_OPERATION_FAILED
    - _Requirements: 12.1_

  - [x] 16.3 替换 AuthenticationError 使用消息模板
    - "You don't have permission to access this file" → CMessageTemplate.AUTHZ_NO_PERMISSION
    - "You don't have permission to delete this file" → CMessageTemplate.AUTHZ_NO_PERMISSION
    - _Requirements: 12.1_

- [x] 17. 更新 logger/router.py 使用消息模板
  - [x] 17.1 替换 NotFoundError 使用 resource_type 参数
    - `raise NotFoundError("System log")` → `raise NotFoundError(resource_type="System log")`
    - `raise NotFoundError("Application log")` → `raise NotFoundError(resource_type="Application log")`
    - `raise NotFoundError("Error log")` → `raise NotFoundError(resource_type="Error log")`
    - `raise NotFoundError("Performance log")` → `raise NotFoundError(resource_type="Performance log")`
    - _Requirements: 8.1, 12.1_

- [x] 18. Checkpoint - 确保所有业务模块更新完成
  - 确保所有测试通过，如有问题请询问用户

- [ ]* 19. Write property tests for exception handling
  - [ ]* 19.1 Write property test for message template consistency
    - **Property 2: Exception Message Template Consistency**
    - **Validates: Requirements 12.1, 12.1.22, 12.1.23**

  - [ ]* 19.2 Write property test for exception middleware HTTP response mapping
    - **Property 4: Exception Middleware HTTP Response Mapping**
    - **Validates: Requirements 7.3**

  - [ ]* 19.3 Write property test for database error context
    - **Property 5: Database Error Context Completeness**
    - **Validates: Requirements 9.4**

  - [ ]* 19.4 Write property test for external service error context
    - **Property 6: External Service Error Context**
    - **Validates: Requirements 10.4**

- [x] 20. Final checkpoint - 确保所有测试通过
  - 运行所有单元测试和属性测试
  - 确保所有测试通过，如有问题请询问用户

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
