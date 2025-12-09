# Frontend Logging Guide / 前端日志指南

**文档版本**: 1.1  
**创建日期**: 2025-12-02  
**更新日期**: 2025-12-02  
**状态**: 进行中（装饰器方式待实现）  
**适用范围**: 仅限前端（Frontend）日志系统

---

## 📌 文档说明

本文档是**前端日志系统**的完整指南，包含日志记录机制、使用方法和最佳实践，不包含后端日志相关内容。

**文档范围**：
- ✅ 前端服务层（service.js）日志记录
- ✅ 前端 API 拦截器自动日志
- ✅ 前端异常捕获和记录
- ✅ 前端日志服务使用方法
- ❌ 不包含后端日志相关内容

---

## 📋 一、目标和原则

### 核心目标

1. **完整的用户操作追踪**：记录用户在前端的所有关键操作和交互
2. **统一的日志格式**：所有前端日志使用统一的格式，便于分析和追踪
3. **自动化的异常记录**：所有前端异常由全局异常处理器自动捕获和记录
4. **API 请求自动记录**：所有 API 请求和响应自动记录，无需手动调用
5. **前后端日志关联**：通过 `trace_id` 关联前后端日志，实现完整的请求追踪

### 日志记录原则

| 层级 | 职责 | 记录内容 |
|------|------|---------|
| **API 拦截器** | 自动记录 | 所有 API 请求和响应（方法、路径、状态码、耗时、错误信息） |
| **服务层 (Service)** | 手动记录 | 业务操作日志（成功、失败、操作详情）<br/>- 使用 `loggerService.info()` 记录业务日志<br/>- 使用 `loggerService.error()` 记录错误日志 |
| **全局异常处理器** | 自动记录 | 所有未捕获的异常（JavaScript 错误、Promise 拒绝） |
| **用户交互** | 可选记录 | 关键用户操作（登录、登出、重要表单提交等） |

### 日志类型说明

| 日志类型 | 服务 | 存储位置 | 记录时机 | 用途 |
|---------|------|---------|---------|------|
| **业务日志** | `loggerService` | 后端数据库 `app_logs` 表 | 服务层手动记录 | 用户操作追踪、调试、监控 |
| **异常日志** | `exceptionService` | 后端数据库 `app_exceptions` 表 | 异常发生时自动记录 | 异常追踪、错误分析 |
| **API 日志** | API 拦截器自动记录 | 后端数据库 `app_logs` 表 | API 请求/响应时自动记录 | API 调用追踪、性能监控 |

---

## 📝 二、自动日志记录机制

### 2.1 API 请求/响应自动记录

所有 API 请求和响应通过 Axios 拦截器自动记录，无需手动调用日志服务。

**实现位置**：`frontend/src/shared/services/api.service.js`

**工作原理**：
- 请求拦截器：自动添加 `X-Trace-Id` 头，关联前后端日志
- 响应拦截器：自动记录成功的 API 响应（200-299）和服务器错误（500+）
- 错误拦截器：自动记录所有 API 错误（4xx 和 5xx），重要错误自动记录为异常

**自动记录内容**：
- 请求方法（GET, POST, PUT, DELETE 等）
- 请求路径
- 请求数据（自动脱敏敏感信息）
- 响应状态码
- 响应耗时（duration_ms）
- 错误信息（如果有）

**自动脱敏**：
- 敏感字段自动脱敏：`password`, `password_hash`, `token`, `access_token`, `refresh_token`, `secret`, `api_key`
- 大文件自动截断：FormData 和大型数据自动处理

**示例日志**：

```json
{
  "source": "frontend",
  "level": "INFO",
  "message": "API: POST /api/v1/auth/login -> 200",
  "module": null,
  "function": null,
  "trace_id": "1701504045123-abc123def",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "request_method": "POST",
  "request_path": "/api/v1/auth/login",
  "request_data": {
    "business_number": "123-45-67890",
    "password": "***REDACTED***"
  },
  "response_status": 200,
  "duration_ms": 234,
  "extra_data": {
    "user_agent": "Mozilla/5.0...",
    "url": "https://example.com/login",
    "referrer": "https://example.com/",
    "language": "ko-KR",
    "screen": { "width": 1920, "height": 1080 },
    "viewport": { "width": 1920, "height": 937 }
  }
}
```

