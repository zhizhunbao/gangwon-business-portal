# 日志（AOP）方案

## 目录结构

### 前端
```
src/shared/aop/
├── logger/
│   ├── index.js              # 日志模块入口
│   ├── logger.core.js        # 日志核心：级别、格式化
│   ├── logger.transport.js   # 日志上报：批量、重试
│   ├── logger.context.js     # 上下文：traceId、requestId
│   └── logger.dedup.js       # 去重机制
│
├── interceptors/
│   ├── api.interceptor.js    # API 请求/响应拦截
│   ├── router.interceptor.jsx # 路由变更拦截
│   └── auth.interceptor.js   # 认证日志拦截
│
├── hooks/log/
│   ├── useStoreLog.js
│   ├── useHookLog.js
│   ├── useComponentLog.js
│   └── usePerformanceLog.js
│
└── decorators/
    └── withLog.js            # 方法日志装饰器
```

### 后端
```
src/common/modules/
├── logger/
│   ├── config.py           # 日志配置
│   ├── service.py          # 日志服务
│   ├── middleware.py       # HTTP 中间件
│   ├── db_writer.py        # 数据库写入（异步批处理）
│   ├── file_writer.py      # 文件写入
│   ├── formatter.py        # 日志格式化
│   ├── filters.py          # 敏感信息过滤
│   └── request.py          # 请求上下文、traceId
│
├── supabase/
│   └── client.py           # AOP 封装 Supabase Client
│
└── audit/
    ├── service.py          # 审计服务
    └── decorator.py        # @audit_log 装饰器
```

## 日志格式

### 统一字段（前后端通用）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `source` | string | ✅ | `frontend` / `backend` |
| `level` | string | ✅ | `DEBUG` / `INFO` / `WARNING` / `ERROR` / `CRITICAL` |
| `layer` | string | ✅ | AOP 层：`Service` / `Router` / `Auth` / `Store` / `Component` / `Hook` / `Performance` / `Middleware` / `Database` / `Audit` |
| `message` | string | ✅ | 日志消息 |
| `file` | string | ✅ | 代码文件路径 |
| `line` | number | ✅ | 代码行号 |
| `function` | string | ✅ | 函数/方法名 |
| `trace_id` | string | ✅ | 会话追踪 ID（UUID 格式） |
| `request_id` | string | ❌ | 请求追踪 ID（仅 API 请求） |
| `user_id` | string | ❌ | 用户 ID |
| `created_at` | string | ✅ | 时间戳（`yyyy-MM-dd HH:mm:ss.SSS`） |

### 前端

#### service 层

```json
{
  "source": "frontend",
  "level": "INFO",
  "layer": "Service",
  "message": "GET /api/v1/users 200",
  "file": "src/services/api.service.js",
  "line": 45,
  "function": "createRequestInterceptor",
  "trace_id": "550e8400-e29b-41d4-a716-446655440000",
  "request_id": "550e8400-e29b-41d4-a716-446655440000-001",
  "user_id": "uuid",
  "created_at": "2023-12-21 14:30:00.123",
  "request_method": "GET",
  "request_path": "/api/v1/users",
  "response_status": 200,
  "duration_ms": 150
}
```

#### router 层

```json
{
  "source": "frontend",
  "level": "INFO",
  "layer": "Router",
  "message": "Page View: /dashboard",
  "file": "src/shared/aop/interceptors/router.interceptor.jsx",
  "line": 23,
  "function": "RouteLogger",
  "trace_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "uuid",
  "created_at": "2023-12-21 14:30:00.123",
  "action": "PUSH",
  "request_path": "/dashboard"
}
```

#### auth 层

```json
{
  "source": "frontend",
  "level": "INFO",
  "layer": "Auth",
  "message": "User Login Success",
  "file": "src/services/auth.service.js",
  "line": 32,
  "function": "login",
  "trace_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "uuid",
  "created_at": "2023-12-21 14:30:00.123"
}
```

#### components 层

```json
{
  "source": "frontend",
  "level": "INFO",
  "layer": "Component",
  "message": "Component Mount: MyComponent",
  "file": "src/components/MyComponent.jsx",
  "line": 15,
  "function": "MyComponent",
  "trace_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "uuid",
  "created_at": "2023-12-21 14:30:00.123",
  "component": "MyComponent"
}
```

#### store 层

```json
{
  "source": "frontend",
  "level": "INFO",
  "layer": "Store",
  "message": "Store Action: authStore.setUser",
  "file": "src/stores/useAuthStore.js",
  "line": 28,
  "function": "setUser",
  "trace_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "uuid",
  "created_at": "2023-12-21 14:30:00.123",
  "store": "authStore",
  "action": "setUser"
}
```

