# Requirements Document

## Introduction

本文档定义了一个统一的 AOP（面向切面编程）日志系统，用于前端和后端的日志记录、追踪和监控。该系统支持多种日志类型（应用日志、异常日志、审计日志、系统日志、性能日志），提供会话级别（traceId）和请求级别（requestId）的追踪能力，并支持文件和数据库两种存储方式。

## Glossary

- **AOP (Aspect-Oriented Programming)**: 面向切面编程，一种编程范式，用于将横切关注点（如日志记录）与业务逻辑分离
- **traceId**: 会话追踪 ID，UUID 格式，在用户会话期间保持不变，用于关联同一用户的所有操作
- **requestId**: 请求追踪 ID，格式为 `{traceId}-{sequence}`，用于追踪单次 API 请求
- **Layer**: AOP 层，表示日志来源的系统层级（Service、Router、Auth、Store、Component、Hook、Performance、Middleware、Database、Audit）
- **Log Level**: 日志级别，包括 DEBUG、INFO、WARNING、ERROR、CRITICAL
- **Batch Processing**: 批处理，将多条日志聚合后一次性写入，提高性能
- **Deduplication**: 去重机制，防止短时间内重复记录相同日志
- **Sensitive Data Filtering**: 敏感信息过滤，自动脱敏密码、令牌等敏感字段
- **Web Vitals**: Web 性能指标，包括 FCP、LCP、TTI 等

## Requirements

### Requirement 1: 日志核心功能

**User Story:** As a developer, I want a unified logging core that handles log levels, formatting, and context management, so that I can consistently record logs across the application.

#### Acceptance Criteria

1. WHEN a log entry is created THEN the Logging System SHALL include all required fields: source, level, layer, message, file, line, function, trace_id, and created_at
2. WHEN a log entry contains optional fields (request_id, user_id, extra_data) THEN the Logging System SHALL include those fields in the log record
3. WHEN a log level is set to DEBUG THEN the Logging System SHALL assign a numeric value of 10 to that level
4. WHEN a log level is set to INFO THEN the Logging System SHALL assign a numeric value of 20 to that level
5. WHEN a log level is set to WARNING THEN the Logging System SHALL assign a numeric value of 30 to that level
6. WHEN a log level is set to ERROR THEN the Logging System SHALL assign a numeric value of 40 to that level
7. WHEN a log level is set to CRITICAL THEN the Logging System SHALL assign a numeric value of 50 to that level
8. WHEN a log entry is formatted THEN the Logging System SHALL produce a JSON object with the timestamp in `yyyy-MM-dd HH:mm:ss.SSS` format

### Requirement 2: 追踪 ID 管理

**User Story:** As a developer, I want to track user sessions and individual requests with unique identifiers, so that I can correlate logs across the entire request lifecycle.

#### Acceptance Criteria

1. WHEN a user session starts THEN the Logging System SHALL generate a UUID v4 format traceId
2. WHEN an API request is initiated THEN the Logging System SHALL generate a requestId in the format `{traceId}-{sequence}`
3. WHEN the frontend sends an API request THEN the Logging System SHALL include the traceId in the HTTP header `X-Trace-Id`
4. WHEN the frontend sends an API request THEN the Logging System SHALL include the requestId in the HTTP header `X-Request-Id`
5. WHEN the backend receives a request with `X-Trace-Id` header THEN the Logging System SHALL use that traceId for all related logs
6. WHEN the backend receives a request without `X-Trace-Id` header THEN the Logging System SHALL generate a new traceId

### Requirement 3: 前端日志拦截器

**User Story:** As a frontend developer, I want automatic logging interceptors for API calls, routing, and authentication, so that I can capture important events without manual instrumentation.

#### Acceptance Criteria

1. WHEN an API request is sent THEN the API Interceptor SHALL record the request method, path, and start time
2. WHEN an API response is received THEN the API Interceptor SHALL record the response status, duration, and log level based on status code
3. WHEN an API request takes longer than 2 seconds THEN the API Interceptor SHALL log a WARNING level entry with slow API indication
4. WHEN a route change occurs THEN the Router Interceptor SHALL record the new path and navigation action (PUSH, POP, REPLACE)
5. WHEN a user performs login, logout, register, or token refresh THEN the Auth Interceptor SHALL record the authentication action and result

### Requirement 4: 前端日志 Hooks

**User Story:** As a frontend developer, I want React hooks for logging store changes, hook executions, component lifecycles, and performance metrics, so that I can monitor application behavior at different levels.

#### Acceptance Criteria

1. WHEN a store state changes THEN the useStoreLog Hook SHALL record the store name and action that caused the change
2. WHEN a custom hook executes THEN the useHookLog Hook SHALL record the hook name and execution context
3. WHEN a component mounts THEN the useComponentLog Hook SHALL record the component name and mount event
4. WHEN a component unmounts THEN the useComponentLog Hook SHALL record the component name and unmount event
5. WHEN a component render exceeds 100ms THEN the usePerformanceLog Hook SHALL log a WARNING level entry
6. WHEN Web Vitals metrics are collected THEN the usePerformanceLog Hook SHALL record FCP, LCP, and TTI values
7. WHEN FCP exceeds 2 seconds THEN the usePerformanceLog Hook SHALL log a WARNING level entry
8. WHEN LCP exceeds 2.5 seconds THEN the usePerformanceLog Hook SHALL log a WARNING level entry
9. WHEN TTI exceeds 3.8 seconds THEN the usePerformanceLog Hook SHALL log a WARNING level entry