**跳过日志记录**：
- 日志端点（`/logging/`）和异常端点（`/exceptions/`）自动跳过，避免递归

### 2.2 全局异常自动捕获

所有未捕获的 JavaScript 错误和 Promise 拒绝由全局异常处理器自动捕获和记录。

**实现位置**：`frontend/src/shared/services/exception.service.js`

**工作原理**：
- `window.addEventListener('error')`：捕获所有 JavaScript 错误
- `window.addEventListener('unhandledrejection')`：捕获所有未处理的 Promise 拒绝
- 自动记录异常详情、堆栈跟踪、上下文信息
- **全局自动捕获**：无需手动调用，所有未捕获的异常都会自动记录

**全局异常捕获范围**：
- ✅ JavaScript 运行时错误（TypeError, ReferenceError 等）
- ✅ 未处理的 Promise 拒绝（unhandledrejection）
- ✅ 异步操作中的错误
- ✅ React 组件错误（通过 ErrorBoundary 捕获）

**自动记录内容**：
- 异常类型（Error, TypeError, ReferenceError 等）
- 异常消息
- 堆栈跟踪（stack trace）
- 文件名、行号、列号
- 请求上下文（路径、方法、数据等）
- 客户端信息（User Agent、URL、屏幕尺寸等）

**示例异常日志**：

```json
{
  "source": "frontend",
  "exception_type": "TypeError",
  "exception_message": "Cannot read property 'id' of undefined",
  "trace_id": "1701504045123-abc123def",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "request_method": "GET",
  "request_path": "/member/profile",
  "stack_trace": "TypeError: Cannot read property 'id' of undefined\n    at ProfileComponent...",
  "exception_details": {
    "name": "TypeError",
    "message": "Cannot read property 'id' of undefined",
    "fileName": "ProfileComponent.jsx",
    "lineNumber": 42,
    "columnNumber": 15
  },
  "context_data": {
    "user_agent": "Mozilla/5.0...",
    "url": "https://example.com/member/profile",
    "referrer": "https://example.com/login",
    "language": "ko-KR",
    "screen": { "width": 1920, "height": 1080 },
    "viewport": { "width": 1920, "height": 937 }
  }
}
```

### 2.3 Trace ID 关联机制

前端生成的 `trace_id` 通过 HTTP 头 `X-Trace-Id` 传递给后端，实现前后端日志关联。

**实现位置**：
- 前端：`frontend/src/shared/services/logger.service.js`（生成 trace_id）
- 前端：`frontend/src/shared/services/api.service.js`（传递 trace_id）
- 后端：自动接收并关联日志

**工作原理**：
1. 前端 `LoggerService` 初始化时生成唯一的 `trace_id`
2. 所有 API 请求自动在 `X-Trace-Id` 头中携带 `trace_id`
3. 后端接收 `trace_id` 并关联所有相关日志
4. 前后端日志可以通过相同的 `trace_id` 进行关联查询

**Trace ID 格式**：
```
{timestamp}-{random_string}
例如：1701504045123-abc123def
```

### 2.4 业务日志自动记录（装饰器方式）

业务日志可以通过 `@autoLog` 装饰器自动记录，无需手动调用 `loggerService.info()` 或 `loggerService.error()`。

**实现位置**：`frontend/src/shared/utils/decorators.js`（待实现）

**工作原理**：
- `@autoLog` 是一个装饰器工厂函数，接受参数并返回装饰器
- 装饰器包装服务函数，在执行前后自动记录日志
- 自动提取资源ID、结果数量等信息
- 自动处理异常并记录错误日志
- 自动关联请求上下文（trace_id, user_id, request_path等）

**使用示例**：

```javascript
import { autoLog } from '@shared/utils/decorators';

class AuthService {
  @autoLog('login', { log_resource_id: true })
  async login(credentials) {
    const response = await apiService.post('/api/v1/auth/login', credentials);
    if (response.access_token) {
      setStorage(ACCESS_TOKEN_KEY, response.access_token);
      setStorage('user_info', response.user);
    }
    return response;
    // 自动记录成功日志，包含 user.id
  }
}
```

