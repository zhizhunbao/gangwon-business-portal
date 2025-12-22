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
│   ├── interceptors/
│   │   ├── index.js              # 拦截器入口
│   │   ├── api.interceptor.js    # API 请求/响应拦截
│   │   ├── router.interceptor.jsx # 路由变更拦截
│   │   └── auth.interceptor.js   # 认证日志拦截
│   │
│   ├── hooks/
│   │   ├── index.js              # Hooks 入口
│   │   └── log/                  # 日志 Hooks
│   │       ├── useStoreLog.js
│   │       ├── useHookLog.js
│   │       ├── useComponentLog.js
│   │       └── usePerformanceLog.js
│   │
│   ├── decorators/
│   │   ├── index.js              # 装饰器入口
│   │   └── withLog.js            # 方法日志装饰器
│   │
│   └── index.js                  # AOP 模块统一入口
```

## 代码规范

| 规范 | 要求 | 示例 |
|---|---|---|
| 命名 | 模块名.功能.js | `logger.core.js`、`logger.transport.js` |
| 导出 | 统一通过 index.js | `import { logger } from '@shared/aop'` |
| 常量 | 大写下划线 | `LOG_LEVELS`、`DEDUP_WINDOW` |
| 函数 | 动词开头 | `createLogger`、`formatLog` |
| 私有方法 | 下划线前缀 | `_sendToServer`、`_formatLog` |
| 注释 | JSDoc 格式 | `@param`、`@returns`、`@throws` |

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

## 单一职责

| 文件 | 职责 |
|---|---|
| `logger.core.js` | 日志级别、格式化 |
| `logger.transport.js` | 日志上报、批量、重试 |
| `logger.context.js` | traceId、requestId 管理 |
| `logger.dedup.js` | 日志去重 |
| `api.interceptor.js` | API 日志拦截 |
| `router.interceptor.jsx` | 路由日志拦截 |
| `auth.interceptor.js` | 认证日志拦截 |
| `withLog.js` | 方法日志装饰 |
| `useStoreLog.js` | Store 日志 Hook |
| `useHookLog.js` | Hook 日志 Hook |
| `useComponentLog.js` | 组件日志 Hook |
| `usePerformanceLog.js` | 性能日志 Hook |

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
 |
| 未实现| ❌ |
| 用户行为埋点 已实现但未广泛使用 ` | `autoLog()器 | ⚠️ 
| AOP 装饰 | 组件rorBoundary`界 | ✅ | `Er| React 错误边ion` |
dledrejectr` + `unhanow.errowind获 | ✅ | `局异常捕` |
| 全ontend/logslogging/frv1/`/api/ | ✅ | POST 上报 |
| 上报方式秒内相同日志不重复✅ | 10机制 | | 去重动过滤 |
ken 等自word、to pass | ✅ | |
| 敏感信息脱敏| ❌ | 未实现questId 
| re |，自动生成 | ✅ | 会话级别
| traceIdAL |CRITIC / ING / ERROR WARN /G / INFO | ✅ | DEBU 日志级别---|
|
|---|---|说明 || 状态 |  能力 心能力现状

| |

## 核I 警告（>2s）慢 AP 仅- | ⚠️ |ance |  perform|
| | ❌ | 未实现 ents | -
| compon实现 | | ❌ | 未oks | -未实现 |
| ho| ❌ | store | - 独立日志 |
| ervice 层，无 ❌ | 依赖 s - |th |au |
| eact 边界异常 + R| 全局` | ✅ Boundary.jsx`Errorr.js` + andleerrorHrror | ` |
| e自动记录 ✅ | 页面访问jsx` |eLogger.r | `Routoute r记录 |
|| 请求/响应/错误自动 | ✅ service.js`e | `api.ic
| serv-|---|---|-----|说明 |
|| | 状态 

| 层 | 文件 
## 日志分层现状
# 现状

---



---

# 现状

## 日志分层现状

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

## 核心能力现状

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