### Requirement 5: 前端日志上报

**User Story:** As a frontend developer, I want logs to be batched and sent to the backend efficiently with retry capability, so that logging does not impact application performance.

#### Acceptance Criteria

1. WHEN 10 log entries accumulate THEN the Log Transport SHALL send a batch request to `/api/v1/logging/frontend/logs`
2. WHEN 5 seconds elapse since the last batch THEN the Log Transport SHALL send any pending log entries
3. WHEN a batch upload fails THEN the Log Transport SHALL retry up to 3 times with exponential backoff (1s, 2s, 4s)
4. WHEN the same log message occurs within 10 seconds THEN the Deduplication Module SHALL prevent duplicate entries from being recorded
5. WHEN a log entry contains sensitive fields (password, token) THEN the Log Transport SHALL filter those fields before sending

### Requirement 6: 后端 HTTP 中间件

**User Story:** As a backend developer, I want automatic HTTP request/response logging through middleware, so that all API calls are consistently recorded without manual instrumentation.

#### Acceptance Criteria

1. WHEN an HTTP request is received THEN the Logging Middleware SHALL record the request method, path, and client IP address
2. WHEN an HTTP response is sent THEN the Logging Middleware SHALL record the response status code and request duration
3. WHEN an HTTP request takes longer than 1 second THEN the Logging Middleware SHALL log a WARNING level entry
4. WHEN the Logging Middleware processes a request THEN the Logging Middleware SHALL extract or generate traceId and requestId from headers

### Requirement 7: 后端数据库 AOP 封装

**User Story:** As a backend developer, I want automatic logging of database operations through an AOP-wrapped Supabase client, so that all data changes are tracked without modifying business logic.

#### Acceptance Criteria

1. WHEN an INSERT operation is executed THEN the LoggedSupabaseClient SHALL record the table name and operation type
2. WHEN an UPDATE operation is executed THEN the LoggedSupabaseClient SHALL record the table name and operation type
3. WHEN a DELETE operation is executed THEN the LoggedSupabaseClient SHALL record the table name and operation type
4. WHEN a database query takes longer than 500ms THEN the LoggedSupabaseClient SHALL log a WARNING level entry

### Requirement 8: 后端审计日志

**User Story:** As a system administrator, I want audit logs for sensitive operations, so that I can track who performed what actions on which resources.

#### Acceptance Criteria

1. WHEN a function decorated with @audit_log is called THEN the Audit Service SHALL record the action, resource_type, and resource_id
2. WHEN an audit log is created THEN the Audit Service SHALL include the user_id of the actor
3. WHEN an audit log is created THEN the Audit Service SHALL write to both the audit_logs database table and audit.log file

### Requirement 9: 日志存储 - 文件

**User Story:** As a system administrator, I want logs written to rotating files with configurable retention, so that I can manage disk space while maintaining log history.

#### Acceptance Criteria

1. WHEN a log entry is written to file THEN the File Writer SHALL use asynchronous I/O to avoid blocking the main thread
2. WHEN a new day begins THEN the File Writer SHALL rotate to a new log file
3. WHEN a log file exceeds 100MB THEN the File Writer SHALL rotate to a new file
4. WHEN log files are older than 30 days THEN the File Writer SHALL automatically delete those files
5. WHEN writing application logs THEN the File Writer SHALL write to `app.log`
6. WHEN writing error logs THEN the File Writer SHALL write to `error.log`
7. WHEN writing audit logs THEN the File Writer SHALL write to `audit.log`
8. WHEN writing system logs THEN the File Writer SHALL write to `system.log`
9. WHEN writing performance logs THEN the File Writer SHALL write to `performance.log`

### Requirement 10: 日志存储 - 数据库

**User Story:** As a system administrator, I want logs stored in database tables with efficient batch processing, so that I can query and analyze logs effectively.

#### Acceptance Criteria

1. WHEN application logs are written THEN the DB Writer SHALL batch 50 entries or wait 5 seconds before writing to `app_logs` table
2. WHEN error logs are written THEN the DB Writer SHALL immediately write each entry to `error_logs` table using async thread
3. WHEN audit logs are written THEN the DB Writer SHALL immediately write each entry to `audit_logs` table using async thread pool
4. WHEN system logs are written THEN the DB Writer SHALL immediately write each entry to `system_logs` table using async thread
5. WHEN performance logs are written THEN the DB Writer SHALL batch 50 entries or wait 5 seconds before writing to `performance_logs` table

### Requirement 11: 敏感信息过滤

**User Story:** As a security officer, I want sensitive information automatically filtered from logs, so that credentials and personal data are not exposed in log storage.

#### Acceptance Criteria

1. WHEN a log entry contains a field named "password" THEN the Sensitive Filter SHALL replace the value with "[FILTERED]"
2. WHEN a log entry contains a field named "token" THEN the Sensitive Filter SHALL replace the value with "[FILTERED]"
3. WHEN a log entry contains a field matching sensitive patterns THEN the Sensitive Filter SHALL apply filtering before storage

### Requirement 12: 异常处理日志

**User Story:** As a developer, I want all exceptions automatically logged with full context, so that I can diagnose and fix issues quickly.

#### Acceptance Criteria

1. WHEN an unhandled exception occurs in the backend THEN the Exception Handler SHALL log an ERROR level entry with exception type and stack trace
2. WHEN an unhandled exception occurs in the frontend THEN the Error Boundary SHALL log an ERROR level entry with component stack
3. WHEN an exception is logged THEN the Exception Handler SHALL include the traceId and requestId for correlation
