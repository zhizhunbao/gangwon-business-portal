# Design Document: Logging System

## Overview

本设计文档描述了一个统一的 AOP（面向切面编程）日志系统，用于前端和后端的日志记录、追踪和监控。系统采用分层架构，通过拦截器、Hooks 和装饰器实现非侵入式日志记录，支持会话级别（traceId）和请求级别（requestId）的全链路追踪。

### 设计目标

1. **非侵入性**: 通过 AOP 方式自动记录日志，不修改业务代码
2. **全链路追踪**: 前后端统一的 traceId/requestId 机制
3. **高性能**: 异步批处理写入，不阻塞主线程
4. **可扩展性**: 模块化设计，易于添加新的日志层
5. **安全性**: 自动过滤敏感信息

## Architecture

```mermaid
graph TB
    subgraph Frontend
        FE_App[Application]
        FE_Interceptors[Interceptors]
        FE_Hooks[Log Hooks]
        FE_Core[Logger Core]
        FE_Transport[Log Transport]
        FE_Dedup[Deduplication]
        FE_Context[Context Manager]
        
        FE_App --> FE_Interceptors
        FE_App --> FE_Hooks
        FE_Interceptors --> FE_Core
        FE_Hooks --> FE_Core
        FE_Core --> FE_Dedup
        FE_Dedup --> FE_Transport
        FE_Core --> FE_Context
    end
    
    subgraph Backend
        BE_App[Application]
        BE_Middleware[HTTP Middleware]
        BE_AOP[Supabase AOP Client]
        BE_Audit[Audit Decorator]
        BE_Service[Logging Service]
        BE_FileWriter[File Writer]
        BE_DBWriter[DB Writer]
        BE_Filter[Sensitive Filter]
        BE_Context[Request Context]
        
        BE_App --> BE_Middleware
        BE_App --> BE_AOP
        BE_App --> BE_Audit
        BE_Middleware --> BE_Service
        BE_AOP --> BE_Service
        BE_Audit --> BE_Service
        BE_Service --> BE_Filter
        BE_Filter --> BE_FileWriter
        BE_Filter --> BE_DBWriter
        BE_Middleware --> BE_Context
    end
    
    FE_Transport -->|HTTP POST| BE_API[/api/v1/logging/frontend/logs]
    BE_API --> BE_Service
    
    subgraph Storage
        Files[(Log Files)]
        DB[(Database)]
    end
    
    BE_FileWriter --> Files
    BE_DBWriter --> DB
```

## Components and Interfaces

### 前端组件

#### 1. Logger Core (`logger.core.js`)

```typescript
interface LogEntry {
  source: 'frontend';
  level: LogLevel;
  layer: LogLayer;
  message: string;
  file: string;
  line: number;
  function: string;
  trace_id: string;
  request_id?: string;
  user_id?: string;
  created_at: string;
  extra_data?: Record<string, any>;
}

type LogLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
type LogLayer = 'Service' | 'Router' | 'Auth' | 'Store' | 'Component' | 'Hook' | 'Performance';

interface LoggerCore {
  log(level: LogLevel, layer: LogLayer, message: string, extra?: Record<string, any>): void;
  debug(layer: LogLayer, message: string, extra?: Record<string, any>): void;
  info(layer: LogLayer, message: string, extra?: Record<string, any>): void;
  warn(layer: LogLayer, message: string, extra?: Record<string, any>): void;
  error(layer: LogLayer, message: string, extra?: Record<string, any>): void;
  critical(layer: LogLayer, message: string, extra?: Record<string, any>): void;
}
```

#### 2. Context Manager (`logger.context.js`)

```typescript
interface LogContext {
  traceId: string;
  requestSequence: number;
  userId?: string;
}

interface ContextManager {
  getTraceId(): string;
  generateRequestId(): string;
  setUserId(userId: string): void;
  getUserId(): string | undefined;
  getContext(): LogContext;
}
```

#### 3. Log Transport (`logger.transport.js`)

```typescript
interface TransportConfig {
  endpoint: string;
  batchSize: number;
  batchInterval: number;
  maxRetries: number;
  retryDelays: number[];
}

interface LogTransport {
  enqueue(entry: LogEntry): void;
  flush(): Promise<void>;
  close(): Promise<void>;
}
```

