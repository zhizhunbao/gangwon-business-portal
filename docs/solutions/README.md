# 前端日志（AOP）方案

## 挂载方式

| 层 | 挂载文件 | 挂载方式 | 影响范围 |
|---|---|---|---|
| service | `api.service.js` | axios 拦截器 | 所有 API 请求 |
| router | `App.jsx` | RouteLogger 组件 | 所有页面跳转 |
| auth | `auth.service.js` | 方法内调用 | login/logout/refresh |
| store | `useStoreLog.js` | useStoreLog Hook | 状态变更 |
| hooks | `useHookLog.js` | useHookLog Hook | 自定义 hook |
| components | `useComponentLog.js` | useComponentLog Hook | 组件生命周期 |
| performance | `usePerformanceLog.js` | usePerformanceLog Hook | 渲染/加载时间 |

## 日志分层

### service 层

```javascript
// api.service.js 初始化时自动注入
import { createRequestInterceptor, createResponseInterceptor } from '@shared/aop';
apiClient.interceptors.request.use(createRequestInterceptor(logger));
apiClient.interceptors.response.use(createResponseInterceptor(logger));
```

### router 层

```javascript
// App.jsx 路由根节点
import { RouteLogger } from '@shared/aop';
<BrowserRouter>
  <RouteLogger />
  <Routes>...</Routes>
</BrowserRouter>
```

### auth 层

```javascript
// auth.service.js
import { logLogin, logLogout } from '@shared/aop';
async login(credentials) {
  const result = await apiService.post('/auth/login', credentials);
  logLogin(result);
  return result;
}
```

### components 层

```javascript
// 组件内使用 Hook
import { useComponentLog } from '@shared/aop/hooks/log/useComponentLog';

function MyComponent() {
  useComponentLog('MyComponent');
  // 业务逻辑
}
```

### store 层

```javascript
// store 内使用 Hook
import { useStoreLog } from '@shared/aop/hooks/log/useStoreLog';

function useMyStore() {
  useStoreLog('authStore', { action: 'setUser', payload: user });
  // 状态逻辑
}
```

### hooks 层

```javascript
// 自定义 hook 内使用
import { useHookLog } from '@shared/aop/hooks/log/useHookLog';

function useCustomHook() {
  useHookLog('useCustomHook');
  // hook 逻辑
}
```

### performance 层

```javascript
// 组件内使用性能监控
import { usePerformanceLog } from '@shared/aop/hooks/log/usePerformanceLog';

function MyComponent() {
  usePerformanceLog('MyComponent');
  // 自动记录渲染时间
}
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

### service 层

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

### router 层

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

### auth 层

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

### components 层

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

### store 层

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

### hooks 层

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

### performance 层

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

## 目录结构

```
shared/
├── aop/
│   ├── logger/
│   │   ├── index.js              # 日志模块入口
│   │   ├── logger.core.js        # 日志核心：级别、格式化
│   │   ├── logger.transport.js   # 日志上报：批量、重试
│   │   ├── logger.context.js     # 上下文：traceId、requestId
│   │   └── logger.dedup.js       # 去重机制
│   │
│   ├── exception/
│   │   ├── index.js              # 异常模块入口
│   │   ├── exception.handler.js  # 异常处理核心
│   │   ├── exception.global.js   # 全局异常捕获
│   │   ├── exception.service.js  # 异常上报服务
│   │   └── exception.boundary.jsx # React 错误边界
│   │
│   ├── interceptors/
│   │   ├── index.js              # 拦截器入口
│   │   ├── api.interceptor.js    # API 请求/响应拦截
│   │   ├── router.interceptor.jsx # 路由变更拦截
│   │   └── auth.interceptor.js   # 认证日志拦截
│   │
│   ├── hooks/
│   │   ├── index.js              # Hooks 入口
│   │   ├── log/                  # 日志 Hooks
│   │   │   ├── useStoreLog.js
│   │   │   ├── useHookLog.js
│   │   │   ├── useComponentLog.js
│   │   │   └── usePerformanceLog.js
│   │   │
│   │   └── exception/            # 异常 Hooks
│   │       ├── useStoreException.js
│   │       ├── useHookException.js
│   │       ├── useComponentException.js
│   │       ├── useAuthException.js
│   │       └── usePerformanceException.js
│   │
│   ├── decorators/
│   │   ├── index.js              # 装饰器入口
│   │   ├── withLog.js            # 方法日志装饰器
│   │   └── withErrorHandler.js   # 错误处理装饰器
│   │
│   └── index.js                  # AOP 模块统一入口
```

| 模块 | 职责 | 单一职责 |
|---|---|---|
| `logger/` | 日志记录 | 级别、格式、上报、去重 |
| `exception/` | 异常处理 | 捕获、上报、边界 |
| `interceptors/` | 拦截器 | API、路由、认证 |
| `hooks/log/` | 日志 Hooks | store、hook、component、performance |
| `hooks/exception/` | 异常 Hooks | store、hook、component、auth、performance |
| `decorators/` | 装饰器 | AOP 切面封装 |

## 代码规范

| 规范 | 要求 | 示例 |
|---|---|---|
| 命名 | 模块名.功能.js | `logger.core.js`、`exception.handler.js` |
| 导出 | 统一通过 index.js | `import { logger } from '@shared/aop'` |
| 常量 | 大写下划线 | `LOG_LEVELS`、`DEDUP_WINDOW` |
| 函数 | 动词开头 | `createLogger`、`handleError` |
| 类 | 大驼峰 | `LoggerService`、`ExceptionHandler` |
| 私有方法 | 下划线前缀 | `_sendToServer`、`_formatLog` |
| 注释 | JSDoc 格式 | `@param`、`@returns`、`@throws` |
| 错误 | 自定义 Error 类 | `LoggerError`、`TransportError` |
| 配置 | 独立常量文件 | `logger.constants.js` |
| 类型 | TypeScript 或 JSDoc | 参数和返回值类型声明 |

## 代码结构

### logger.core.js
```javascript
export const LOG_LEVELS = { DEBUG: 10, INFO: 20, WARNING: 30, ERROR: 40, CRITICAL: 50 };
export function formatLog(level, message, extra) { /* 格式化日志对象 */ }
export function shouldLog(level, minLevel) { /* 判断是否记录 */ }
```

### logger.transport.js
```javascript
export function sendLog(logEntry) { /* 单条上报 */ }
export function sendBatch(logs) { /* 批量上报 */ }
export function retry(fn, times) { /* 重试机制 */ }
```

### logger.context.js
```javascript
export function generateTraceId() { /* 生成 traceId */ }
export function generateRequestId(traceId, seq) { /* 生成 requestId */ }
export function getContext() { /* 获取当前上下文 */ }
```

### logger.dedup.js
```javascript
export function isDuplicate(logKey, window) { /* 判断是否重复 */ }
export function recordLog(logKey) { /* 记录日志 key */ }
export function cleanup() { /* 清理过期记录 */ }
```

### exception.handler.js
```javascript
export function classifyError(error) { /* 错误分类 */ }
export function formatException(error, context) { /* 格式化异常 */ }
export function handleException(error, context) { /* 处理异常 */ }
```

### exception.global.js
```javascript
export function setupGlobalHandlers(onError) { /* 注册全局监听 */ }
export function removeGlobalHandlers() { /* 移除监听 */ }
```

### exception.boundary.jsx
```javascript
export class ErrorBoundary extends React.Component {
  static getDerivedStateFromError(error) { /* 更新状态 */ }
  componentDidCatch(error, info) { /* 调用外部处理 */ }
  render() { /* 渲染 fallback 或 children */ }
}
```

### api.interceptor.js
```javascript
export function createRequestInterceptor(logger) { /* 请求拦截 */ }
export function createResponseInterceptor(logger) { /* 响应拦截 */ }
export function createErrorInterceptor(logger) { /* 错误拦截 */ }
```

### router.interceptor.jsx
```javascript
export function RouteLogger({ logger }) { /* 路由变更日志组件 */ }
```

### auth.interceptor.js
```javascript
export function logLogin(result, logger) { /* 登录日志 */ }
export function logLogout(logger) { /* 登出日志 */ }
export function logTokenRefresh(result, logger) { /* 刷新日志 */ }
```

### withLog.js
```javascript
export function withLog(fn, options) { /* 方法日志装饰器 */ }
```

### withErrorHandler.js
```javascript
export function withErrorHandler(fn, onError) { /* 错误处理装饰器 */ }
```

## 单一职责

> 每个文件只做一件事，代码极简，职责边界清晰。

| 文件 | 职责 |
|---|---|
| `logger.core.js` | 日志级别、格式化 |
| `logger.transport.js` | 日志上报、批量、重试 |
| `logger.context.js` | traceId、requestId 管理 |
| `logger.dedup.js` | 日志去重 |
| `exception.handler.js` | 异常处理、分类 |
| `exception.global.js` | 全局异常监听 |
| `exception.boundary.jsx` | React 错误边界 UI |
| `api.interceptor.js` | API 日志拦截 |
| `router.interceptor.jsx` | 路由日志拦截 |
| `auth.interceptor.js` | 认证日志拦截 |
| `withLog.js` | 方法日志装饰 |
| `withErrorHandler.js` | 错误处理装饰 |
| `useStoreLog.js` | Store 日志 Hook |
| `useHookLog.js` | Hook 日志 Hook |
| `useComponentLog.js` | 组件日志 Hook |
| `usePerformanceLog.js` | 性能日志 Hook |
| `useStoreException.js` | Store 异常 Hook |
| `useHookException.js` | Hook 异常 Hook |
| `useComponentException.js` | 组件异常 Hook |
| `useAuthException.js` | 认证异常 Hook |
| `usePerformanceException.js` | 性能异常 Hook |

## 日志级别

| 级别 | 值 | 使用场景 | 生产环境 |
|---|---|---|---|
| DEBUG | 10 | 开发调试、详细流程 | ❌ 不上报 |
| INFO | 20 | 正常业务流程、页面访问 | ✅ 上报 |
| WARNING | 30 | 潜在问题、慢请求、重试 | ✅ 上报 |
| ERROR | 40 | 业务错误、API 失败 | ✅ 上报 |
| CRITICAL | 50 | 系统崩溃、致命错误 | ✅ 立即上报 |

## 上报方式

| 配置 | 值 | 说明 |
|---|---|---|
| 上报地址 | `/api/v1/logging/frontend/logs` | 后端日志接口 |
| 批量大小 | 10 条 | 达到数量触发上报 |
| 上报间隔 | 5 秒 | 定时触发上报 |
| 重试次数 | 3 次 | 失败后重试 |
| 重试间隔 | 1s / 2s / 4s | 指数退避 |
| 本地缓存 | localStorage | 上报失败时暂存 |
| 最大缓存 | 100 条 | 超出丢弃最旧 |

## traceId

| 属性 | 说明 |
|---|---|
| 作用域 | 用户会话级别 |
| 生成时机 | 页面加载时 |
| 格式 | UUID v4 |
| 示例 | `550e8400-e29b-41d4-a716-446655440000` |
| 传递方式 | HTTP Header `X-Trace-Id` |
| 存储位置 | LoggerService 实例 |

## requestId

| 属性 | 说明 |
|---|---|
| 作用域 | 单次 API 请求 |
| 生成时机 | 每次请求发起时 |
| 格式 | `{traceId}-{sequence}` |
| 示例 | `550e8400-e29b-41d4-a716-446655440000-001` |
| 传递方式 | HTTP Header `X-Request-Id` |
| 用途 | 串联前后端单次请求日志 |

# 后端日志（AOP）方案

## 日志类型

| 类型 | 数据库表 | 文件 | 说明 |
|---|---|---|---|
| 应用日志 | `app_logs` | `app.log` | 业务逻辑日志 |
| 异常日志 | `error_logs` | `error.log` | 异常记录 |
| 审计日志 | `audit_logs` | `audit.log` | 操作审计 |
| 系统日志 | `system_logs` | `system.log` | 框架/系统日志 |

## 挂载方式

| 层 | 挂载文件 | 挂载方式 | 是否自动 |
|---|---|---|---|
| middleware | `main.py` | HTTP 中间件 | ✅ 自动 |
| exception | `handlers.py` | 全局异常处理器 | ✅ 自动 |
| database | `supabase/client.py` | AOP 封装 Client | ✅ 自动 |
| audit | 各业务模块 | `@audit_log` 装饰器 | ❌ 手动 |

## 日志分层

### middleware 层

```python
# middleware/logging_middleware.py
@app.middleware("http")
async def logging_middleware(request: Request, call_next):
    start_time = time.time()
    trace_id = request.headers.get("X-Trace-Id") or generate_trace_id()
    
    response = await call_next(request)
    
    duration_ms = int((time.time() - start_time) * 1000)
    logging_service.create_log(
        level="INFO",
        message=f"{request.method} {request.url.path}",
        request_method=request.method,
        request_path=request.url.path,
        response_status=response.status_code,
        duration_ms=duration_ms,
        trace_id=trace_id,
    )
    return response
