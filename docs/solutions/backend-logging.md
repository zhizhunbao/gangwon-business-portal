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

| 文件 | 职责 |
|---|---|
| `config.py` | 配置常量 |
| `service.py` | 日志创建 |
| `middleware.py` | HTTP 中间件 |
| `db_writer.py` | 数据库写入 |
| `file_writer.py` | 文件写入 |
| `formatter.py` | 日志格式化 |
| `filters.py` | 敏感信息脱敏 |
| `request.py` | 请求上下文、traceId |
| `client.py` | AOP 封装 Supabase |

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
| `layer` | string | ✅ | AOP 层 |
| `message` | string | ✅ | 日志消息 |
| `file` | string | ✅ | 代码文件路径 |
| `line` | number | ✅ | 代码行号 |
| `function` | string | ✅ | 函数/方法名 |
| `trace_id` | string | ✅ | 会话追踪 ID |
| `request_id` | string | ❌ | 请求追踪 ID |
| `user_id` | string | ❌ | 用户 ID |
| `created_at` | string | ✅ | 时间戳 |

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
未实现 |
| ❌ | OP  A数据库| 代替） |
用装饰器❌ | 未实现（使间件 | TTP 中py` |
| Hor.ecorat/d`audit| ✅ |  审计日志 ` |
|lers.pyon/handpti✅ | `exce常处理 | 量写入 |
| 全局异r.py` 异步批te | `db_wri据库写入 | ✅|
| 数入日志文件  写writer.py``file_入 | ✅ | 
| 文件写py` 过滤敏感字段 |`filters. ✅ | 息脱敏 |现 |
| 敏感信Id | ❌ | 未实
| request或自动生成 |ader 获取端 HeId | ✅ | 从前cetra|
|  CRITICAL NG / ERROR /NFO / WARNI DEBUG / I别 | ✅ |-|
| 日志级-|---|--|-- |
 | 说明| 状态能力 现状

| ## 核心能力 |

计日志装饰器 审y` | ✅ |`service.p.py` + tor`decoraaudit | 
|  |se ClientSupaba 无 AOP 封装 | ❌ |tabase | -  da
|处理 |✅ | 全局异常| rvice.py` .py` + `se| `handlersexception 
|  |间件使用装饰器，非中| ⚠️ rator.py` | `decoleware | --|
| midd|---|-
|---|---态 | 说明 |文件 | 状状

| 层 | 分层现
## 日志-

# 现状

--


---

# 现状

## 日志分层现状

| 层 | 文件 | 状态 | 说明 |
|---|---|---|---|
| middleware | `decorator.py` | ⚠️ | 使用装饰器，非中间件 |
| exception | `handlers.py` + `service.py` | ✅ | 全局异常处理 |
| database | - | ❌ | 无 AOP 封装 Supabase Client |
| audit | `decorator.py` + `service.py` | ✅ | 审计日志装饰器 |

## 核心能力现状

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