#### 4. Deduplication (`logger.dedup.js`)

```typescript
interface DedupConfig {
  windowMs: number;  // 10000ms default
}

interface Deduplicator {
  shouldLog(entry: LogEntry): boolean;
  cleanup(): void;
}
```

#### 5. Interceptors

```typescript
// API Interceptor
interface ApiInterceptor {
  onRequest(config: AxiosRequestConfig): AxiosRequestConfig;
  onResponse(response: AxiosResponse): AxiosResponse;
  onError(error: AxiosError): Promise<never>;
}

// Router Interceptor (React Component)
interface RouteLoggerProps {}

// Auth Interceptor (Proxy-based)
interface AuthServiceProxy {
  login(credentials: Credentials): Promise<AuthResult>;
  logout(): Promise<void>;
  register(data: RegisterData): Promise<AuthResult>;
  refreshToken(): Promise<TokenResult>;
}
```

#### 6. Log Hooks

```typescript
// Store Log Hook
function useStoreLog(storeName: string, state: any): void;

// Hook Log Hook
function useHookLog(hookName: string, deps?: any[]): void;

// Component Log Hook
function useComponentLog(componentName: string): void;

// Performance Log Hook
interface PerformanceOptions {
  threshold?: number;  // 100ms default
  trackWebVitals?: boolean;
}
function usePerformanceLog(componentName: string, options?: PerformanceOptions): void;
```

### 后端组件

#### 1. HTTP Middleware (`middleware.py`)

```python
class LoggingMiddleware:
    """HTTP 请求/响应日志中间件"""
    
    async def __call__(
        self, 
        request: Request, 
        call_next: Callable
    ) -> Response:
        """
        记录请求开始、响应结束、耗时
        提取/生成 traceId 和 requestId
        """
        pass
```

#### 2. Unified Supabase Client (`supabase/unified_client.py`)

```python
class DatabaseOperationLogger:
    """数据库操作日志记录器 - 单一职责：记录数据库操作日志"""
    
    async def log_operation(
        self,
        table_name: str,
        operation_type: str,
        duration_ms: float,
        success: bool,
        error: Optional[Exception] = None,
        operation_data: Optional[Dict[str, Any]] = None
    ):
        """记录数据库操作日志"""
        pass

class DatabaseExceptionHandler:
    """数据库异常处理器 - 单一职责：处理数据库异常"""
    
    async def handle_exception(
        self,
        exception: Exception,
        table_name: str,
        operation_type: str,
        duration_ms: float
    ) -> DatabaseError:
        """处理数据库异常并返回标准化的 DatabaseError"""
        pass

class UnifiedSupabaseClient:
    """统一的 Supabase 客户端 - 通过组合模式集成日志记录和异常处理"""
    
    def table(self, table_name: str) -> 'UnifiedTable':
        """返回统一的表操作对象"""
        pass

class UnifiedTable:
    """统一的表操作 - 协调日志记录和异常处理"""
    
    def insert(self, data: dict) -> 'UnifiedQuery':
        pass
    
    def update(self, data: dict) -> 'UnifiedQuery':
        pass
    
    def delete(self) -> 'UnifiedQuery':
        pass

class UnifiedQuery:
    """统一的查询 - 协调执行、日志记录和异常处理"""
    
    async def execute(self) -> QueryResult:
        """执行查询，记录日志，处理异常"""
        pass
```

#### 3. Audit Decorator (`audit/decorator.py`)

```python
def audit_log(
    action: str,
    resource_type: Optional[str] = None,
    get_resource_id: Optional[Callable] = None,
) -> Callable:
    """
    审计日志装饰器
    
    Usage:
        @audit_log(action="APPROVE", resource_type="member")
        async def approve_member(...):
            ...
    """
    pass
```

#### 4. Logging Service (`service.py`)

```python
class LoggingService:
    """统一日志服务"""
    
    def create_log(
        self,
        source: str,
        level: str,
        layer: str,
        message: str,
        **kwargs
    ) -> None:
        """创建日志条目（文件 + 数据库）"""
        pass
    
    async def list_logs(
        self,
        db: AsyncSession,
        query: LogListQuery,
    ) -> LogListResponse:
        """查询日志列表"""
        pass
```