```

### exception 层

```python
# exception/handlers.py
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    exception_service.record_exception(exc, request)
    return JSONResponse(status_code=500, content={"detail": "Internal Server Error"})
```

### database 层

```python
# supabase/client.py
class LoggedSupabaseClient:
    """AOP 封装：自动记录数据库操作日志"""
    
    def __init__(self, client):
        self._client = client
    
    def table(self, name: str):
        return LoggedTable(self._client.table(name), name)


class LoggedTable:
    """表操作封装"""
    
    def __init__(self, table, name: str):
        self._table = table
        self._name = name
    
    def insert(self, data):
        return LoggedQuery(self._table.insert(data), self._name, "INSERT")
    
    def update(self, data):
        return LoggedQuery(self._table.update(data), self._name, "UPDATE")
    
    def delete(self):
        return LoggedQuery(self._table.delete(), self._name, "DELETE")
    
    def select(self, *args):
        return self._table.select(*args)  # SELECT 不记录日志


class LoggedQuery:
    """查询封装：execute 时自动记录日志"""
    
    def __init__(self, query, table: str, operation: str):
        self._query = query
        self._table = table
        self._operation = operation
    
    async def execute(self):
        result = await self._query.execute()
        logging_service.create_log(
            source="backend",
            level="DEBUG" if self._operation != "DELETE" else "INFO",
            message=f"{self._operation}: {self._table}",
            layer="Database",
            extra_data={"table": self._table, "operation": self._operation}
        )
        return result
    
    def __getattr__(self, name):
        """代理其他方法（eq, gt, filter 等）"""
        attr = getattr(self._query, name)
        if callable(attr):
            def wrapper(*args, **kwargs):
                return LoggedQuery(attr(*args, **kwargs), self._table, self._operation)
            return wrapper
        return attr

# 使用方式不变
# member/service.py
await supabase.table("members").insert(data).execute()  # 自动记录日志
await supabase.table("members").update(data).eq("id", id).execute()  # 自动记录日志
```

### audit 层

```python
# audit/decorator.py
from common.modules.audit import audit_log

@router.post("/members/{id}/approve")
@audit_log(action="APPROVE", resource_type="member")
async def approve_member(id: UUID, request: Request, db: AsyncSession):
    # 审批逻辑
```

## 目录结构

```
common/modules/
├── logger/
│   ├── __init__.py
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
│   ├── __init__.py
│   └── client.py           # AOP 封装 Supabase Client
│
├── exception/
│   ├── __init__.py
│   ├── service.py          # 异常服务
│   ├── handlers.py         # 全局异常处理器
│   └── exceptions.py       # 自定义异常
│
└── audit/
    ├── __init__.py
    ├── service.py          # 审计服务
    └── decorator.py        # @audit_log 装饰器