**装饰器参数**：
- `operationName`: 操作名称（必需）
- `successMessage`: 自定义成功消息（可选）
- `errorMessage`: 自定义错误消息（可选）
- `logResourceId`: 是否提取并记录资源ID（默认：true）
- `logResultCount`: 是否提取并记录结果数量（默认：false）
- `logLevel`: 成功日志级别（默认："INFO"）

**自动提取功能**：
- 从返回值自动提取资源ID（支持对象、数组等）
- 从返回值自动提取结果数量（支持数组、对象等）
- 自动处理异常并记录错误日志
- 自动关联请求上下文信息

**装饰器执行顺序**：
- 装饰器从下往上执行
- 多个装饰器可以组合使用

---

## 🔧 三、日志服务使用方法

### 3.1 日志服务（LoggerService）

#### 方式一：手动调用（当前方式）

**导入方式**：

```javascript
import loggerService from '@shared/services/logger.service';
```

**导入方式**：

```javascript
import loggerService from '@shared/services/logger.service';
```

**日志级别**：

```javascript
import { LOG_LEVELS } from '@shared/services/logger.service';

// 可用级别：DEBUG, INFO, WARNING, ERROR, CRITICAL
```

**基本用法**：

```javascript
// 记录信息日志
loggerService.info('User logged in', {
  module: 'AuthService',
  function: 'login',
  user_id: user.id
});

// 记录错误日志
loggerService.error('Login failed', {
  module: 'AuthService',
  function: 'login',
  error_message: error.message,
  error_code: 'LOGIN_FAILED'
});

// 记录警告日志
loggerService.warn('Token expired', {
  module: 'AuthService',
  function: 'refreshToken'
});

// 记录调试日志
loggerService.debug('Processing request', {
  module: 'AuthService',
  function: 'processRequest',
  request_data: requestData
});

// 记录严重错误日志
loggerService.critical('System error', {
  module: 'SystemService',
  function: 'criticalOperation',
  error_message: error.message
});
```

**日志参数说明**：

| 参数 | 类型 | 说明 | 必需 |
|------|------|------|------|
| `message` | string | 日志消息 | ✅ |
| `extra` | object | 额外信息 | ❌ |

**extra 对象常用字段**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `module` | string | 模块名称（如 'AuthService', 'MemberService'） |
| `function` | string | 函数名称 |
| `request_path` | string | 请求路径 |
| `request_method` | string | 请求方法（GET, POST, PUT, DELETE） |
| `request_data` | object | 请求数据（自动脱敏） |
| `response_status` | number | 响应状态码 |
| `duration_ms` | number | 请求耗时（毫秒） |
| `user_id` | string | 用户 ID |
| `error_message` | string | 错误消息 |
| `error_code` | string | 错误代码 |
| `extra_data` | object | 额外的上下文数据 |

**自动功能**：
- ✅ 自动获取当前用户 ID（从 localStorage）
- ✅ 自动获取客户端信息（User Agent、URL、屏幕尺寸等）
- ✅ 自动脱敏敏感信息（password, token 等）
- ✅ 自动生成和关联 trace_id
- ✅ 自动去重（10秒窗口内相同日志只记录一次）
- ✅ 开发环境自动输出到控制台（仅 WARNING、ERROR、CRITICAL）

#### 方式二：装饰器自动记录（推荐方式）

**导入方式**：

```javascript
import { autoLog } from '@shared/utils/decorators';
```

**使用示例**：

```javascript
import { autoLog } from '@shared/utils/decorators';
import apiService from './api.service';

class MemberService {
  // 创建操作 - 自动记录资源ID
  @autoLog('create_member', { logResourceId: true })
  async createMember(data) {
    const response = await apiService.post('/api/v1/members', data);
    return response;
    // 自动记录成功日志，包含 member.id
  }

  // 列表查询 - 自动记录结果数量
  @autoLog('list_members', { logResultCount: true })
  async listMembers(params = {}) {
    const response = await apiService.get('/api/v1/members', { params });
    return response;
    // 自动记录成功日志，包含 total 数量
  }

  // 更新操作 - 自定义消息
  @autoLog('update_member', {
    successMessage: 'Member updated successfully',
    logResourceId: true
  })
  async updateMember(id, data) {
    const response = await apiService.put(`/api/v1/members/${id}`, data);
    return response;
    // 自动记录成功日志，包含自定义消息和 member.id
  }
}
```