#### 5. File Writer (`file_writer.py`)

```python
class FileLogWriter:
    """异步文件日志写入器"""
    
    def write_log(self, **kwargs) -> None:
        """写入应用日志到 app.log"""
        pass
    
    def write_exception(self, **kwargs) -> None:
        """写入异常日志到 error.log"""
        pass
    
    def write_audit_log(self, **kwargs) -> None:
        """写入审计日志到 audit.log"""
        pass
```

#### 6. DB Writer (`db_writer.py`)

```python
class DatabaseLogWriter:
    """异步数据库日志写入器"""
    
    def enqueue_log(self, **kwargs) -> None:
        """入队应用日志（批处理）"""
        pass
    
    def write_error_log(self, **kwargs) -> None:
        """立即写入错误日志"""
        pass
    
    async def write_audit_log(self, **kwargs) -> Optional[dict]:
        """立即写入审计日志"""
        pass
    
    def write_system_log(self, **kwargs) -> None:
        """立即写入系统日志"""
        pass
```

## Data Models

### 日志条目结构

```typescript
// 统一日志字段（前后端通用）
interface BaseLogEntry {
  id: string;                    // UUID
  source: 'frontend' | 'backend';
  level: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  layer: string;                 // AOP 层
  message: string;
  file: string;
  line: number;
  function: string;
  trace_id: string;              // UUID v4
  request_id?: string;           // {traceId}-{sequence}
  user_id?: string;
  extra_data?: Record<string, any>;
  created_at: string;            // yyyy-MM-dd HH:mm:ss.SSS
}

// 应用日志扩展字段
interface AppLogEntry extends BaseLogEntry {
  ip_address?: string;
  user_agent?: string;
  request_method?: string;
  request_path?: string;
  request_data?: Record<string, any>;
  response_status?: number;
  duration_ms?: number;
}

// 错误日志扩展字段
interface ErrorLogEntry extends BaseLogEntry {
  error_type: string;
  error_code?: string;
  status_code?: number;
  stack_trace?: string;
  error_details?: Record<string, any>;
  context_data?: Record<string, any>;
}

// 审计日志
interface AuditLogEntry {
  id: string;
  user_id?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  ip_address?: string;
  user_agent?: string;
  extra_data?: Record<string, any>;
  created_at: string;
}

// 性能日志扩展字段
interface PerformanceLogEntry extends BaseLogEntry {
  metric_type: 'FCP' | 'LCP' | 'TTI' | 'API' | 'RENDER' | 'DB_QUERY';
  metric_value: number;
  threshold?: number;
  exceeded_threshold: boolean;
}
```

### 数据库表结构