```

## 单一职责

> 现状分析：部分文件混合了多个职责，建议拆分。

| 当前文件 | 现状 | 建议拆分 |
|---|---|---|
| `service.py` | 日志创建 + 查询 | `service.py` (创建) + `query.py` (查询) |
| `handlers.py` | handlers + 系统日志写入 | `handlers.py` + `system_writer.py` |
| `config.py` | 配置 + 初始化 | `config.py` (常量) + `setup.py` (初始化) |
| `startup.py` | ✅ 启动任务 | - |
| `db_writer.py` | ✅ 数据库写入 | - |
| `file_writer.py` | ✅ 文件写入 | - |
| `filters.py` | ✅ 敏感信息脱敏 | - |
| `formatter.py` | ✅ 日志格式化 | - |
| `request.py` | ✅ 请求上下文 | - |
| `schemas.py` | ✅ 数据模型 | - |
| `router.py` | ✅ API 路由 | - |
| `client.py` | ✅ AOP 封装 Supabase | - |

### 拆分后目录结构

```
common/modules/logger/
├── __init__.py
├── config.py           # 配置常量
├── setup.py            # 初始化逻辑（从 config.py 拆出）
├── service.py          # 日志创建
├── query.py            # 日志查询（从 service.py 拆出）
├── handlers.py         # 创建 handlers
├── system_writer.py    # 系统日志写入（从 handlers.py 拆出）
├── db_writer.py        # 数据库写入
├── file_writer.py      # 文件写入
├── formatter.py        # 日志格式化
├── filters.py          # 敏感信息脱敏
├── request.py          # 请求上下文、traceId
├── schemas.py          # 数据模型
├── router.py           # API 路由
└── startup.py          # 启动任务
```

## 写入方式

| 类型 | 写入方式 | 说明 |
|---|---|---|
| 应用日志 | 异步批处理 | 50条/批 或 5秒/批 |
| 异常日志 | 异步线程 | 单条立即写入 |
| 审计日志 | 异步线程池 | 单条立即写入 |
| 系统日志 | 异步线程 | 单条立即写入 |

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

### middleware 层

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

### exception 层

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

### database 层

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

### audit 层

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


# 日志方案（现状）

## 前端日志分层现状

| 层 | 文件 | 状态 | 说明 |
|---|---|---|---|
| service | `api.service.js` | ✅ | 请求/响应/错误自动记录 |
| router | `RouteLogger.jsx` | ✅ | 页面访问自动记录 |
| error | `errorHandler.js` + `ErrorBoundary.jsx` | ✅ | 全局异常 + React 边界 |
| auth | - | ❌ | 依赖 service 层，无独立日志 |
| store | - | ❌ | 未实现 |
| hooks | - | ❌ | 未实现 |
| components | - | ❌ | 未实现 |
| performance | - | ⚠️ | 仅慢 API 警告（>2s） |

## 后端日志分层现状

| 层 | 文件 | 状态 | 说明 |
|---|---|---|---|
| middleware | `decorator.py` | ⚠️ | 使用装饰器，非中间件 |
| exception | `handlers.py` + `service.py` | ✅ | 全局异常处理 |
| database | - | ❌ | 无 AOP 封装 Supabase Client |
| audit | `decorator.py` + `service.py` | ✅ | 审计日志装饰器 |

## 前端核心能力现状

| 能力 | 状态 | 说明 |
|---|---|---|
| 日志级别 | ✅ | DEBUG / INFO / WARNING / ERROR / CRITICAL |
| traceId | ✅ | 会话级别，自动生成 |
| requestId | ❌ | 未实现 |
| 敏感信息脱敏 | ✅ | password、token 等自动过滤 |
| 去重机制 | ✅ | 10秒内相同日志不重复上报 |
| 上报方式 | ✅ | POST `/api/v1/logging/frontend/logs` |
| 全局异常捕获 | ✅ | `window.error` + `unhandledrejection` |
| React 错误边界 | ✅ | `ErrorBoundary` 组件 |
| AOP 装饰器 | ⚠️ | `autoLog()` 已实现但未广泛使用 |
| 用户行为埋点 | ❌ | 未实现 |

## 后端核心能力现状

| 能力 | 状态 | 说明 |
|---|---|---|
| 日志级别 | ✅ | DEBUG / INFO / WARNING / ERROR / CRITICAL |
| traceId | ✅ | 从前端 Header 获取或自动生成 |
| requestId | ❌ | 未实现 |
| 敏感信息脱敏 | ✅ | `filters.py` 过滤敏感字段 |
| 文件写入 | ✅ | `file_writer.py` 写入日志文件 |
| 数据库写入 | ✅ | `db_writer.py` 异步批量写入 |
| 全局异常处理 | ✅ | `exception/handlers.py` |
| 审计日志 | ✅ | `audit/decorator.py` |
| HTTP 中间件 | ❌ | 未实现（使用装饰器代替） |
| 数据库 AOP | ❌ | 未实现 |


# 前端异常（AOP）方案

## 异常分类

| 类型 | 说明 | 示例 |
|---|---|---|
| NetworkError | 网络请求失败 | 断网、超时、DNS 解析失败 |
| ApiError | API 返回错误 | 400/401/403/404/500 |
| ValidationError | 数据校验失败 | 表单验证、参数校验 |
| AuthError | 认证/授权失败 | token 过期、无权限 |
| RenderError | React 渲染错误 | 组件崩溃 |
| RuntimeError | JS 运行时错误 | TypeError、ReferenceError |

## 挂载方式

| 层 | 挂载文件 | 挂载方式 | 是否自动 |
|---|---|---|---|
| global | `main.jsx` | setupGlobalHandlers | ✅ 自动 |
| boundary | `App.jsx` | ErrorBoundary 组件 | ✅ 自动 |
| service | `api.service.js` | axios 错误拦截器 | ✅ 自动 |
| auth | `useAuthException.js` | useAuthException Hook | ❌ 手动 |
| router | `App.jsx` | 路由错误边界 | ✅ 自动 |
| store | `useStoreException.js` | useStoreException Hook | ❌ 手动 |
| components | `useComponentException.js` | useComponentException Hook | ❌ 手动 |
| hooks | `useHookException.js` | useHookException Hook | ❌ 手动 |
| performance | `usePerformanceException.js` | usePerformanceException Hook | ❌ 手动 |

## 异常分层

### global 层

```javascript
// main.jsx
import { setupGlobalHandlers } from '@shared/aop/exception';

setupGlobalHandlers({
  onError: (error, context) => {
    exceptionService.report(error, context);
  },
  onUnhandledRejection: (reason, promise) => {
    exceptionService.report(reason, { type: 'unhandledRejection' });
  }
});
```

### boundary 层

```javascript
// App.jsx
import { ErrorBoundary } from '@shared/aop/exception';

<ErrorBoundary
  fallback={<ErrorPage />}
  onError={(error, errorInfo) => {
    exceptionService.report(error, { componentStack: errorInfo.componentStack });
  }}
>
  <App />
</ErrorBoundary>
```

### service 层

```javascript
// api.interceptor.js
export function createErrorInterceptor(exceptionService) {
  return (error) => {
    const apiError = classifyApiError(error);
    exceptionService.report(apiError);
    return Promise.reject(apiError);
  };
}
```

### auth 层

```javascript
// auth.service.js
import { useAuthException } from '@shared/aop/hooks/exception/useAuthException';

const handleError = useAuthException();

async login(credentials) {
  try {
    const result = await apiService.post('/auth/login', credentials);
    return result;
  } catch (error) {
    handleError(error, { action: 'login' });
    throw error;
  }
}
```

### router 层

```javascript
// App.jsx
<Route
  path="*"
  errorElement={<RouteErrorBoundary />}
/>
```

### store 层

```javascript
// useAuthStore.js
import { useStoreException } from '@shared/aop/hooks/exception/useStoreException';

const handleError = useStoreException('authStore');

const login = async (credentials) => {
  try {
    const user = await authService.login(credentials);
    set({ user });
  } catch (error) {
    handleError(error, { action: 'login' });
    set({ error });
  }
};
```

### components 层

```javascript
// MyComponent.jsx
import { useComponentException } from '@shared/aop/hooks/exception/useComponentException';