**装饰器优势**：
- ✅ 代码更简洁，减少重复代码
- ✅ 自动提取资源ID和结果数量
- ✅ 自动处理成功和失败情况
- ✅ 自动关联请求上下文（trace_id, user_id等）
- ✅ 统一日志格式，便于维护

**装饰器 vs 手动调用**：

| 特性 | 装饰器方式 | 手动调用方式 |
|------|-----------|------------|
| 代码简洁性 | ✅ 更简洁 | ❌ 需要手动调用 |
| 自动提取资源ID | ✅ 自动 | ❌ 需要手动提取 |
| 自动处理异常 | ✅ 自动 | ❌ 需要 try-catch |
| 灵活性 | ⚠️ 有限 | ✅ 完全控制 |
| 适用场景 | 标准 CRUD 操作 | 复杂业务逻辑 |

### 3.2 异常服务（ExceptionService）

#### 方式一：手动调用（当前方式）

**导入方式**：

```javascript
import exceptionService from '@shared/services/exception.service';
```

**基本用法**：

```javascript
try {
  // 业务逻辑
  await someOperation();
} catch (error) {
  // 记录异常
  exceptionService.recordException(error, {
    request_method: 'POST',
    request_path: '/api/v1/members',
    error_code: 'OPERATION_FAILED',
    status_code: 500,
    request_data: requestData
  });
  
  // 重新抛出异常（如果需要）
  throw error;
}
```

**异常参数说明**：

| 参数 | 类型 | 说明 | 必需 |
|------|------|------|------|
| `exception` | Error | 异常对象 | ✅ |
| `context` | object | 上下文信息 | ❌ |

**context 对象常用字段**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `request_method` | string | 请求方法 |
| `request_path` | string | 请求路径 |
| `request_data` | object | 请求数据（自动脱敏） |
| `error_code` | string | 错误代码 |
| `status_code` | number | HTTP 状态码 |
| `trace_id` | string | 追踪 ID（可选，默认自动生成） |
| `context_data` | object | 额外的上下文数据 |

**自动功能**：
- ✅ 自动提取异常详情（类型、消息、堆栈跟踪）
- ✅ 自动获取客户端信息
- ✅ 自动脱敏敏感信息
- ✅ 自动生成和关联 trace_id

#### 方式二：全局自动捕获（推荐方式）

**全局异常捕获**：所有未捕获的异常都会自动记录，无需手动调用。

**工作原理**：
- 在 `exception.service.js` 初始化时自动注册全局异常监听器
- 捕获所有 JavaScript 错误和未处理的 Promise 拒绝
- 自动记录异常详情、堆栈跟踪、上下文信息

**自动捕获范围**：
- ✅ JavaScript 运行时错误
- ✅ 未处理的 Promise 拒绝
- ✅ 异步操作中的错误
- ✅ React 组件错误（通过 ErrorBoundary）

**使用建议**：
- **标准错误**：依赖全局异常捕获，无需手动调用
- **业务异常**：在 catch 块中手动调用，添加业务上下文信息
- **预期错误**：不需要记录（如用户输入验证失败）

**示例**：

```javascript
// 标准错误 - 依赖全局捕获
async function fetchData() {
  const response = await apiService.get('/api/v1/data');
  return response;
  // 如果出错，全局异常处理器会自动捕获并记录
}

// 业务异常 - 手动调用，添加业务上下文
async function approveMember(id) {
  try {
    const response = await apiService.put(`/api/v1/members/${id}/approve`);
    return response;
  } catch (error) {
    // 添加业务上下文信息
    exceptionService.recordException(error, {
      request_method: 'PUT',
      request_path: `/api/v1/members/${id}/approve`,
      error_code: 'APPROVE_MEMBER_FAILED',
      context_data: { member_id: id }
    });
    throw error;
  }
}
```

---

## 📝 四、服务层日志记录标准

### 4.1 装饰器方式（推荐）

#### 模板 1: 创建操作（使用装饰器）