```sql
-- 应用日志表
CREATE TABLE app_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source VARCHAR(20) NOT NULL,
  level VARCHAR(20) NOT NULL,
  layer VARCHAR(50),
  message TEXT NOT NULL,
  file VARCHAR(500),
  line INTEGER,
  function VARCHAR(200),
  trace_id VARCHAR(100),
  request_id VARCHAR(150),
  user_id UUID REFERENCES members(id),
  ip_address VARCHAR(50),
  user_agent TEXT,
  request_method VARCHAR(10),
  request_path VARCHAR(500),
  request_data JSONB,
  response_status INTEGER,
  duration_ms INTEGER,
  extra_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 错误日志表
CREATE TABLE error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source VARCHAR(20) NOT NULL,
  error_type VARCHAR(200) NOT NULL,
  error_message TEXT NOT NULL,
  error_code VARCHAR(50),
  status_code INTEGER,
  stack_trace TEXT,
  file VARCHAR(500),
  line INTEGER,
  function VARCHAR(200),
  trace_id VARCHAR(100),
  request_id VARCHAR(150),
  user_id UUID,
  ip_address VARCHAR(50),
  user_agent TEXT,
  request_method VARCHAR(10),
  request_path VARCHAR(500),
  request_data JSONB,
  error_details JSONB,
  context_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 审计日志表
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES members(id),
  action VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  ip_address VARCHAR(50),
  user_agent TEXT,
  extra_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 系统日志表
CREATE TABLE system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  logger_name VARCHAR(200),
  module VARCHAR(200),
  function VARCHAR(200),
  line_number INTEGER,
  process_id INTEGER,
  thread_name VARCHAR(100),
  extra_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 性能日志表
CREATE TABLE performance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source VARCHAR(20) NOT NULL,
  metric_type VARCHAR(50) NOT NULL,
  metric_value DECIMAL(10, 2) NOT NULL,
  threshold DECIMAL(10, 2),
  exceeded_threshold BOOLEAN DEFAULT FALSE,
  component VARCHAR(200),
  trace_id VARCHAR(100),
  user_id UUID,
  extra_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Log Entry Required Fields Completeness
*For any* log entry created by the Logging System, the entry SHALL contain all required fields: source, level, layer, message, file, line, function, trace_id, and created_at with non-null values.
**Validates: Requirements 1.1**

### Property 2: Log Entry JSON Serialization Round-Trip
*For any* valid log entry, serializing to JSON and deserializing back SHALL produce an equivalent log entry with timestamp in `yyyy-MM-dd HH:mm:ss.SSS` format.
**Validates: Requirements 1.8**

### Property 3: TraceId UUID v4 Format Validity
*For any* generated traceId, the value SHALL match the UUID v4 format pattern `^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`.
**Validates: Requirements 2.1**

### Property 4: RequestId Format Validity
*For any* generated requestId, the value SHALL follow the format `{traceId}-{sequence}` where traceId is a valid UUID v4 and sequence is a positive integer.
**Validates: Requirements 2.2**

### Property 5: API Request Header Propagation
*For any* API request sent from frontend, the request headers SHALL contain both `X-Trace-Id` and `X-Request-Id` with valid values.
**Validates: Requirements 2.3, 2.4**

### Property 6: Backend TraceId Extraction or Generation
*For any* HTTP request received by backend, if `X-Trace-Id` header is present, that value SHALL be used; otherwise a new valid UUID v4 SHALL be generated.
**Validates: Requirements 2.5, 2.6**

### Property 7: API Interceptor Request Logging
*For any* API request, the log entry SHALL contain request_method, request_path, and a valid start timestamp.
**Validates: Requirements 3.1**

### Property 8: API Interceptor Response Logging
*For any* API response, the log entry SHALL contain response_status, duration_ms (>= 0), and appropriate log level based on status code.
**Validates: Requirements 3.2**

### Property 9: Slow API Warning Threshold
*For any* API request with duration > 2000ms, the log level SHALL be WARNING or higher.
**Validates: Requirements 3.3**

### Property 10: Route Change Logging
*For any* route change event, the log entry SHALL contain the new path and navigation action (PUSH, POP, or REPLACE).
**Validates: Requirements 3.4**

### Property 11: Batch Transport Threshold
*For any* batch of log entries, when count reaches 10 OR 5 seconds elapse, the batch SHALL be sent to the backend endpoint.
**Validates: Requirements 5.1, 5.2**

### Property 12: Deduplication Within Window
*For any* two identical log entries within 10 seconds, only the first entry SHALL be recorded.
**Validates: Requirements 5.4**

### Property 13: Sensitive Data Filtering
*For any* log entry containing fields named "password" or "token", those field values SHALL be replaced with "[FILTERED]" before storage.
**Validates: Requirements 11.1, 11.2, 11.3**

### Property 14: HTTP Middleware Request Logging
*For any* HTTP request processed by middleware, the log entry SHALL contain request_method, request_path, and ip_address.
**Validates: Requirements 6.1**

### Property 15: HTTP Middleware Response Logging
*For any* HTTP response, the log entry SHALL contain response_status and duration_ms.
**Validates: Requirements 6.2**

### Property 16: Slow HTTP Request Warning
*For any* HTTP request with duration > 1000ms, the log level SHALL be WARNING or higher.
**Validates: Requirements 6.3**

### Property 17: Database Operation Logging
*For any* INSERT, UPDATE, or DELETE operation through LoggedSupabaseClient, a log entry SHALL be created with table_name and operation_type.
**Validates: Requirements 7.1, 7.2, 7.3**

### Property 18: Slow Database Query Warning
*For any* database query with duration > 500ms, the log level SHALL be WARNING or higher.
**Validates: Requirements 7.4**

### Property 19: Audit Log Completeness
*For any* function decorated with @audit_log, the audit entry SHALL contain action, resource_type, and user_id (if available).
**Validates: Requirements 8.1, 8.2**

### Property 20: File Rotation on Date Change
*For any* log file, when the current date differs from the file's last modification date, the file SHALL be rotated to a dated backup.
**Validates: Requirements 9.2**

### Property 21: Old File Cleanup
*For any* log backup file older than 30 days, the file SHALL be deleted during cleanup.
**Validates: Requirements 9.4**

### Property 22: Database Batch Write Threshold
*For any* application log batch, when count reaches 50 OR 5 seconds elapse, the batch SHALL be written to database.
**Validates: Requirements 10.1**

### Property 23: Exception Log Correlation
*For any* exception log entry, the entry SHALL contain trace_id and request_id (if available) for correlation.
**Validates: Requirements 12.3**

## Error Handling

### 前端错误处理

1. **日志上报失败**: 使用指数退避重试（1s, 2s, 4s），最多 3 次
2. **队列满**: 丢弃最旧的日志条目，记录警告
3. **网络断开**: 缓存日志到 localStorage，恢复后重新上报
4. **格式化错误**: 记录原始数据，标记为格式化失败

### 后端错误处理

1. **文件写入失败**: 回退到标准 logging，不阻塞业务
2. **数据库写入失败**: 优雅降级，仅写入文件
3. **队列满**: 同步写入，记录警告
4. **敏感信息过滤失败**: 使用原始数据，记录警告

### 错误恢复策略

```python
class GracefulDegradation:
    """优雅降级策略"""
    
    def write_log(self, entry: LogEntry) -> None:
        try:
            # 1. 尝试数据库写入
            self.db_writer.enqueue(entry)
        except Exception:
            try:
                # 2. 回退到文件写入
                self.file_writer.write(entry)
            except Exception:
                # 3. 最后回退到标准 logging
                logging.error(f"Failed to write log: {entry}")