function MyComponent() {
  const handleError = useComponentException('MyComponent');
  
  const handleClick = async () => {
    try {
      await doSomething();
    } catch (error) {
      handleError(error, { action: 'handleClick' });
    }
  };
}
```

### hooks 层

```javascript
// useCustomHook.js
import { useHookException } from '@shared/aop/hooks/exception/useHookException';

function useCustomHook() {
  const handleError = useHookException('useCustomHook');
  
  useEffect(() => {
    try {
      // hook 逻辑
    } catch (error) {
      handleError(error);
    }
  }, []);
}
```

### performance 层

```javascript
// MyComponent.jsx
import { usePerformanceException } from '@shared/aop/hooks/exception/usePerformanceException';

function MyComponent() {
  const handleError = usePerformanceException('MyComponent');
  
  useEffect(() => {
    try {
      // 性能监控逻辑
      measurePerformance();
    } catch (error) {
      handleError(error, { metric: 'render_time' });
    }
  }, []);
}
```

## 异常格式

```json
{
  "source": "frontend",
  "level": "ERROR",
  "layer": "Exception",
  "message": "TypeError: Cannot read property 'id' of undefined",
  "file": "src/components/UserProfile.jsx",
  "line": 42,
  "function": "fetchUser",
  "trace_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "uuid",
  "created_at": "2023-12-21 14:30:00.123",
  "exception_type": "TypeError",
  "stack_trace": "TypeError: Cannot read property...",
  "context": {
    "component": "UserProfile",
    "action": "fetchUser",
    "url": "/dashboard"
  }
}
```

## 单一职责

| 文件 | 职责 |
|---|---|
| `exception.handler.js` | 异常分类、格式化 |
| `exception.global.js` | 全局异常监听 |
| `exception.boundary.jsx` | React 错误边界 |
| `exception.service.js` | 异常上报 |
| `useStoreException.js` | Store 异常处理 Hook |
| `useHookException.js` | Hook 异常处理 Hook |
| `useComponentException.js` | 组件异常处理 Hook |
| `useAuthException.js` | 认证异常处理 Hook |
| `usePerformanceException.js` | 性能异常处理 Hook |

## AOP 程度

| 异常类型 | AOP 程度 | 原因 |
|---|---|---|
| JS 运行时错误 | ✅ 纯 AOP | `window.onerror` 全局自动捕获 |
| React 渲染错误 | ✅ 纯 AOP | `ErrorBoundary` 自动捕获 |
| API 请求错误 | ✅ 纯 AOP | axios 拦截器自动捕获 + 记录 |
| 业务逻辑异常 | ⚠️ 半 AOP | 需要组件手动调用 Hook |

## 异常分类

| 类型 | 说明 | HTTP 状态码 |
|---|---|---|
| ValidationError | 数据校验失败 | 400 |
| AuthenticationError | 认证失败 | 401 |
| AuthorizationError | 授权失败 | 403 |
| NotFoundError | 资源不存在 | 404 |
| ConflictError | 资源冲突 | 409 |
| RateLimitError | 请求频率限制 | 429 |
| DatabaseError | 数据库操作失败 | 500 |
| ExternalServiceError | 外部服务调用失败 | 502 |
| InternalError | 内部错误 | 500 |

## 挂载方式

| 层 | 挂载文件 | 挂载方式 | 是否自动 |
|---|---|---|---|
| global | `main.py` | 全局异常处理器 | ✅ 自动 |
| middleware | `middleware.py` | HTTP 中间件 | ✅ 自动 |
| database | `supabase/client.py` | AOP 封装 Client | ✅ 自动 |
| service | 各 Service | try-catch | ❌ 手动 |
| router | 各 Router | try-catch | ❌ 手动 |

## 异常分层

### global 层

```python
# exception/handlers.py
from fastapi import Request
from fastapi.responses import JSONResponse

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    exception_service.record_exception(exc, request)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error"}
    )

@app.exception_handler(ValidationError)
async def validation_exception_handler(request: Request, exc: ValidationError):
    exception_service.record_exception(exc, request)
    return JSONResponse(
        status_code=400,
        content={"detail": str(exc), "errors": exc.errors}
    )

@app.exception_handler(AuthenticationError)
async def auth_exception_handler(request: Request, exc: AuthenticationError):
    exception_service.record_exception(exc, request)
    return JSONResponse(
        status_code=401,
        content={"detail": str(exc)}
    )
```

### middleware 层

```python
# logger/middleware.py
@app.middleware("http")
async def exception_middleware(request: Request, call_next):
    try:
        response = await call_next(request)
        return response
    except Exception as exc:
        exception_service.record_exception(exc, request)
        raise
```

### database 层

```python
# supabase/client.py
class LoggedQuery:
    async def execute(self):
        try:
            result = await self._query.execute()
            # 记录日志...
            return result
        except Exception as exc:
            exception_service.record_exception(exc, {
                "table": self._table,
                "operation": self._operation
            })
            raise DatabaseError(f"Database operation failed: {exc}")
```

### service 层

```python
# member/service.py
class MemberService:
    async def create_member(self, data: dict):
        try:
            result = await self.supabase.table("members").insert(data).execute()
            return result
        except DatabaseError as exc:
            exception_service.record_exception(exc, {
                "layer": "Service",
                "action": "create_member"
            })
            raise
```

### router 层

```python
# member/router.py
@router.post("/members")
async def create_member(data: MemberCreate, service: MemberService = Depends()):
    try:
        result = await service.create_member(data.dict())
        return result
    except ValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except DatabaseError as exc:
        raise HTTPException(status_code=500, detail="Failed to create member")