#### hooks 层

```json
{
  "source": "frontend",
  "level": "INFO",
  "layer": "Hook",
  "message": "Hook Execute: useCustomHook",
  "file": "src/hooks/useCustomHook.js",
  "line": 12,
  "function": "useCustomHook",
  "trace_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "uuid",
  "created_at": "2023-12-21 14:30:00.123",
  "hook": "useCustomHook"
}
```

#### performance 层

```json
{
  "source": "frontend",
  "level": "INFO",
  "layer": "Performance",
  "message": "Performance: MyComponent render",
  "file": "src/components/MyComponent.jsx",
  "line": 18,
  "function": "MyComponent",
  "trace_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "uuid",
  "created_at": "2023-12-21 14:30:00.123",
  "component": "MyComponent",
  "duration_ms": 12
}
```

### 后端

#### middleware 层

```json
{
  "source": "backend",
  "level": "INFO",
  "layer": "Middleware",
  "message": "POST /api/v1/members 201",
  "file": "common/modules/logger/middleware.py",
  "line": 28,
  "function": "logging_middleware",
  "trace_id": "550e8400-e29b-41d4-a716-446655440000",
  "request_id": "550e8400-e29b-41d4-a716-446655440000-001",
  "user_id": "uuid",
  "created_at": "2023-12-21 14:30:00.123",
  "ip_address": "192.168.1.1",
  "request_method": "POST",
  "request_path": "/api/v1/members",
  "response_status": 201,
  "duration_ms": 150
}
```

#### exception 层

```json
{
  "source": "backend",
  "level": "ERROR",
  "layer": "Exception",
  "message": "ValueError: Invalid input",
  "file": "common/modules/exception/handlers.py",
  "line": 45,
  "function": "global_exception_handler",
  "trace_id": "550e8400-e29b-41d4-a716-446655440000",
  "request_id": "550e8400-e29b-41d4-a716-446655440000-001",
  "user_id": "uuid",
  "created_at": "2023-12-21 14:30:00.123",
  "exception_type": "ValueError",
  "stack_trace": "..."
}
```

#### database 层

```json
{
  "source": "backend",
  "level": "DEBUG",
  "layer": "Database",
  "message": "INSERT: members",
  "file": "common/modules/supabase/client.py",
  "line": 52,
  "function": "execute",
  "trace_id": "550e8400-e29b-41d4-a716-446655440000",
  "created_at": "2023-12-21 14:30:00.123",
  "table": "members",
  "operation": "INSERT"
}
```

#### audit 层

```json
{
  "source": "backend",
  "level": "INFO",
  "layer": "Audit",
  "message": "APPROVE member",
  "file": "member/router.py",
  "line": 78,
  "function": "approve_member",
  "trace_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "uuid",
  "created_at": "2023-12-21 14:30:00.123",
  "action": "APPROVE",
  "resource_type": "member",
  "resource_id": "uuid"
}
```

## 单一职责

### 前端

| 文件 | 职责 |
|---|---|
| `logger/index.js` | 日志模块入口 |
| `logger/logger.core.js` | 日志核心：级别、格式化 |
| `logger/logger.transport.js` | 日志上报：批量、重试 |
| `logger/logger.context.js` | 上下文：traceId、requestId |
| `logger/logger.dedup.js` | 去重机制 |
| `interceptors/api.interceptor.js` | API 请求/响应拦截 |
| `interceptors/router.interceptor.jsx` | 路由变更拦截 |
| `interceptors/auth.interceptor.js` | 认证日志拦截 |
| `hooks/log/useStoreLog.js` | Store 状态日志 Hook |
| `hooks/log/useHookLog.js` | 自定义 Hook 日志 Hook |
| `hooks/log/useComponentLog.js` | 组件生命周期日志 Hook |
| `hooks/log/usePerformanceLog.js` | 性能监控日志 Hook |
| `decorators/withLog.js` | 方法日志装饰器 |

### 后端

| 文件 | 职责 |
|---|---|
| `logger/config.py` | 日志配置 |
| `logger/service.py` | 日志服务 |
| `logger/middleware.py` | HTTP 中间件 |
| `logger/db_writer.py` | 数据库写入（异步批处理） |
| `logger/file_writer.py` | 文件写入 |
| `logger/formatter.py` | 日志格式化 |
| `logger/filters.py` | 敏感信息过滤 |
| `logger/request.py` | 请求上下文、traceId |
| `supabase/client.py` | AOP 封装 Supabase Client |
| `audit/service.py` | 审计服务 |
| `audit/decorator.py` | @audit_log 装饰器 |