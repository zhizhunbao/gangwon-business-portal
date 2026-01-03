# RESTful API 设计规范 (API Design Standard)

## 概述

本规范基于 RESTful 架构风格，定义 API 设计的最佳实践，适用于 FastAPI 项目。

---

## 一、URL 设计

### 资源命名

```
# ✅ 正确：名词复数，小写，连字符分隔
GET    /users
GET    /users/{id}
GET    /user-profiles
GET    /order-items

# ❌ 错误
GET    /getUsers           # 不要用动词
GET    /user               # 用复数
GET    /User               # 不要大写
GET    /user_profiles      # 用连字符，不用下划线
```

### 资源层级

```
# 嵌套资源（父子关系）
GET    /users/{user_id}/orders              # 用户的订单列表
GET    /users/{user_id}/orders/{order_id}   # 用户的特定订单
POST   /users/{user_id}/orders              # 为用户创建订单

# 最多嵌套 2 层，超过则扁平化
# ❌ 过深嵌套
GET    /users/{user_id}/orders/{order_id}/items/{item_id}/reviews

# ✅ 扁平化
GET    /order-items/{item_id}/reviews
```

### 查询参数

```
# 分页
GET /users?page=1&page_size=20

# 排序
GET /users?sort=created_at&order=desc
GET /users?sort=-created_at              # 简写：- 表示降序

# 过滤
GET /users?status=active&role=admin

# 字段选择
GET /users?fields=id,name,email

# 搜索
GET /users?q=john
GET /users?search=john@example.com
```

---

## 二、HTTP 方法

| 方法 | 用途 | 幂等 | 安全 | 请求体 | 示例 |
|------|------|------|------|--------|------|
| GET | 获取资源 | ✅ | ✅ | ❌ | 获取用户列表 |
| POST | 创建资源 | ❌ | ❌ | ✅ | 创建新用户 |
| PUT | 全量更新 | ✅ | ❌ | ✅ | 替换整个用户信息 |
| PATCH | 部分更新 | ✅ | ❌ | ✅ | 更新用户邮箱 |
| DELETE | 删除资源 | ✅ | ❌ | ❌ | 删除用户 |

### CRUD 映射

```
# 用户资源
GET    /users              # 列表
GET    /users/{id}         # 详情
POST   /users              # 创建
PUT    /users/{id}         # 全量更新
PATCH  /users/{id}         # 部分更新
DELETE /users/{id}         # 删除
```

### 非 CRUD 操作

```
# 方案1：使用动词（特殊操作）
POST   /users/{id}/activate        # 激活用户
POST   /users/{id}/deactivate      # 停用用户
POST   /orders/{id}/cancel         # 取消订单
POST   /orders/{id}/refund         # 退款

# 方案2：使用 PATCH + 状态
PATCH  /users/{id}                 # {"status": "active"}
PATCH  /orders/{id}                # {"status": "cancelled"}
```

---

## 三、HTTP 状态码

### 成功响应 (2xx)

| 状态码 | 含义 | 使用场景 |
|--------|------|---------|
| 200 OK | 成功 | GET、PUT、PATCH、DELETE 成功 |
| 201 Created | 已创建 | POST 创建资源成功 |
| 204 No Content | 无内容 | DELETE 成功，无返回体 |

### 客户端错误 (4xx)

| 状态码 | 含义 | 使用场景 |
|--------|------|---------|
| 400 Bad Request | 请求错误 | 参数格式错误、验证失败 |
| 401 Unauthorized | 未认证 | 未登录、Token 无效 |
| 403 Forbidden | 无权限 | 已登录但无权访问 |
| 404 Not Found | 未找到 | 资源不存在 |
| 409 Conflict | 冲突 | 资源已存在、状态冲突 |
| 422 Unprocessable Entity | 无法处理 | 业务逻辑错误 |
| 429 Too Many Requests | 请求过多 | 触发限流 |

### 服务端错误 (5xx)

| 状态码 | 含义 | 使用场景 |
|--------|------|---------|
| 500 Internal Server Error | 服务器错误 | 未捕获的异常 |
| 502 Bad Gateway | 网关错误 | 上游服务不可用 |
| 503 Service Unavailable | 服务不可用 | 维护中、过载 |

---

## 四、请求/响应格式

### 请求体

```json
// POST /users
{
    "name": "张三",
    "email": "zhangsan@example.com",
    "password": "********",
    "role": "user"
}

// PATCH /users/{id}（部分更新）
{
    "email": "new-email@example.com"
}
```

### 成功响应

```json
// 单个资源
{
    "id": 1,
    "name": "张三",
    "email": "zhangsan@example.com",
    "role": "user",
    "created_at": "2024-01-15T08:30:00Z",
    "updated_at": "2024-01-15T08:30:00Z"
}

// 列表资源（带分页）
{
    "items": [
        {"id": 1, "name": "张三"},
        {"id": 2, "name": "李四"}
    ],
    "total": 100,
    "page": 1,
    "page_size": 20,
    "pages": 5
}
```