```javascript
import { autoLog } from '@shared/utils/decorators';

class MemberService {
  @autoLog('create_member', { logResourceId: true })
  async createMember(data) {
    const response = await apiService.post('/api/v1/members', data);
    return response;
    // 装饰器自动记录：成功日志（包含 member.id）+ 失败日志
  }
}
```

#### 模板 2: 列表查询（使用装饰器）

```javascript
import { autoLog } from '@shared/utils/decorators';

class MemberService {
  @autoLog('list_members', { logResultCount: true })
  async listMembers(params = {}) {
    const response = await apiService.get('/api/v1/members', { params });
    return response;
    // 装饰器自动记录：成功日志（包含 total 数量）+ 失败日志
  }
}
```

#### 模板 3: 更新操作（使用装饰器）

```javascript
import { autoLog } from '@shared/utils/decorators';

class MemberService {
  @autoLog('update_member', {
    successMessage: 'Member updated successfully',
    logResourceId: true
  })
  async updateMember(id, data) {
    const response = await apiService.put(`/api/v1/members/${id}`, data);
    return response;
    // 装饰器自动记录：成功日志（自定义消息 + member.id）+ 失败日志
  }
}
```

#### 模板 4: 删除操作（使用装饰器）

```javascript
import { autoLog } from '@shared/utils/decorators';

class MemberService {
  @autoLog('delete_member', { logResourceId: true })
  async deleteMember(id) {
    await apiService.delete(`/api/v1/members/${id}`);
    // 装饰器自动记录：成功日志（包含 member_id）+ 失败日志
  }
}
```

### 4.2 手动调用方式（备选）

#### 模板 1: 成功操作日志

```javascript
async function createMember(data) {
  try {
    loggerService.info('Create member attempt', {
      module: 'MemberService',
      function: 'createMember',
      request_path: '/api/v1/members'
    });

    const response = await apiService.post('/api/v1/members', data);
    
    loggerService.info('Create member successful', {
      module: 'MemberService',
      function: 'createMember',
      user_id: response.id,
      response_status: 200
    });
    
    return response;
  } catch (error) {
    loggerService.error('Create member failed', {
      module: 'MemberService',
      function: 'createMember',
      request_path: '/api/v1/members',
      error_message: error.message,
      error_code: error.code
    });
    
    exceptionService.recordException(error, {
      request_method: 'POST',
      request_path: '/api/v1/members',
      error_code: error.code || 'CREATE_MEMBER_FAILED'
    });
    
    throw error;
  }
}
```

#### 模板 2: 查询操作日志

```javascript
async function listMembers(params = {}) {
  try {
    loggerService.info('List members', {
      module: 'MemberService',
      function: 'listMembers',
      request_path: '/api/v1/members'
    });

    const response = await apiService.get('/api/v1/members', { params });
    
    loggerService.info('List members successful', {
      module: 'MemberService',
      function: 'listMembers',
      response_status: 200,
      result_count: response.items?.length || 0
    });
    
    return response;
  } catch (error) {
    loggerService.error('List members failed', {
      module: 'MemberService',
      function: 'listMembers',
      request_path: '/api/v1/members',
      error_message: error.message
    });
    
    throw error;
  }
}
```

#### 模板 3: 更新操作日志

```javascript
async function updateMember(id, data) {
  try {
    loggerService.info('Update member attempt', {
      module: 'MemberService',
      function: 'updateMember',
      request_path: `/api/v1/members/${id}`,
      member_id: id
    });

    const response = await apiService.put(`/api/v1/members/${id}`, data);
    
    loggerService.info('Update member successful', {
      module: 'MemberService',
      function: 'updateMember',
      member_id: id,
      response_status: 200
    });
    
    return response;
  } catch (error) {
    loggerService.error('Update member failed', {
      module: 'MemberService',
      function: 'updateMember',
      request_path: `/api/v1/members/${id}`,
      member_id: id,
      error_message: error.message
    });
    
    exceptionService.recordException(error, {
      request_method: 'PUT',
      request_path: `/api/v1/members/${id}`,
      error_code: error.code || 'UPDATE_MEMBER_FAILED'
    });
    
    throw error;
  }
}
```

#### 模板 4: 删除操作日志

