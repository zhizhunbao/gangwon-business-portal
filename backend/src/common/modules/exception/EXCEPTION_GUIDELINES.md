# Exception Module Guidelines

## 目录结构

```
exception/
├── _01_contracts/              # 契约层 - 接口和数据契约
│   ├── __init__.py
│   ├── i_exception.py          # 异常接口
│   ├── i_exception_classifier.py
│   ├── i_exception_recorder.py
│   ├── i_exception_monitor.py
│   ├── i_exception_service.py
│   ├── i_layer_rule.py
│   ├── d_exception_context.py  # 数据契约
│   ├── d_exception_record.py
│   └── d_exception_stats.py
│
├── _02_abstracts/              # 抽象层 - 抽象基类
│   ├── __init__.py
│   ├── abstract_classifier.py
│   ├── abstract_recorder.py
│   ├── abstract_monitor.py
│   └── abstract_layer_rule.py
│
├── _03_impls/                  # 实现层 - 具体实现
│   ├── __init__.py
│   ├── impl_classifier.py
│   ├── impl_recorder.py
│   ├── impl_monitor.py
│   ├── impl_layer_rule.py
│   └── impl_custom_exception.py  # 自定义异常类
│
├── _04_services/               # 服务层 - 对外统一入口
│   ├── __init__.py
│   └── service_exception.py
│
├── _05_dtos/                   # DTO层 - 数据传输对象
│   ├── __init__.py
│   └── dto_frontend.py         # 前端异常上报 DTO
│
├── _06_models/                 # 模型层 - 数据库模型 (预留)
│   └── __init__.py
│
├── _07_router/                 # 路由层 - API 端点
│   ├── __init__.py
│   └── router_exception.py
│
├── _08_utils/                  # 辅助层 - 工具类
│   ├── __init__.py
│   ├── code_error.py           # 错误码定义
│   ├── const_exception.py      # 常量定义
│   └── handler_exception.py    # 异常处理器
│
└── __init__.py                 # 统一导出
```

## 使用方式

### 抛出异常

```python
from common.modules.exception import (
    ValidationError,
    AuthenticationError,
    NotFoundError,
    ConflictError,
    DatabaseError,
)

# 验证错误
raise ValidationError(
    message="Invalid email format",
    field_errors={"email": "Invalid format"}
)

# 认证错误
raise AuthenticationError("Token expired")

# 资源未找到
raise NotFoundError(
    message="User not found",
    resource_type="User",
    resource_id="123"
)
```

### 使用错误码

```python
from common.modules.exception import ErrorCode, ValidationError

raise ValidationError(
    message=ErrorCode.INVALID_EMAIL_FORMAT.message,
    context={"error_code": ErrorCode.INVALID_EMAIL_FORMAT}
)
```

### 记录异常

```python
from common.modules.exception import exception_service, DExceptionContext

context = DExceptionContext(
    trace_id=trace_id,
    request_id=request_id,
    user_id=user_id,
)

await exception_service.record_exception(exc, context)
```

## 异常类型

| 异常类 | HTTP 状态码 | 用途 |
|--------|------------|------|
| ValidationError | 400 | 数据验证失败 |
| AuthenticationError | 401 | 认证失败 |
| AuthorizationError | 403 | 授权失败 |
| NotFoundError | 404 | 资源未找到 |
| ConflictError | 409 | 资源冲突 |
| RateLimitError | 429 | 限流 |
| DatabaseError | 500 | 数据库错误 |
| ExternalServiceError | 502 | 外部服务错误 |
| InternalError | 500 | 内部错误 |

## 层级规则

异常只能在特定层级抛出：

- **Router 层**: 业务异常 (ValidationError, NotFoundError, etc.)
- **Service 层**: 所有业务异常
- **Repository 层**: DatabaseError
- **外部服务层**: ExternalServiceError