```

## 异常格式

```json
{
  "source": "backend",
  "level": "ERROR",
  "layer": "Exception",
  "message": "DatabaseError: Failed to insert member",
  "file": "common/modules/exception/handlers.py",
  "line": 45,
  "function": "global_exception_handler",
  "trace_id": "550e8400-e29b-41d4-a716-446655440000",
  "request_id": "550e8400-e29b-41d4-a716-446655440000-001",
  "user_id": "uuid",
  "created_at": "2023-12-21 14:30:00.123",
  "exception_type": "DatabaseError",
  "stack_trace": "Traceback (most recent call last)...",
  "context": {
    "request_method": "POST",
    "request_path": "/api/v1/members",
    "ip_address": "192.168.1.1"
  }
}
```

## 目录结构

```
common/modules/exception/
├── __init__.py
├── exceptions.py       # 自定义异常类
├── handlers.py         # 全局异常处理器
├── service.py          # 异常记录服务
├── middleware.py       # 异常中间件
├── schemas.py          # 异常数据模型
└── router.py           # 异常查询 API
```

## 单一职责

| 文件 | 职责 |
|---|---|
| `exceptions.py` | 自定义异常类定义 |
| `handlers.py` | 全局异常处理器注册 |
| `service.py` | 异常记录、上报 |
| `middleware.py` | HTTP 异常中间件 |
| `schemas.py` | 异常数据模型 |
| `router.py` | 异常查询 API |

# 前端验证方案

## 验证类型

| 类型 | 说明 | 示例 |
|---|---|---|
| 表单验证 | 输入格式、必填项 | 邮箱格式、密码强度 |
| 业务验证 | 服务端返回的业务错误 | 密码错误、账号未批准 |
| 权限验证 | 访问控制、会话状态 | 无权限、登录过期 |

## 验证时机

| 时机 | 说明 | 使用场景 |
|---|---|---|
| 实时验证 | 输入时立即验证 | 格式校验、密码强度 |
| 失焦验证 | 离开字段时验证 | 异步校验（如用户名重复） |
| 提交验证 | 表单提交时验证 | 完整性校验 |
| 服务端验证 | API 返回错误 | 业务逻辑校验 |

## 提示方式

| 方式 | 使用场景 | 特点 |
|---|---|---|
| 字段提示 | 表单输入错误 | 精确定位、实时反馈 |
| Toast | 操作结果、轻量提示 | 自动消失（3秒）、不阻断操作 |
| Modal | 重要提示、需要确认 | 阻断操作、强制关注 |
| Banner | 系统公告、维护通知 | 持续显示、全局可见 |

## 核心场景

### 登录验证

| 场景 | 错误码 | 提示方式 | 消息 |
|---|---|---|---|
| 密码错误 | `AUTH_INVALID_PASSWORD` | Toast | "密码错误，请重新输入" |
| 账号不存在 | `AUTH_USER_NOT_FOUND` | Toast | "账号不存在，请检查输入" |
| 账号未批准 | `AUTH_USER_PENDING` | Modal | "您的账号正在审核中，请等待管理员批准" |
| 账号被禁用 | `AUTH_USER_DISABLED` | Modal | "您的账号已被禁用，请联系管理员" |
| 账号被锁定 | `AUTH_USER_LOCKED` | Modal | "账号已被锁定，请30分钟后重试" |

### 表单验证

| 场景 | 验证规则 | 提示方式 | 消息 |
|---|---|---|---|
| 必填项为空 | `required` | 字段提示 | "请输入{字段名}" |
| 邮箱格式错误 | `email` | 字段提示 | "请输入有效的邮箱地址" |
| 密码强度不足 | `password` | 字段提示 | "密码至少8位，包含字母和数字" |
| 手机号格式错误 | `phone` | 字段提示 | "请输入有效的手机号码" |
| 两次密码不一致 | `confirm` | 字段提示 | "两次输入的密码不一致" |

### 权限验证

| 场景 | 错误码 | 提示方式 | 消息 | 后续动作 |
|---|---|---|---|---|
| 会话过期 | `AUTH_TOKEN_EXPIRED` | Modal | "登录已过期，请重新登录" | 跳转登录页 |
| 无权限访问 | `AUTH_FORBIDDEN` | Toast | "您没有权限访问此页面" | 跳转首页 |
| 未登录 | `AUTH_UNAUTHORIZED` | Modal | "请先登录" | 跳转登录页 |

## 验证规则

### 内置规则

| 规则 | 说明 | 参数 |
|---|---|---|
| `required` | 必填 | - |
| `email` | 邮箱格式 | - |
| `phone` | 手机号格式 | - |
| `min` | 最小长度/值 | `min: number` |
| `max` | 最大长度/值 | `max: number` |
| `pattern` | 正则匹配 | `pattern: RegExp` |
| `confirm` | 确认匹配 | `field: string` |

### 自定义规则

```javascript
// validation/rules.js
export const passwordStrength = (value) => {
  if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(value)) {
    return '密码必须包含字母和数字';
  }
  if (value.length < 8) {
    return '密码至少8位';
  }
  return true;
};
```

### 异步规则

```javascript
// validation/rules.js
export const uniqueEmail = async (value) => {
  const exists = await userService.checkEmailExists(value);
  if (exists) {
    return '该邮箱已被注册';
  }
  return true;
};
```

## 错误消息

### 消息格式

```javascript
// validation/messages.js
export const messages = {
  required: '请输入{field}',
  email: '请输入有效的邮箱地址',
  phone: '请输入有效的手机号码',
  min: '{field}至少{min}个字符',
  max: '{field}最多{max}个字符',
  pattern: '{field}格式不正确',
  confirm: '两次输入的{field}不一致',
};
```

### 错误码映射

```javascript
// validation/errorCodes.js
export const errorCodeMessages = {
  // 认证错误
  AUTH_INVALID_PASSWORD: '密码错误，请重新输入',
  AUTH_USER_NOT_FOUND: '账号不存在，请检查输入',
  AUTH_USER_PENDING: '您的账号正在审核中，请等待管理员批准',
  AUTH_USER_DISABLED: '您的账号已被禁用，请联系管理员',
  AUTH_USER_LOCKED: '账号已被锁定，请{minutes}分钟后重试',
  AUTH_TOKEN_EXPIRED: '登录已过期，请重新登录',
  AUTH_UNAUTHORIZED: '请先登录',
  AUTH_FORBIDDEN: '您没有权限执行此操作',
  
  // 业务错误
  VALIDATION_ERROR: '输入数据有误，请检查',
  RESOURCE_NOT_FOUND: '请求的资源不存在',
  RESOURCE_CONFLICT: '资源冲突，请刷新后重试',
  
  // 系统错误
  NETWORK_ERROR: '网络连接失败，请检查网络',
  SERVER_ERROR: '服务器错误，请稍后重试',
  UNKNOWN_ERROR: '未知错误，请稍后重试',
};
```

## 目录结构

```
shared/
├── validation/
│   ├── index.js              # 验证模块入口
│   ├── rules.js              # 验证规则（内置 + 自定义）
│   ├── messages.js           # 错误消息模板
│   ├── errorCodes.js         # 错误码映射
│   ├── validator.js          # 验证器核心
│   └── hooks/
│       ├── useFormValidation.js   # 表单验证 Hook
│       └── useFieldValidation.js  # 字段验证 Hook
│
├── feedback/
│   ├── index.js              # 反馈模块入口
│   ├── toast.js              # Toast 提示
│   ├── modal.js              # Modal 弹窗
│   └── hooks/
│       └── useFeedback.js    # 统一反馈 Hook
```

## 单一职责

| 文件 | 职责 |
|---|---|
| `rules.js` | 验证规则定义 |
| `messages.js` | 错误消息模板 |
| `errorCodes.js` | 错误码映射 |
| `validator.js` | 验证逻辑执行 |
| `useFormValidation.js` | 表单级验证 Hook |
| `useFieldValidation.js` | 字段级验证 Hook |
| `toast.js` | Toast 提示服务 |
| `modal.js` | Modal 弹窗服务 |
| `useFeedback.js` | 统一反馈 Hook |

## 使用示例

### 表单验证

```javascript
// LoginForm.jsx
import { useFormValidation } from '@shared/validation';
import { useFeedback } from '@shared/feedback';