### 错误响应

```json
// 标准错误格式
{
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "请求参数验证失败",
        "details": [
            {
                "field": "email",
                "message": "邮箱格式不正确"
            },
            {
                "field": "password",
                "message": "密码长度至少8位"
            }
        ]
    }
}

// 简单错误
{
    "error": {
        "code": "NOT_FOUND",
        "message": "用户不存在"
    }
}
```

---

## 五、分页设计

### 偏移分页（Offset Pagination）

```
GET /users?page=2&page_size=20

响应：
{
    "items": [...],
    "total": 100,
    "page": 2,
    "page_size": 20,
    "pages": 5
}
```

**优点**: 简单，支持跳页
**缺点**: 大数据量时性能差

### 游标分页（Cursor Pagination）

```
GET /users?cursor=eyJpZCI6MTAwfQ&limit=20

响应：
{
    "items": [...],
    "next_cursor": "eyJpZCI6MTIwfQ",
    "has_more": true
}
```

**优点**: 性能好，数据一致性
**缺点**: 不支持跳页

### 选择建议

| 场景 | 推荐方案 |
|------|---------|
| 后台管理列表 | 偏移分页 |
| 移动端无限滚动 | 游标分页 |
| 数据量 < 10万 | 偏移分页 |
| 数据量 > 10万 | 游标分页 |

---

## 六、版本控制

### URL 路径版本（推荐）

```
GET /api/v1/users
GET /api/v2/users
```

### Header 版本

```
GET /api/users
Accept: application/vnd.api+json; version=1
```

### 版本策略

- 主版本号变更：破坏性变更（字段删除、类型变更）
- 保持向后兼容：新增字段、新增端点
- 同时维护最多 2 个版本
- 旧版本废弃前至少通知 6 个月

---

## 七、认证与授权

### Bearer Token

```
GET /api/v1/users
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### API Key

```
GET /api/v1/users
X-API-Key: your-api-key
```

### 响应示例

```json
// 401 Unauthorized
{
    "error": {
        "code": "UNAUTHORIZED",
        "message": "Token 已过期，请重新登录"
    }
}

// 403 Forbidden
{
    "error": {
        "code": "FORBIDDEN",
        "message": "无权访问该资源"
    }
}
```

---

## 八、FastAPI 实现示例

### 路由定义

```python
from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Annotated

router = APIRouter(prefix="/api/v1/users", tags=["users"])

@router.get("", response_model=UserListResponse)
async def list_users(
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    status: Annotated[str | None, Query()] = None,
    service: UserService = Depends(get_user_service),
):
    """获取用户列表"""
    return await service.list_users(page, page_size, status)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    service: UserService = Depends(get_user_service),
):
    """获取用户详情"""
    user = await service.get_user(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "用户不存在"}
        )
    return user


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    data: UserCreateRequest,
    service: UserService = Depends(get_user_service),
):
    """创建用户"""
    return await service.create_user(data)


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    data: UserUpdateRequest,
    service: UserService = Depends(get_user_service),
):
    """更新用户"""
    return await service.update_user(user_id, data)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    service: UserService = Depends(get_user_service),
):
    """删除用户"""
    await service.delete_user(user_id)
```

### DTO 定义

```python
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime

class UserCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8)
    role: str = "user"


class UserUpdateRequest(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    email: EmailStr | None = None


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    items: list[UserResponse]
    total: int
    page: int
    page_size: int
    pages: int
```

### 异常处理

```python
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

app = FastAPI()

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    details = [
        {"field": err["loc"][-1], "message": err["msg"]}
        for err in exc.errors()
    ]
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "请求参数验证失败",
                "details": details
            }
        }
    )


class AppException(Exception):
    def __init__(self, code: str, message: str, status_code: int = 400):
        self.code = code
        self.message = message
        self.status_code = status_code


@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message
            }
        }
    )
```

---

## 九、设计检查清单

### URL 设计

- [ ] 资源名是否为名词复数？
- [ ] 是否使用小写和连字符？
- [ ] 嵌套层级是否 ≤ 2？
- [ ] 查询参数命名是否一致？

### HTTP 方法

- [ ] GET 是否只用于读取？
- [ ] POST 是否用于创建？
- [ ] PUT/PATCH 区分是否正确？
- [ ] DELETE 是否幂等？

### 状态码

- [ ] 成功是否返回正确的 2xx？
- [ ] 客户端错误是否返回 4xx？
- [ ] 服务端错误是否返回 5xx？

### 响应格式

- [ ] 是否使用统一的响应结构？
- [ ] 错误响应是否包含 code 和 message？
- [ ] 列表是否包含分页信息？
- [ ] 时间格式是否为 ISO 8601？

### 安全

- [ ] 是否使用 HTTPS？
- [ ] 敏感数据是否脱敏？
- [ ] 是否有认证机制？
- [ ] 是否有限流保护？