```

## Testing Strategy

### 测试框架

- **前端**: Vitest + React Testing Library
- **后端**: pytest + pytest-asyncio
- **属性测试**: Hypothesis (Python) / fast-check (JavaScript)

### 单元测试

1. **Logger Core**: 测试日志级别、格式化、字段验证
2. **Context Manager**: 测试 traceId/requestId 生成
3. **Deduplicator**: 测试去重逻辑、时间窗口
4. **Sensitive Filter**: 测试敏感字段过滤
5. **File Writer**: 测试文件轮转、清理
6. **DB Writer**: 测试批处理、立即写入

### 属性测试

属性测试使用以下库：
- **Python**: `hypothesis`
- **JavaScript**: `fast-check`

每个属性测试必须：
1. 使用 `@given` 或 `fc.property` 装饰器
2. 运行至少 100 次迭代
3. 使用注释标记对应的 Correctness Property

示例：

```python
# Python - Hypothesis
from hypothesis import given, strategies as st, settings

@settings(max_examples=100)
@given(st.text(), st.sampled_from(['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']))
def test_log_entry_required_fields(message: str, level: str):
    """
    **Feature: logging-system, Property 1: Log Entry Required Fields Completeness**
    """
    entry = create_log_entry(message=message, level=level)
    assert entry.source is not None
    assert entry.level is not None
    assert entry.trace_id is not None
    assert entry.created_at is not None
```

```javascript
// JavaScript - fast-check
import fc from 'fast-check';

test('traceId should be valid UUID v4', () => {
  /**
   * **Feature: logging-system, Property 3: TraceId UUID v4 Format Validity**
   */
  fc.assert(
    fc.property(fc.integer(), () => {
      const traceId = generateTraceId();
      const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(traceId).toMatch(uuidV4Regex);
    }),
    { numRuns: 100 }
  );
});
```

### 集成测试

1. **前后端 traceId 贯通**: 验证请求链路追踪
2. **日志上报流程**: 验证批量上报、重试机制
3. **数据库写入**: 验证批处理、立即写入
4. **文件轮转**: 验证日期轮转、大小轮转