```javascript
async function deleteMember(id) {
  try {
    loggerService.info('Delete member attempt', {
      module: 'MemberService',
      function: 'deleteMember',
      request_path: `/api/v1/members/${id}`,
      member_id: id
    });

    await apiService.delete(`/api/v1/members/${id}`);
    
    loggerService.info('Delete member successful', {
      module: 'MemberService',
      function: 'deleteMember',
      member_id: id,
      response_status: 200
    });
  } catch (error) {
    loggerService.error('Delete member failed', {
      module: 'MemberService',
      function: 'deleteMember',
      request_path: `/api/v1/members/${id}`,
      member_id: id,
      error_message: error.message
    });
    
    exceptionService.recordException(error, {
      request_method: 'DELETE',
      request_path: `/api/v1/members/${id}`,
      error_code: error.code || 'DELETE_MEMBER_FAILED'
    });
    
    throw error;
  }
}
```

### 4.3 日志记录最佳实践

#### ✅ 应该做的

1. **优先使用装饰器方式**：
   - 标准 CRUD 操作使用 `@autoLog` 装饰器
   - 减少重复代码，提高代码可维护性
   - 统一日志格式，便于分析和追踪

2. **记录关键操作**：
   - 用户登录/登出
   - 数据创建/更新/删除
   - 重要业务操作（审批、提交等）

3. **记录操作结果**：
   - 成功操作：记录成功日志，包含关键信息（如资源 ID）
   - 失败操作：记录错误日志，包含错误详情
   - 使用装饰器时，自动处理成功和失败情况

3. **使用有意义的日志消息**：
   ```javascript
   // ✅ 好的示例
   loggerService.info('Member approved successfully', {
     module: 'MemberService',
     function: 'approveMember',
     member_id: memberId
   });
   
   // ❌ 不好的示例
   loggerService.info('OK', {});
   ```

4. **包含上下文信息**：
   ```javascript
   loggerService.info('Create member', {
     module: 'MemberService',
     function: 'createMember',
     request_path: '/api/v1/members',
     request_method: 'POST',
     user_id: currentUser.id
   });
   ```

5. **记录异常详情**：
   ```javascript
   catch (error) {
     loggerService.error('Operation failed', {
       module: 'ServiceName',
       function: 'functionName',
       error_message: error.message,
       error_code: error.code,
       request_path: '/api/v1/endpoint'
     });
     
     exceptionService.recordException(error, {
       request_method: 'POST',
       request_path: '/api/v1/endpoint',
       error_code: error.code || 'OPERATION_FAILED'
     });
   }
   ```

#### ❌ 不应该做的

1. **不要记录敏感信息**：
   ```javascript
   // ❌ 不好的示例（虽然会自动脱敏，但最好避免）
   loggerService.info('Login', {
     password: credentials.password  // 会被自动脱敏，但最好不传
   });
   ```

2. **不要过度记录**：
   ```javascript
   // ❌ 不好的示例（每个循环都记录）
   items.forEach(item => {
     loggerService.info('Processing item', { item_id: item.id });
   });
   
   // ✅ 好的示例（只记录汇总）
   loggerService.info('Processed items', {
     total_count: items.length
   });
   ```

3. **不要记录无意义的信息**：
   ```javascript
   // ❌ 不好的示例
   loggerService.info('Function called', {});
   
   // ✅ 好的示例
   loggerService.info('User profile updated', {
     user_id: userId,
     fields_updated: ['name', 'email']
   });
   ```

4. **不要忽略错误日志**：
   ```javascript
   // ❌ 不好的示例（只记录成功，忽略失败）
   try {
     await operation();
     loggerService.info('Success');
   } catch (error) {
     // 没有记录错误
   }
   
   // ✅ 好的示例（手动方式）
   try {
     await operation();
     loggerService.info('Success');
   } catch (error) {
     loggerService.error('Failed', { error_message: error.message });
     exceptionService.recordException(error, {});
   }
   
   // ✅ 更好的示例（装饰器方式）
   @autoLog('operation')
   async operation() {
     await someOperation();
     // 装饰器自动处理成功和失败日志
   }
   ```