function LoginForm() {
  const { validate, errors } = useFormValidation({
    email: ['required', 'email'],
    password: ['required', { min: 8 }],
  });
  const { toast, modal } = useFeedback();

  const handleSubmit = async (data) => {
    if (!validate(data)) return;
    
    try {
      await authService.login(data);
      toast.success('登录成功');
    } catch (error) {
      if (error.code === 'AUTH_USER_PENDING') {
        modal.warning({
          title: '账号审核中',
          content: '您的账号正在审核中，请等待管理员批准',
        });
      } else {
        toast.error(error.message);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input name="email" error={errors.email} />
      <Input name="password" error={errors.password} />
      <Button type="submit">登录</Button>
    </form>
  );
}
```

### 权限验证

```javascript
// router/guards.js
import { useFeedback } from '@shared/feedback';
import { useAuth } from '@shared/auth';

export function AuthGuard({ children }) {
  const { isAuthenticated, user } = useAuth();
  const { modal } = useFeedback();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      modal.warning({
        title: '请先登录',
        content: '您需要登录后才能访问此页面',
        onOk: () => navigate('/login'),
      });
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) return null;
  return children;
}
```


## 验证方案（现状）

### 前端验证现状

| 能力 | 状态 | 文件 | 说明 |
|---|---|---|---|
| 密码强度验证 | ✅ | `validation.js` | `validatePassword()` 检查长度、大小写、数字、特殊字符 |
| 密码确认验证 | ✅ | `validation.js` | `passwordsMatch()` |
| 文件验证 | ✅ | `fileValidation.js` | 大小、扩展名、MIME 类型 |
| 表单验证 | ⚠️ | 各组件内 | 无统一验证框架，各组件自行实现 |
| 错误码映射 | ⚠️ | `LoginModal.jsx` | 仅登录场景，硬编码在组件内 |
| 国际化消息 | ✅ | `i18n` | 通过 `t()` 函数获取 |

### 提示方式现状

| 方式 | 状态 | 文件 | 说明 |
|---|---|---|---|
| 字段提示 | ⚠️ | 各组件内 | 无统一组件，各表单自行实现 |
| Toast | ❌ | - | 未实现统一 Toast 服务 |
| Modal | ✅ | `Modal.jsx` | 通用 Modal 组件 |
| Alert | ✅ | `Alert.jsx` | 通用 Alert 组件 |

### 登录验证现状

| 场景 | 错误码 | 提示方式 | 状态 |
|---|---|---|---|
| 密码错误 | `INVALID_CREDENTIALS` | 表单内 Alert | ✅ |
| 账号未批准 | `ACCOUNT_PENDING_APPROVAL` | 表单内 Alert | ✅ |
| 账号被禁用 | `ACCOUNT_SUSPENDED` | 表单内 Alert | ✅ |
| 会话过期 | - | 跳转登录页 | ✅ |
| 无权限访问 | - | 跳转 unauthorized | ✅ |

### 待改进项

| 问题 | 现状 | 建议 |
|---|---|---|
| 验证逻辑分散 | 各组件自行实现 | 统一 `useFormValidation` Hook |
| 错误码硬编码 | 在组件内判断 | 统一 `errorCodes.js` 映射 |
| 无 Toast 服务 | 使用 Alert 或 console | 实现 `toast.js` 服务 |
| 提示方式不统一 | Modal/Alert 混用 | 按场景规范提示方式 |
| 异步验证 | 未实现 | 支持邮箱/用户名重复检查 |

# JSX 开发原则


## 单一职责

| 原则 | 说明 | 示例 |
|---|---|---|
| 一个组件一个功能 | 组件只做一件事 | `LoginForm` 只处理登录表单 |
| 逻辑与 UI 分离 | 业务逻辑放 Hook，UI 放组件 | `useLogin` + `LoginForm` |
| 状态最小化 | 只存必要状态 | 派生数据用 `useMemo` |
| Props 单向流动 | 数据向下，事件向上 | `onChange` 回调 |

## 组件分层

| 层 | 职责 | 示例 |
|---|---|---|
| Page | 页面容器、路由入口 | `LoginPage.jsx` |
| Container | 业务逻辑、数据获取 | `LoginContainer.jsx` |
| Component | UI 展示、用户交互 | `LoginForm.jsx` |
| UI | 纯展示、无状态 | `Button.jsx`、`Input.jsx` |

```
pages/
├── LoginPage.jsx          # 页面入口
│   └── LoginContainer     # 业务逻辑
│       └── LoginForm      # 表单 UI
│           ├── Input      # 输入框
│           └── Button     # 按钮
```

## 异常处理原则

| 原则 | 说明 |
|---|---|
| 不在组件内记录日志 | 日志由 service 层 AOP 自动处理 |
| 只处理用户提示 | 组件只负责显示错误消息 |
| 使用统一错误码映射 | 通过 `getErrorMessage(code)` 获取消息 |
| 按场景选择提示方式 | 字段错误用字段提示，重要错误用 Modal |

```javascript
// ✅ 正确：组件只处理 UI
catch (err) {
  // 日志已被 service 层自动记录
  const message = getErrorMessage(err.code);
  setError(message);
}

// ❌ 错误：组件内记录日志
catch (err) {
  console.error(err);  // 不要这样
  loggerService.error(err);  // 不要这样
  setError(err.message);
}
```

## 状态管理原则

| 原则 | 说明 |
|---|---|
| 局部状态用 `useState` | 组件内部状态 |
| 共享状态用 Store | 跨组件状态用 Zustand |
| 服务端状态用 Query | API 数据用 React Query |
| 避免 Props 穿透 | 超过 2 层用 Context 或 Store |

```javascript
// 局部状态
const [isOpen, setIsOpen] = useState(false);

// 共享状态
const { user } = useAuthStore();

// 服务端状态
const { data, isLoading } = useQuery(['user'], fetchUser);
```

## 副作用处理原则

| 原则 | 说明 |
|---|---|
| `useEffect` 单一职责 | 一个 effect 只做一件事 |
| 清理副作用 | 返回 cleanup 函数 |
| 依赖项完整 | 不要忽略 ESLint 警告 |
| 避免无限循环 | 注意依赖项变化 |

```javascript
// ✅ 正确：单一职责
useEffect(() => {
  loadUser();
}, [userId]);

useEffect(() => {
  const timer = setInterval(tick, 1000);
  return () => clearInterval(timer);  // 清理
}, []);

// ❌ 错误：多个职责混合
useEffect(() => {
  loadUser();
  loadPosts();
  setupWebSocket();
}, []);
```

## 性能优化原则

| 原则 | 说明 | 使用场景 |
|---|---|---|
| `React.memo` | 避免不必要的重渲染 | 纯展示组件 |
| `useMemo` | 缓存计算结果 | 复杂计算 |
| `useCallback` | 缓存函数引用 | 传递给子组件的回调 |
| 懒加载 | 按需加载组件 | 路由级组件 |

```javascript
// 缓存计算
const filteredList = useMemo(() => 
  list.filter(item => item.active), 
  [list]
);

// 缓存回调
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);

// 懒加载
const Dashboard = lazy(() => import('./Dashboard'));
```

## 命名规范

| 类型 | 规范 | 示例 |
|---|---|---|
| 组件 | PascalCase | `LoginForm.jsx` |
| Hook | use 前缀 | `useAuth.js` |
| 工具函数 | camelCase | `formatDate.js` |
| 常量 | UPPER_SNAKE | `API_BASE_URL` |
| 事件处理 | handle 前缀 | `handleSubmit` |
| 布尔值 | is/has/can 前缀 | `isLoading`、`hasError` |

## 文件组织

```
src/
├── admin/                    # 管理端
│   ├── layouts/              # 布局组件
│   └── modules/              # 功能模块
│       ├── auth/             # 认证
│       ├── dashboard/        # 仪表盘
│       ├── members/          # 会员管理
│       ├── messages/         # 消息管理
│       ├── projects/         # 项目管理
│       ├── reports/          # 报表
│       ├── audit-logs/       # 审计日志
│       ├── content/          # 内容管理
│       └── performance/      # 性能监控
│
├── member/                   # 会员端
│   ├── layouts/              # 布局组件
│   └── modules/              # 功能模块
│
├── shared/                   # 共享模块
│   ├── components/           # 通用组件
│   ├── hooks/                # 通用 Hook
│   ├── services/             # API 服务
│   ├── stores/               # 状态管理
│   ├── utils/                # 工具函数
│   ├── styles/               # 全局样式
│   └── i18n/                 # 国际化
│
├── mocks/                    # Mock 数据
│   ├── data/                 # 模拟数据
│   └── handlers/             # 请求处理
│
├── App.jsx                   # 应用入口
├── main.jsx                  # 渲染入口
└── router.jsx                # 路由配置
```

## 代码风格

| 规范 | 说明 |
|---|---|
| 组件函数声明 | 使用 `function` 而非箭头函数 |
| Props 解构 | 在参数位置解构 |
| 条件渲染 | 简单用 `&&`，复杂用三元或提前 return |
| 列表渲染 | 必须有唯一 `key` |

```javascript
// ✅ 组件声明
function LoginForm({ onSubmit, isLoading }) {
  // ...
}

// ✅ 条件渲染
{isLoading && <Spinner />}
{error ? <Error message={error} /> : <Content />}

