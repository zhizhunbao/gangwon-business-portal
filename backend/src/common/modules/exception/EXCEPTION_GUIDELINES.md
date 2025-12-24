# Exception 异常处理模块

## 概述

提供统一的异常处理系统，包括自定义异常类、异常分类、上下文收集和日志集成。

## 文件结构

```
exception/
├── __init__.py       # 模块导出
├── exceptions.py     # 自定义异常类
├── handlers.py       # FastAPI 异常处理器
├── classifier.py     # 异常分类器
├── recorder.py       # 异常记录器
├── monitor.py        # 异常监控
├── service.py        # 异常服务
├── schemas.py        # Pydantic 模型
├── router.py         # API 路由
└── responses.py      # 响应格式
```

## 异常类型

| 异常类                 | HTTP 状态码 | 用途         |
| ---------------------- | ----------- | ------------ |
| `ValidationError`      | 400         | 数据验证失败 |
| `AuthenticationError`  | 401         | 认证失败     |
| `AuthorizationError`   | 403         | 权限不足     |
| `NotFoundError`        | 404         | 资源不存在   |
| `ConflictError`        | 409         | 资源冲突     |
| `RateLimitError`       | 429         | 请求频率限制 |
| `DatabaseError`        | 500         | 数据库错误   |
| `ExternalServiceError` | 502         | 外部服务错误 |
| `InternalError`        | 500         | 内部错误     |

## 使用方式

### 抛出异常

```python
from ...common.modules.exception import (
    ValidationError,
    NotFoundError,
    AuthenticationError,
)

# 验证错误
raise ValidationError(
    "Invalid email format",
    field_errors={"email": "Invalid format"}
)

# 资源不存在
raise NotFoundError("Member")

# 认证失败
raise AuthenticationError("Invalid credentials")
```

### 注册异常处理器

```python
# main.py
from src.common.modules.exception import register_exception_handlers

app = FastAPI()
register_exception_handlers(app)
```

## 响应格式

```json
{
  "error": {
    "type": "ValidationError",
    "message": "Validation failed",
    "code": "ValidationError",
    "field_errors": {
      "email": "Invalid format"
    }
  },
  "trace_id": "abc123",
  "request_id": "req-456"
}
```

## 扩展异常

```python
from ...common.modules.exception import BaseCustomException, ExceptionType

class CustomError(BaseCustomException):
    """自定义异常"""

    @property
    def http_status_code(self) -> int:
        return 422

    @property
    def exception_type(self) -> ExceptionType:
        return ExceptionType.VALIDATION_ERROR
```

## 业务错误码规范 (Business Error Codes)

为了更细粒度地处理认证、授权和业务逻辑错误，我们采用分段式数字编码 (`error_code`)。这些代码会在异常响应的 `error.code` 字段中返回。

### 编码段划分

| 代码范围        | 分类 (Category)    | 描述                                        |
| :-------------- | :----------------- | :------------------------------------------ |
| **1000 - 1999** | **Authentication** | 登录失败、凭据无效、Token 相关问题          |
| **2000 - 2999** | **Account Status** | 账号状态问题（待审批、已停用、已删除）      |
| **3000 - 3999** | **Authorization**  | 权限不足、角色不匹配、资源所有权 (ACL) 问题 |
| **4000 - 4999** | **Validation**     | 业务逻辑检查失败、格式错误、重复录入        |
| **5000 - 5999** | **System**         | 数据库/代码层异常、外部服务异常             |

### 具体代码定义 (Initial)

- **1001**: `INVALID_CREDENTIALS` - 账号或密码错误 (Member)
- **1002**: `INVALID_ADMIN_CREDENTIALS` - 管理员凭据错误
- **2001**: `ACCOUNT_PENDING_APPROVAL` - 账号正在审核中
- **2002**: `ACCOUNT_SUSPENDED` - 账号已停用/封禁
- **3001**: `ADMIN_REQUIRED` - 需要管理员权限
- **3002**: `MEMBER_REQUIRED` - 需要普通会员权限

### 最佳实践

1. **抛出异常时指定代码**：
   ```python
   raise AuthorizationError(
       "Invalid credentials",
       context={"error_code": "1001"}
   )
   ```
2. **前端分类处理**：
   前端 `ApiErrorClassifier` 应根据代码区间（如 `1000~1999`）自动判定错误的子类型 (`subCategory`)。
3. **i18n 映射**：
   前端应将这些数字代码直接映射到各语言版本的 `locales/{lang}.json` 中，确保提示语的一致性。