5. **利用全局异常捕获**：
   ```javascript
   // ❌ 不好的示例（手动捕获所有异常）
   try {
     await operation1();
   } catch (error) {
     exceptionService.recordException(error, {});
   }
   
   try {
     await operation2();
   } catch (error) {
     exceptionService.recordException(error, {});
   }
   
   // ✅ 好的示例（依赖全局异常捕获）
   await operation1(); // 如果出错，全局处理器自动捕获
   await operation2(); // 如果出错，全局处理器自动捕获
   
   // ✅ 业务异常（需要添加上下文）
   try {
     await businessOperation();
   } catch (error) {
     exceptionService.recordException(error, {
       error_code: 'BUSINESS_OPERATION_FAILED',
       context_data: { /* 业务上下文 */ }
     });
     throw error;
   }
   ```

---

## 🔍 五、日志查询和分析

### 5.1 前后端日志关联

通过 `trace_id` 可以关联前后端日志，实现完整的请求追踪。

**查询示例**：

1. **前端日志**（通过 trace_id 查询）：
   ```javascript
   // 前端日志包含 trace_id
   {
     "trace_id": "1701504045123-abc123def",
     "message": "API: POST /api/v1/auth/login -> 200",
     "source": "frontend"
   }
   ```

2. **后端日志**（通过相同的 trace_id 查询）：
   ```json
   {
     "trace_id": "1701504045123-abc123def",
     "message": "HTTP POST /api/v1/auth/login -> 200",
     "source": "backend"
   }
   ```

3. **关联查询**：
   - 在前端日志中找到 `trace_id`
   - 在后端日志中搜索相同的 `trace_id`
   - 可以查看完整的请求生命周期

### 5.2 日志级别使用指南

| 级别 | 使用场景 | 示例 |
|------|---------|------|
| **DEBUG** | 详细的调试信息，开发时使用 | 函数参数、中间状态、详细流程 |
| **INFO** | 一般信息，正常操作流程 | 用户登录、数据创建、操作成功 |
| **WARNING** | 警告信息，可能的问题 | API 返回 4xx 错误、数据验证失败 |
| **ERROR** | 错误信息，操作失败 | API 返回 5xx 错误、业务逻辑错误 |
| **CRITICAL** | 严重错误，系统级问题 | 系统崩溃、数据丢失、安全漏洞 |

### 5.3 日志去重机制

前端日志服务自动去重，避免重复日志：

- **去重窗口**：10 秒
- **去重规则**：相同级别、相同请求方法、相同路径、相同状态码、相同消息的日志在 10 秒内只记录一次
- **例外**：DEBUG 级别默认不去重（除非设置 `force_dedup: true`）

---

## 📊 六、已实现的服务模块

### ✅ 已实现日志记录的服务

| 模块 | 服务文件 | 日志方式 | 状态 |
|------|---------|---------|------|
| **认证模块** | `auth.service.js` | 手动调用 | ✅ 已完成 |
| **会员管理模块** | `member.service.js` | 手动调用 | ✅ 已完成 |
| **管理员模块** | `admin.service.js` | 手动调用 | ✅ 已完成 |
| **绩效管理模块** | `performance.service.js` | 手动调用 | ✅ 已完成 |
| **项目管理模块** | `project.service.js` | 手动调用 | ✅ 已完成 |
| **内容管理模块** | `content.service.js` | 手动调用 | ✅ 已完成 |
| **支持模块** | `support.service.js` | 手动调用 | ✅ 已完成 |
| **文件上传模块** | `upload.service.js` | 手动调用 | ✅ 已完成 |
| **API 服务** | `api.service.js` | 自动记录（拦截器） | ✅ 已完成 |
| **异常服务** | `exception.service.js` | 全局自动捕获 | ✅ 已完成 |

### 🔄 改造计划

**目标**：将所有服务从手动调用方式改为装饰器方式

**改造步骤**：
1. 创建装饰器工具 `frontend/src/shared/utils/decorators.js`
2. 逐步改造各服务文件，使用 `@autoLog` 装饰器
3. 移除手动日志调用代码
4. 保持业务逻辑不变

**改造优先级**：
- P0：认证模块、会员管理模块（使用频率高）
- P1：其他业务模块
- P2：工具类服务

---

## 🛠️ 七、开发环境配置

### 7.1 控制台输出

在开发环境（`import.meta.env.DEV`）中：