// ✅ 提前 return
if (isLoading) return <Spinner />;
if (error) return <Error />;
return <Content />;
```

## 与 AOP 方案的配合

| 层 | 组件职责 | AOP 职责 |
|---|---|---|
| 日志 | 无 | service 层自动记录 |
| 异常捕获 | 无 | service 层自动捕获 |
| 异常上报 | 无 | service 层自动上报 |
| 用户提示 | 调用 `useFeedback` | 无 |
| 错误码映射 | 调用 `getErrorMessage` | 无 |

```javascript
// 组件只关注 UI，不关注日志和异常记录
function LoginForm() {
  const { toast, modal } = useFeedback();
  
  const handleSubmit = async (data) => {
    try {
      await authService.login(data);  // 日志由 service 层 AOP 处理
      toast.success('登录成功');
    } catch (err) {
      // 异常已被 service 层记录，组件只处理 UI
      const message = getErrorMessage(err.code);
      const feedbackType = getFeedbackType(err.code);
      
      if (feedbackType === 'modal') {
        modal.warning({ content: message });
      } else {
        setError(message);
      }
    }
  };
}
```

## JSX 现状

### 组件声明方式

| 方式 | 状态 | 说明 |
|---|---|---|
| `function` 声明 | ⚠️ 部分 | `router.jsx` 等少数文件使用 |
| 箭头函数组件 | ✅ 主流 | 大部分组件使用箭头函数 |
| `export default` | ✅ | 组件导出方式 |

### 性能优化使用

| Hook | 状态 | 使用场景 |
|---|---|---|
| `useMemo` | ✅ 广泛使用 | 列表过滤、配置对象、选项列表 |
| `useCallback` | ✅ 广泛使用 | 事件处理、异步加载函数 |
| `React.memo` | ❌ 未使用 | 无组件使用 memo 包裹 |

### 日志使用

| 问题 | 状态 | 文件 |
|---|---|---|
| `console.log` 调试代码 | ⚠️ 存在 | `LoginModal.jsx`、`Modal.jsx`、`router.jsx` |
| `console.error` 异常处理 | ⚠️ 存在 | `RichTextEditor.jsx`、`InquiryForm.jsx` 等 |
| 应使用 AOP 日志 | ❌ 未遵循 | 组件内直接使用 console |

### 异常处理

| 问题 | 状态 | 说明 |
|---|---|---|
| 组件内 try-catch | ✅ 有 | 异步操作有 try-catch |
| 使用 AOP Hook | ❌ 未使用 | 未调用 `useComponentException` 等 |
| 错误码映射 | ⚠️ 硬编码 | `LoginModal.jsx` 内硬编码判断 |
| 统一反馈服务 | ❌ 未使用 | 使用 `alert()` 或 `setError()` |

### 待改进项

| 问题 | 现状 | 建议 |
|---|---|---|
| `console.log` 调试代码 | 残留在组件中 | 删除或改用 AOP 日志 |
| `console.error` 异常 | 组件内直接调用 | 改用 service 层 AOP |
| `alert()` 提示 | 原生 alert | 改用 `useFeedback` |
| 错误码硬编码 | 组件内 if-else | 改用 `getErrorMessage()` |
| 无 `React.memo` | 所有组件无 memo | 纯展示组件添加 memo |
| 组件声明不统一 | function/箭头混用 | 统一使用一种方式 |

### 单一职责分析

以 `LoginModal.jsx` 为例，现状违反单一职责：

```javascript
// LoginModal.jsx 现状 - 混合了多个职责
catch (err) {
  // 1. 日志记录（应该由 AOP 处理）
  console.log("LoginModal: caught error", err);
  
  // 2. 错误码解析（应该由 errorCodes.js 处理）
  const serverCode = rawResponse.error_code || rawResponse.code || err.code || "";
  
  // 3. 消息映射（应该由 getErrorMessage 处理）
  if (serverCode === "ACCOUNT_PENDING_APPROVAL") {
    errorMessage = t("auth.approvalPending");
  } else if (serverCode === "INVALID_CREDENTIALS") {
    errorMessage = t("auth.invalidCredentials");
  }
  
  // 4. UI 状态更新（组件应该只做这个）
  setError(errorMessage);
}
```

| 职责 | 应该在哪 | 现状 | 问题 |
|---|---|---|---|
| 日志记录 | service 层 AOP | 组件内 `console.log` | ❌ 违反 |
| 异常捕获 | service 层 AOP | 组件内 try-catch | ⚠️ 必须的 |
| 错误码解析 | `errorCodes.js` | 组件内硬编码 | ❌ 违反 |
| 消息映射 | `getErrorMessage()` | 组件内 if-else | ❌ 违反 |
| 提示方式选择 | `getFeedbackType()` | 组件内固定 | ❌ 违反 |
| UI 状态更新 | 组件 | 组件 | ✅ 正确 |

应该改成：

```javascript
// LoginModal.jsx - 单一职责
catch (err) {
  // 组件只做 UI 状态更新
  // 日志已被 service 层自动记录
  const message = getErrorMessage(err.code);  // 统一映射
  const feedbackType = getFeedbackType(err.code);  // 统一决策
  
  if (feedbackType === 'field') {
    setError(message);
  } else {
    modal.warning({ content: message });
  }
}
```


# 前端邮件方案

## 邮件触发场景

| 场景 | 触发时机 | API |
|---|---|---|
| 注册验证 | 用户注册后 | `POST /api/v1/auth/send-verification` |
| 密码重置 | 点击忘记密码 | `POST /api/v1/auth/forgot-password` |
| 账号审批通知 | 管理员审批后 | 后端自动发送 |
| 系统通知 | 后端事件触发 | 后端自动发送 |

## 前端职责

| 职责 | 说明 |
|---|---|
| 触发邮件请求 | 调用 API 发送邮件 |
| 显示发送状态 | Loading、成功、失败提示 |
| 倒计时限制 | 防止频繁发送（60秒） |
| 邮箱格式验证 | 前端校验邮箱格式 |

## 目录结构

```
shared/
├── services/
│   └── email.service.js      # 邮件 API 服务
│
├── hooks/
│   └── useEmailSend.js       # 邮件发送 Hook（含倒计时）
│
└── components/
    └── EmailVerification.jsx  # 邮箱验证组件