- **WARNING、ERROR、CRITICAL** 级别日志自动输出到浏览器控制台
- **INFO、DEBUG** 级别日志不输出到控制台（但仍发送到后端）
- 可以通过修改 `logger.service.js` 启用 DEBUG 日志的控制台输出

### 7.2 日志发送失败处理

如果日志发送到后端失败：

- 开发环境：在控制台显示警告信息
- 生产环境：静默失败，不影响用户体验
- 日志发送是异步的，不会阻塞主线程

---

## 📝 八、常见问题

### Q1: 为什么有些日志没有出现在控制台？

**A**: 在开发环境中，只有 WARNING、ERROR、CRITICAL 级别的日志会输出到控制台。INFO 和 DEBUG 级别的日志仍然会发送到后端，但不会在控制台显示，以减少控制台噪音。

### Q2: 如何查看所有日志（包括 INFO 和 DEBUG）？

**A**: 可以通过后端日志系统查看所有日志。前端日志都存储在数据库的 `app_logs` 表中，可以通过管理界面或 API 查询。

### Q3: 日志发送失败会影响应用吗？

**A**: 不会。日志发送是异步的，即使发送失败也不会影响应用的正常运行。在开发环境中，发送失败会在控制台显示警告。

### Q4: 如何关联前后端日志？

**A**: 通过 `trace_id` 关联。前端生成的 `trace_id` 通过 `X-Trace-Id` HTTP 头传递给后端，前后端日志都包含相同的 `trace_id`，可以通过这个 ID 进行关联查询。

### Q5: 敏感信息会被记录吗？

**A**: 不会。日志服务自动脱敏敏感字段（password, token, secret 等），这些字段会被替换为 `***REDACTED***`。

### Q6: 如何禁用日志记录？

**A**: 不建议禁用日志记录。如果确实需要，可以修改 `logger.service.js` 中的 `log` 方法，在发送到后端之前直接返回。

### Q7: 装饰器方式和手动调用方式有什么区别？

**A**: 
- **装饰器方式**：代码更简洁，自动处理成功/失败日志，自动提取资源ID和结果数量，推荐用于标准 CRUD 操作
- **手动调用方式**：完全控制日志内容，适合复杂业务逻辑或需要自定义日志格式的场景

### Q8: 全局异常捕获会捕获所有错误吗？

**A**: 是的。全局异常捕获会自动捕获：
- JavaScript 运行时错误（TypeError, ReferenceError 等）
- 未处理的 Promise 拒绝
- 异步操作中的错误
- React 组件错误（通过 ErrorBoundary）

但建议在业务逻辑中手动捕获需要添加上下文的异常。

### Q9: 什么时候使用装饰器，什么时候手动调用？

**A**: 
- **使用装饰器**：标准 CRUD 操作（创建、查询、更新、删除）
- **手动调用**：复杂业务逻辑、需要自定义日志格式、需要特殊错误处理

---

## 🔗 九、相关文档

- [后端日志指南](./BACKEND_LOGGING_GUIDE.md)
- [项目架构](./ARCHITECTURE.md)

---

**文档维护**: 每次更新日志服务后更新本文档  
**最后更新**: 2025-12-02

---

## 📝 十、未来改进计划

### 10.1 装饰器方式实现

**目标**：实现类似后端的装饰器方式，简化日志记录代码

**实现内容**：
1. 创建 `frontend/src/shared/utils/decorators.js`
2. 实现 `@autoLog` 装饰器
3. 支持参数：`operationName`, `successMessage`, `errorMessage`, `logResourceId`, `logResultCount`, `logLevel`
4. 自动提取资源ID和结果数量
5. 自动处理异常并记录错误日志

**改造范围**：
- 所有服务文件（auth, member, admin, performance, project, content, support, upload）
- 逐步从手动调用改为装饰器方式
- 保持业务逻辑不变

### 10.2 全局异常捕获增强

**目标**：完善全局异常捕获机制

**改进内容**：
1. 增强异常上下文信息收集
2. 支持异常分类和优先级
3. 集成 React ErrorBoundary
4. 支持异常上报和告警

### 10.3 日志格式统一

**目标**：确保前后端日志格式完全一致

**改进内容**：
1. 统一字段命名
2. 统一时间戳格式
3. 统一异常格式
4. 统一 extra_data 结构