```

## 使用示例

### 发送验证邮件

```javascript
// hooks/useEmailSend.js
export function useEmailSend() {
  const [countdown, setCountdown] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useFeedback();

  const sendVerificationEmail = async (email) => {
    if (countdown > 0) return;
    
    setIsSending(true);
    try {
      await emailService.sendVerification(email);
      toast.success('验证邮件已发送，请查收');
      setCountdown(60);  // 60秒倒计时
    } catch (err) {
      toast.error(getErrorMessage(err.code));
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  return { sendVerificationEmail, countdown, isSending };
}
```

### 忘记密码

```javascript
// ForgotPassword.jsx
function ForgotPassword() {
  const { sendVerificationEmail, countdown, isSending } = useEmailSend();
  const [email, setEmail] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    await sendVerificationEmail(email);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input 
        type="email" 
        value={email} 
        onChange={(e) => setEmail(e.target.value)} 
      />
      <Button disabled={isSending || countdown > 0}>
        {countdown > 0 ? `${countdown}秒后重试` : '发送重置邮件'}
      </Button>
    </form>
  );
}
```

## 单一职责

| 文件 | 职责 |
|---|---|
| `email.service.js` | API 调用 |
| `useEmailSend.js` | 发送逻辑 + 倒计时 |
| `EmailVerification.jsx` | UI 展示 |

# 后端邮件方案

## 邮件类型

| 类型 | 触发时机 | 模板 |
|---|---|---|
| 注册验证 | 用户注册 | `verification.html` |
| 密码重置 | 忘记密码 | `password_reset.html` |
| 账号审批 | 管理员审批 | `approval_notification.html` |
| 账号拒绝 | 管理员拒绝 | `rejection_notification.html` |
| 系统通知 | 系统事件 | `system_notification.html` |

## 挂载方式

| 层 | 挂载文件 | 挂载方式 | 是否自动 |
|---|---|---|---|
| service | `email/service.py` | 业务调用 | ❌ 手动 |
| event | `email/events.py` | 事件监听 | ✅ 自动 |
| queue | `email/tasks.py` | 异步队列 | ✅ 自动 |

## 目录结构

```
common/modules/email/
├── __init__.py
├── config.py           # 邮件配置（SMTP、发件人）
├── service.py          # 邮件发送服务
├── templates.py        # 模板渲染
├── events.py           # 事件监听（审批通知等）
├── tasks.py            # 异步任务（队列发送）
├── schemas.py          # 数据模型
└── router.py           # API 路由

templates/email/
├── base.html           # 基础模板
├── verification.html   # 注册验证
├── password_reset.html # 密码重置
├── approval_notification.html  # 审批通过
├── rejection_notification.html # 审批拒绝
└── system_notification.html    # 系统通知
```

## 邮件服务

```python
# email/service.py
class EmailService:
    def __init__(self, config: EmailConfig):
        self.config = config
        self.template_engine = TemplateEngine()
    
    async def send_verification(self, to: str, code: str):
        """发送验证邮件"""
        html = self.template_engine.render('verification.html', {
            'code': code,
            'expire_minutes': 30
        })
        await self._send(to, '邮箱验证', html)
    
    async def send_password_reset(self, to: str, token: str):
        """发送密码重置邮件"""
        reset_url = f"{self.config.frontend_url}/reset-password?token={token}"
        html = self.template_engine.render('password_reset.html', {
            'reset_url': reset_url,
            'expire_minutes': 30
        })
        await self._send(to, '密码重置', html)
    
    async def send_approval_notification(self, to: str, member_name: str):
        """发送审批通过通知"""
        html = self.template_engine.render('approval_notification.html', {
            'member_name': member_name,
            'login_url': f"{self.config.frontend_url}/login"
        })
        await self._send(to, '账号审批通过', html)
    
    async def _send(self, to: str, subject: str, html: str):
        """发送邮件（异步）"""
        # 记录日志
        logging_service.create_log(
            level="INFO",
            layer="Email",
            message=f"Send email: {subject}",
            extra_data={"to": to, "subject": subject}
        )
        # 发送邮件
        await self.smtp_client.send(to, subject, html)
```

## 事件监听

```python
# email/events.py
from common.events import event_bus

@event_bus.on('member.approved')
async def on_member_approved(member_id: str, email: str, name: str):
    """会员审批通过时发送邮件"""
    await email_service.send_approval_notification(email, name)

@event_bus.on('member.rejected')
async def on_member_rejected(member_id: str, email: str, reason: str):
    """会员审批拒绝时发送邮件"""
    await email_service.send_rejection_notification(email, reason)
```

## 异步队列

```python
# email/tasks.py
from celery import shared_task

@shared_task
def send_email_task(to: str, subject: str, html: str):
    """异步发送邮件任务"""
    email_service.send_sync(to, subject, html)
```

## 邮件模板

```html
<!-- templates/email/verification.html -->
{% extends "base.html" %}

{% block content %}
<h1>邮箱验证</h1>
<p>您的验证码是：<strong>{{ code }}</strong></p>
<p>验证码将在 {{ expire_minutes }} 分钟后过期。</p>
{% endblock %}
```

## 配置

```python
# email/config.py
class EmailConfig:
    SMTP_HOST: str = "smtp.example.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = "noreply@example.com"
    SMTP_PASSWORD: str = "***"
    SENDER_NAME: str = "系统通知"
    SENDER_EMAIL: str = "noreply@example.com"
    FRONTEND_URL: str = "https://example.com"
```

## 单一职责

| 文件 | 职责 |
|---|---|
| `config.py` | 邮件配置 |
| `service.py` | 邮件发送 |
| `templates.py` | 模板渲染 |
| `events.py` | 事件监听 |
| `tasks.py` | 异步任务 |
| `schemas.py` | 数据模型 |
| `router.py` | API 路由 |

## 日志格式

```json
{
  "source": "backend",
  "level": "INFO",
  "layer": "Email",
  "message": "Send email: 邮箱验证",
  "file": "common/modules/email/service.py",
  "line": 45,
  "function": "send_verification",
  "trace_id": "550e8400-e29b-41d4-a716-446655440000",
  "created_at": "2023-12-21 14:30:00.123",
  "to": "user@example.com",
  "subject": "邮箱验证"
}
```


# 前端邮件方案

## 邮件触发场景

| 场景 | 触发时机 | API |
|---|---|---|
| 注册验证 | 用户注册后 | `POST /api/v1/email/verify` |
| 密码重置 | 点击忘记密码 | `POST /api/v1/email/reset-password` |
| 账号审批通知 | 管理员审批后 | 后端自动触发 |
| 系统通知 | 后端事件触发 | 后端自动触发 |

## 前端职责

| 职责 | 说明 |
|---|---|
| 触发请求 | 调用邮件 API |
| 状态反馈 | 显示发送中/成功/失败 |
| 重发限制 | 倒计时防止频繁发送 |
| 验证码输入 | 提供输入框和验证 |

## 目录结构

```
shared/
├── services/
│   └── email.service.js      # 邮件 API 服务
│
├── hooks/
│   └── useEmailVerification.js  # 邮件验证 Hook
│
└── components/
    ├── EmailVerificationForm.jsx  # 验证码输入表单
    └── ResendButton.jsx           # 重发按钮（带倒计时）
```

## 代码结构

### email.service.js

```javascript
export const emailService = {
  sendVerification(email) { /* 发送验证邮件 */ },
  verifyCode(email, code) { /* 验证验证码 */ },
  sendPasswordReset(email) { /* 发送密码重置邮件 */ },
};
```

### useEmailVerification.js

```javascript
export function useEmailVerification() {
  // 状态：countdown, isSending, error
  // 方法：sendCode, verifyCode, resend
}
```

## 单一职责

| 文件 | 职责 |
|---|---|
| `email.service.js` | 邮件 API 调用 |
| `useEmailVerification.js` | 验证流程状态管理 |
| `EmailVerificationForm.jsx` | 验证码输入 UI |
| `ResendButton.jsx` | 重发按钮 + 倒计时 |

# 后端邮件方案

## 邮件类型

| 类型 | 触发时机 | 模板 |
|---|---|---|
| 验证邮件 | 用户注册 | `verification.html` |
| 密码重置 | 忘记密码请求 | `password_reset.html` |
| 审批通过 | 管理员审批会员 | `approval_approved.html` |
| 审批拒绝 | 管理员拒绝会员 | `approval_rejected.html` |
| 系统通知 | 系统事件 | `notification.html` |

## 发送方式

| 方式 | 说明 | 使用场景 |
|---|---|---|
| 同步发送 | 立即发送，等待结果 | 验证邮件（需要即时反馈） |
| 异步队列 | 放入队列，后台发送 | 批量通知、非紧急邮件 |

## 目录结构

```
common/modules/email/
├── __init__.py
├── config.py           # 邮件配置（SMTP、发件人）
├── service.py          # 邮件发送服务
├── templates.py        # 模板加载
├── queue.py            # 异步队列
├── schemas.py          # 数据模型
└── router.py           # API 路由

templates/email/
├── base.html           # 基础模板
├── verification.html   # 验证邮件
├── password_reset.html # 密码重置
├── approval_approved.html  # 审批通过
├── approval_rejected.html  # 审批拒绝
└── notification.html   # 系统通知
```

## 代码结构

### config.py

```python
class EmailConfig:
    SMTP_HOST: str
    SMTP_PORT: int
    SMTP_USER: str
    SMTP_PASSWORD: str
    FROM_EMAIL: str
    FROM_NAME: str
```

### service.py

```python
class EmailService:
    def send_verification(self, email: str, code: str): ...
    def send_password_reset(self, email: str, token: str): ...
    def send_approval_notification(self, email: str, status: str): ...
    def send_notification(self, email: str, subject: str, content: str): ...
```

### templates.py

```python
class EmailTemplateService:
    def render(self, template_name: str, context: dict) -> str: ...
    def get_subject(self, template_name: str, context: dict) -> str: ...
```

### queue.py

```python
class EmailQueue:
    def enqueue(self, email_task: EmailTask): ...
    def process(self): ...
```

### router.py

```python
@router.post("/verify")
async def send_verification(email: str): ...

@router.post("/verify/confirm")
async def verify_code(email: str, code: str): ...

@router.post("/reset-password")
async def send_password_reset(email: str): ...
```

## 单一职责

| 文件 | 职责 |
|---|---|
| `config.py` | 邮件配置 |
| `service.py` | 邮件发送 |
| `templates.py` | 模板渲染 |
| `queue.py` | 异步队列 |
| `schemas.py` | 数据模型 |
| `router.py` | API 路由 |

## 邮件日志

| 字段 | 说明 |
|---|---|
| `email_type` | 邮件类型 |
| `recipient` | 收件人 |
| `subject` | 邮件主题 |
| `status` | 发送状态（pending/sent/failed） |
| `error_message` | 失败原因 |
| `sent_at` | 发送时间 |
| `trace_id` | 追踪 ID |
