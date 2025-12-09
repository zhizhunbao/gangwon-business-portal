# Backend Logging Guide / 后端日志指南

**文档版本**: 2.0  
**创建日期**: 2025-12-02  
**更新日期**: 2025-12-02  
**状态**: 进行中（阶段一、二、三已完成）  
**适用范围**: 仅限后端（Backend）日志系统

---

## 📌 文档说明

本文档是**后端日志系统**的完整指南，包含日志记录机制、使用方法和最佳实践，不包含前端日志相关内容。

**文档范围**：
- ✅ 后端路由层（router.py）日志补全
- ✅ 后端服务层（service.py）日志清理
- ✅ 后端依赖文件（dependencies.py）日志补全
- ✅ 后端辅助工具脚本
- ❌ 不包含前端日志相关内容

---

## 📋 一、目标和原则

### 核心目标

1. **完整的日志调用链**：每个 HTTP 请求从开始到结束都有完整的日志记录
2. **统一的日志格式**：所有日志使用统一的格式，便于分析和追踪
3. **自动化的异常记录**：所有异常由全局异常处理器自动捕获和记录
4. **清晰的职责分离**：路由层记录业务日志，服务层不记录日志

### 日志记录原则

| 层级 | 职责 | 记录内容 |
|------|------|---------|
| **HTTP 中间件** | 自动记录 | 请求基本信息（方法、路径、状态码、耗时） |
| **路由层 (Router)** | 装饰器自动记录 | 业务操作日志（成功、失败、查询结果）<br/>- 使用 `@auto_log` 装饰器自动记录业务日志<br/>- 使用 `@audit_log` 装饰器自动记录审计日志 |
| **服务层 (Service)** | ❌ 不记录 | 只包含业务逻辑，不记录任何日志 |
| **数据库层** | 自动记录 | SQL 执行日志（通过 SQLAlchemy 事件监听器） |
| **全局异常处理器** | 自动记录 | 所有未捕获的异常（5xx 错误） |

### 日志类型说明

| 日志类型 | 服务 | 存储位置 | 记录时机 | 用途 |
|---------|------|---------|---------|------|
| **业务日志** | `@auto_log` 装饰器 | `app_logs.log` | 路由层装饰器自动记录 | 系统运行、调试、监控 |
| **异常日志** | 全局异常处理器自动记录 | `app_exceptions.log` | 异常发生时自动记录 | 异常追踪、错误分析 |
| **审计日志** | `@audit_log` 装饰器 | 数据库 `audit_logs` 表 | 关键操作时装饰器自动记录 | 合规性、安全审计 |
| **SQL 日志** | SQLAlchemy 事件监听器 | `app_logs.log` | SQL 执行时自动记录 | 数据库操作追踪 |

---

## 📝 一、自动日志记录机制

### 1.1 业务日志自动记录（装饰器方式）

业务日志可以通过 `@auto_log` 装饰器自动记录，无需手动调用 `logging_service.create_log()`。

**实现位置**：`backend/src/common/modules/logger/decorator.py`

**工作原理**：
- `@auto_log` 是一个装饰器工厂函数，接受参数并返回装饰器
- 装饰器包装路由函数，在执行前后自动记录日志
- 自动提取资源ID、结果数量等信息
- 自动关联请求上下文（trace_id, user_id, request_path等）

**使用示例**：

```python
from ...common.modules.logger import auto_log

@router.post("/api/members")
@auto_log("create_member", log_resource_id=True)
async def create_member(data: MemberCreate, request: Request, db: AsyncSession):
    member = await service.create_member(data, db)
    return MemberResponse.model_validate(member)
    # 自动记录成功日志，包含 member.id
```

**装饰器参数**：
- `operation_name`: 操作名称（必需）
- `success_message`: 自定义成功消息（可选）
- `error_message`: 自定义错误消息（可选）
- `log_resource_id`: 是否提取并记录资源ID（默认：True）
- `log_result_count`: 是否提取并记录结果数量（默认：False）
- `log_level`: 成功日志级别（默认："INFO"）

**自动提取功能**：
- 从返回值自动提取资源ID（支持 Pydantic 模型、字典、对象等）
- 从返回值自动提取结果数量（支持列表、元组、字典等）
- 自动处理异常并记录错误日志
- 自动关联请求上下文信息

### 1.2 审计日志自动记录（装饰器方式）

审计日志可以通过 `@audit_log` 装饰器自动记录，无需手动调用 `audit_log_service.create_audit_log()`。

**实现位置**：`backend/src/common/modules/audit/decorator.py`

**工作原理**：
- `@audit_log` 是一个装饰器工厂函数，接受操作类型和资源类型参数
- 装饰器包装路由函数，在执行后自动记录审计日志
- 自动提取资源ID、用户ID、IP地址等信息
- 自动记录到数据库 `audit_logs` 表

**使用示例**：

```python
from ...common.modules.audit import audit_log

@router.post("/api/members")
@audit_log(action="create", resource_type="member")
async def create_member(data: MemberCreate, request: Request, db: AsyncSession):
    member = await service.create_member(data, db)
    return MemberResponse.model_validate(member)
    # 自动记录审计日志到数据库
```

**装饰器参数**：
- `action`: 操作类型（必需，如 'create', 'update', 'delete', 'approve', 'login'）
- `resource_type`: 资源类型（可选，如 'member', 'performance', 'project'）
- `get_resource_id`: 提取资源ID的函数（可选，默认从返回值提取）

**组合使用**（业务日志 + 审计日志）：

```python
from ...common.modules.logger import auto_log
from ...common.modules.audit import audit_log

@router.post("/api/members")
@auto_log("create_member", log_resource_id=True)  # 业务日志
@audit_log(action="create", resource_type="member")  # 审计日志
async def create_member(...):
    # 自动记录：业务日志（app_logs.log）+ 审计日志（数据库）
```

**装饰器执行顺序**：
- 装饰器从下往上执行
- `@audit_log` 应该放在 `@auto_log` 下面（更靠近函数）
- 这样 `@audit_log` 先执行，`@auto_log` 后执行

### 1.3 数据库日志记录方式

数据库操作日志通过 SQLAlchemy 事件监听器自动记录，无需手动调用。

**实现位置**：`backend/src/common/modules/db/session.py`

#### 事件监听器

1. **`before_cursor_execute`** - SQL 执行前记录
   - **触发时机**：每次 SQL 语句执行前
   - **记录内容**：
     - SQL 操作类型（SELECT, INSERT, UPDATE, DELETE, COMMIT, ROLLBACK, BEGIN, OTHER）
     - 完整的 SQL 语句（规范化后，单行格式）
     - 连接 ID
     - 是否为 executemany 操作
   - **日志级别**：DEBUG
   - **日志格式**：
     ```json
     {
       "message": "SQL SELECT: SELECT * FROM members WHERE id = ?",
       "module": "db.session",
       "function": "before_cursor_execute",
       "level": "DEBUG",
       "extra_data": {
         "db_operation": "SELECT",
         "connection_id": 123456789,
         "executemany": false
       }
     }
     ```

2. **`after_cursor_execute`** - SQL 执行后记录
   - **触发时机**：SQL 语句执行后（仅记录 INSERT, UPDATE, DELETE 操作）
   - **记录内容**：
     - SQL 操作类型
     - 受影响的行数（rowcount）
     - 连接 ID
   - **日志级别**：INFO
   - **日志格式**：
     ```json
     {
       "message": "SQL INSERT completed: 1 rows affected",
       "module": "db.session",
       "function": "after_cursor_execute",
       "level": "INFO",
       "extra_data": {
         "db_operation": "INSERT",
         "rows_affected": 1,
         "connection_id": 123456789
       }
     }
     ```

#### 请求上下文集成

SQL 日志自动包含请求上下文信息（通过 `get_request_context()` 获取）：
- `trace_id` - 请求追踪 ID
- `user_id` - 用户 ID（UUID 类型）
- `request_path` - 请求路径
- `request_method` - HTTP 方法
- `ip_address` - IP 地址
- `user_agent` - User Agent

这些信息在 HTTP 中间件中通过 `set_request_context()` 设置，确保 SQL 日志能够关联到具体的 HTTP 请求。

#### SQL 语句规范化

- 移除换行符，转换为单行格式
- 保留完整的 SQL 语句内容
- 自动识别操作类型（SELECT, INSERT, UPDATE, DELETE 等）

#### 注意事项

1. **所有 SQL 操作都会记录**：包括 SELECT、INSERT、UPDATE、DELETE、COMMIT、ROLLBACK、BEGIN 等
2. **SELECT 操作只记录执行前**：不记录执行后的结果（避免日志过多）
3. **INSERT/UPDATE/DELETE 记录完整信息**：包括执行前和执行后（含受影响行数）
4. **自动关联请求上下文**：无需手动传递 trace_id、user_id 等信息
5. **日志存储位置**：所有 SQL 日志存储在 `app_logs.log` 文件中

#### 示例日志

**SELECT 操作**：
```json
{
  "timestamp": "2025-12-02T10:30:45.123456",
  "source": "backend",
  "level": "DEBUG",
  "message": "SQL SELECT: SELECT id, name, email FROM members WHERE id = $1",
  "module": "db.session",
  "function": "before_cursor_execute",
  "trace_id": "abc123",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "request_path": "/api/member/profile",
  "request_method": "GET",
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "extra_data": {
    "db_operation": "SELECT",
    "connection_id": 123456789,
    "executemany": false
  }
}
```

**INSERT 操作**（执行前 + 执行后）：
```json
// 执行前
{
  "timestamp": "2025-12-02T10:30:45.123456",
  "source": "backend",
  "level": "DEBUG",
  "message": "SQL INSERT: INSERT INTO members (name, email) VALUES ($1, $2)",
  "module": "db.session",
  "function": "before_cursor_execute",
  "trace_id": "abc123",
  "user_id": null,
  "request_path": "/api/auth/register",
  "request_method": "POST",
  "extra_data": {
    "db_operation": "INSERT",
    "connection_id": 123456789,
    "executemany": false
  }
}

// 执行后
{
  "timestamp": "2025-12-02T10:30:45.234567",
  "source": "backend",
  "level": "INFO",
  "message": "SQL INSERT completed: 1 rows affected",
  "module": "db.session",
  "function": "after_cursor_execute",
  "trace_id": "abc123",
  "user_id": null,
  "request_path": "/api/auth/register",
  "request_method": "POST",
  "extra_data": {
    "db_operation": "INSERT",
    "rows_affected": 1,
    "connection_id": 123456789
  }
}
```

---

## 🔧 二、修复计划

### 2.1 修复范围总览

| 模块 | 路由文件 | 服务文件 | 依赖文件 | 状态 |
|------|---------|---------|---------|------|
| **user** | `router.py` (10个端点) | `service.py` (移除日志) | `dependencies.py` (3个函数) | ✅ 已完成 |
| **member** | `router.py` (9个端点) | `service.py` (移除日志) | - | ✅ 已完成 |
| **performance** | `router.py` (12个端点) | `service.py` (移除日志) | - | ✅ 已完成 |
| **project** | `router.py` (11个端点) | `service.py` (移除日志) | - | ✅ 已完成 |
| **content** | `router.py` (19个端点) | `service.py` (移除日志) | - | ✅ 已完成 |
| **support** | `router.py` (9个端点) | `service.py` (移除日志) | - | ✅ 已完成 |
| **upload** | `router.py` (5个端点) | `service.py` (移除日志) | - | ✅ 已完成 |
| **dashboard** | `router.py` (1个端点) | `service.py` (移除日志) | - | ✅ 已完成 |

**总计**：80个路由端点需要添加/完善日志，8个服务文件需要移除日志，1个依赖文件需要添加日志

**✅ 阶段一已完成**：所有 80 个路由端点都已添加 @auto_log 和 @audit_log 装饰器

---

### 2.2 详细修复计划

#### 模块 1: user (认证模块)

##### 文件 1: `backend/src/modules/user/router.py`

**需要修复的端点**（10个）：

| 端点 | 方法 | 路径 | 需要添加的日志 | 优先级 |
|------|------|------|--------------|--------|
| `register` | POST | `/api/auth/register` | ✅ `@auto_log` + `@audit_log` | P0 |
| `login` | POST | `/api/auth/login` | ✅ `@auto_log` + `@audit_log` | P0 |
| `admin_login` | POST | `/api/auth/admin-login` | ✅ `@auto_log` + `@audit_log` | P0 |
| `password_reset_request` | POST | `/api/auth/password-reset-request` | ✅ `@auto_log` | P0 |
| `password_reset` | POST | `/api/auth/password-reset` | ✅ `@auto_log` | P0 |
| `get_current_user_info` | GET | `/api/auth/me` | ✅ `@auto_log` | P0 |
| `logout` | POST | `/api/auth/logout` | ✅ `@auto_log` + `@audit_log` | P0 |
| `refresh_token` | POST | `/api/auth/refresh` | ✅ `@auto_log` | P0 |
| `update_profile` | PUT | `/api/auth/profile` | ✅ `@auto_log` + `@audit_log` | P0 |
| `change_password` | POST | `/api/auth/change-password` | ✅ `@auto_log` + `@audit_log` | P0 |

**修复内容**：
- 所有端点添加 `@auto_log` 装饰器自动记录业务日志
- 关键操作（创建、更新、删除、审批等）添加 `@audit_log` 装饰器自动记录审计日志
- 确保所有异常都通过 `raise` 抛出，让全局异常处理器自动记录

##### 文件 2: `backend/src/modules/user/service.py`

**修复内容**：
- ❌ 移除所有 `logger.info()`, `logger.debug()`, `logger.error()` 等日志记录代码
- ✅ 保留所有业务逻辑

##### 文件 3: `backend/src/modules/user/dependencies.py`

**需要修复的函数**（3个）：

| 函数 | 需要添加的日志 | 优先级 |
|------|--------------|--------|
| `get_current_user()` | ✅ `@auto_log` | P0 |
| `get_current_active_user()` | ✅ `@auto_log` | P0 |
| `get_current_admin_user()` | ✅ `@auto_log` | P0 |

**修复内容**：
- 所有认证函数添加 `@auto_log` 装饰器自动记录认证成功/失败日志
- 登录操作添加 `@audit_log` 装饰器记录审计日志

---

#### 模块 2: member (会员管理模块)

##### 文件 1: `backend/src/modules/member/router.py`

**需要修复的端点**（9个）：

| 端点 | 方法 | 路径 | 需要添加的日志 | 优先级 |
|------|------|------|--------------|--------|
| `get_my_profile` | GET | `/api/member/profile` | ✅ `@auto_log` | P0 |
| `update_my_profile` | PUT | `/api/member/profile` | ✅ `@auto_log` + `@audit_log` | P0 |
| `list_members` | GET | `/api/admin/members` | ✅ `@auto_log(log_result_count=True)` | P0 |
| `get_member` | GET | `/api/admin/members/{member_id}` | ✅ `@auto_log` | P0 |
| `approve_member` | PUT | `/api/admin/members/{member_id}/approve` | ✅ `@auto_log` + `@audit_log` | P0 |
| `reject_member` | PUT | `/api/admin/members/{member_id}/reject` | ✅ `@auto_log` + `@audit_log` | P0 |
| `verify_company` | POST | `/api/admin/members/verify-company` | ✅ `@auto_log` + `@audit_log` | P0 |
| `search_nice_dnb` | GET | `/api/admin/members/search-nice-dnb` | ✅ `@auto_log` | P0 |
| `export_members` | GET | `/api/admin/members/export` | ✅ `@auto_log(log_result_count=True)` | P0 |

**修复内容**：
- 所有端点添加 `@auto_log` 装饰器自动记录业务日志
- 查询类端点使用 `log_result_count=True` 参数记录结果数量
- CRUD 操作使用 `log_resource_id=True` 参数记录资源ID
- 关键操作（创建、更新、删除、审批等）添加 `@audit_log` 装饰器

##### 文件 2: `backend/src/modules/member/service.py`

**修复内容**：
- ❌ 移除所有日志记录代码
- ✅ 保留所有业务逻辑

---

#### 模块 3: performance (绩效管理模块)

##### 文件 1: `backend/src/modules/performance/router.py`

**需要修复的端点**（12个）：

| 端点 | 方法 | 路径 | 需要添加的日志 | 优先级 |
|------|------|------|--------------|--------|
| `list_my_performance_records` | GET | `/api/member/performance` | ✅ `@auto_log(log_result_count=True)` | P0 |
| `get_performance_record` | GET | `/api/member/performance/{id}` | ✅ `@auto_log` | P0 |
| `create_performance_record` | POST | `/api/member/performance` | ✅ `@auto_log` + `@audit_log` | P0 |
| `update_performance_record` | PUT | `/api/member/performance/{id}` | ✅ `@auto_log` + `@audit_log` | P0 |
| `delete_performance_record` | DELETE | `/api/member/performance/{id}` | ✅ `@auto_log` + `@audit_log` | P0 |
| `submit_performance_record` | POST | `/api/member/performance/{id}/submit` | ✅ `@auto_log` + `@audit_log` | P0 |
| `list_all_performance_records` | GET | `/api/admin/performance` | ✅ `@auto_log(log_result_count=True)` | P0 |
| `get_performance_record_admin` | GET | `/api/admin/performance/{id}` | ✅ `@auto_log` | P0 |
| `approve_performance_record` | POST | `/api/admin/performance/{id}/approve` | ✅ `@auto_log` + `@audit_log` | P0 |
| `request_fix_performance_record` | POST | `/api/admin/performance/{id}/request-fix` | ✅ `@auto_log` + `@audit_log` | P0 |
| `reject_performance_record` | POST | `/api/admin/performance/{id}/reject` | ✅ `@auto_log` + `@audit_log` | P0 |
| `export_performance_data` | GET | `/api/admin/performance/export` | ✅ `@auto_log(log_result_count=True)` | P0 |

**修复内容**：
- 所有端点添加 `@auto_log` 装饰器自动记录业务日志
- 查询类端点使用 `log_result_count=True` 参数记录结果数量
- CRUD 操作使用 `log_resource_id=True` 参数记录资源ID
- 关键操作（创建、更新、删除、审批等）添加 `@audit_log` 装饰器

##### 文件 2: `backend/src/modules/performance/service.py`

**修复内容**：
- ❌ 移除所有日志记录代码
- ✅ 保留所有业务逻辑

---

#### 模块 4: project (项目管理模块)

##### 文件 1: `backend/src/modules/project/router.py`

**需要修复的端点**（11个）：

| 端点 | 方法 | 路径 | 需要添加的日志 | 优先级 |
|------|------|------|--------------|--------|
| `list_projects` | GET | `/api/projects` | ✅ `@auto_log(log_result_count=True)` | P0 |
| `get_project` | GET | `/api/projects/{id}` | ✅ `@auto_log` | P0 |
| `apply_to_project` | POST | `/api/projects/{id}/apply` | ✅ `@auto_log` + `@audit_log` | P0 |
| `get_my_applications` | GET | `/api/member/project-applications` | ✅ `@auto_log(log_result_count=True)` | P0 |
| `create_project` | POST | `/api/admin/projects` | ✅ `@auto_log` + `@audit_log` | P0 |
| `update_project` | PUT | `/api/admin/projects/{id}` | ✅ `@auto_log` + `@audit_log` | P0 |
| `delete_project` | DELETE | `/api/admin/projects/{id}` | ✅ `@auto_log` + `@audit_log` | P0 |
| `list_project_applications` | GET | `/api/admin/projects/{id}/applications` | ✅ `@auto_log(log_result_count=True)` | P0 |
| `update_application_status` | PUT | `/api/admin/project-applications/{id}` | ✅ `@auto_log` + `@audit_log` | P0 |
| `export_projects` | GET | `/api/admin/projects/export` | ✅ `@auto_log(log_result_count=True)` | P0 |
| `export_applications` | GET | `/api/admin/project-applications/export` | ✅ `@auto_log(log_result_count=True)` | P0 |

**修复内容**：
- 所有端点添加 `@auto_log` 装饰器自动记录业务日志
- 查询类端点使用 `log_result_count=True` 参数记录结果数量
- CRUD 操作使用 `log_resource_id=True` 参数记录资源ID
- 关键操作（创建、更新、删除、审批等）添加 `@audit_log` 装饰器

##### 文件 2: `backend/src/modules/project/service.py`

**修复内容**：
- ❌ 移除所有日志记录代码
- ✅ 保留所有业务逻辑

---

#### 模块 5: content (内容管理模块)

##### 文件 1: `backend/src/modules/content/router.py`

**需要修复的端点**（19个）：

| 端点 | 方法 | 路径 | 需要添加的日志 | 优先级 |
|------|------|------|--------------|--------|
| `list_notices` | GET | `/api/notices` | ✅ `@auto_log(log_result_count=True)` | P0 |
| `get_latest_notices` | GET | `/api/notices/latest` | ✅ `@auto_log` | P0 |
| `get_notice` | GET | `/api/notices/{id}` | ✅ `@auto_log` | P0 |
| `create_notice` | POST | `/api/admin/notices` | ✅ `@auto_log` + `@audit_log` | P0 |
| `update_notice` | PUT | `/api/admin/notices/{id}` | ✅ `@auto_log` + `@audit_log` | P0 |
| `delete_notice` | DELETE | `/api/admin/notices/{id}` | ✅ `@auto_log` + `@audit_log` | P0 |
| `list_press_releases` | GET | `/api/press-releases` | ✅ `@auto_log(log_result_count=True)` | P0 |
| `get_latest_press` | GET | `/api/press-releases/latest` | ✅ `@auto_log` | P0 |
| `get_press_release` | GET | `/api/press-releases/{id}` | ✅ `@auto_log` | P0 |
| `create_press_release` | POST | `/api/admin/press-releases` | ✅ `@auto_log` + `@audit_log` | P0 |
| `update_press_release` | PUT | `/api/admin/press-releases/{id}` | ✅ `@auto_log` + `@audit_log` | P0 |
| `delete_press_release` | DELETE | `/api/admin/press-releases/{id}` | ✅ `@auto_log` + `@audit_log` | P0 |
| `get_banners` | GET | `/api/banners` | ✅ `@auto_log` | P0 |
| `get_all_banners` | GET | `/api/admin/banners` | ✅ `@auto_log` | P0 |
| `create_banner` | POST | `/api/admin/banners` | ✅ `@auto_log` + `@audit_log` | P0 |
| `update_banner` | PUT | `/api/admin/banners/{id}` | ✅ `@auto_log` + `@audit_log` | P0 |
| `delete_banner` | DELETE | `/api/admin/banners/{id}` | ✅ `@auto_log` + `@audit_log` | P0 |
| `get_system_info` | GET | `/api/system-info` | ✅ `@auto_log` | P0 |
| `update_system_info` | PUT | `/api/admin/system-info` | ✅ `@auto_log` + `@audit_log` | P0 |

**修复内容**：
- 所有端点添加 `@auto_log` 装饰器自动记录业务日志
- 查询类端点使用 `log_result_count=True` 参数记录结果数量
- CRUD 操作使用 `log_resource_id=True` 参数记录资源ID
- 关键操作（创建、更新、删除）添加 `@audit_log` 装饰器

##### 文件 2: `backend/src/modules/content/service.py`

**修复内容**：
- ❌ 移除所有日志记录代码
- ✅ 保留所有业务逻辑

---

#### 模块 6: support (支持模块)

##### 文件 1: `backend/src/modules/support/router.py`

**需要修复的端点**（9个）：

| 端点 | 方法 | 路径 | 需要添加的日志 | 优先级 |
|------|------|------|--------------|--------|
| `list_faqs` | GET | `/api/faqs` | ✅ `@auto_log(log_result_count=True)` | P0 |
| `create_faq` | POST | `/api/admin/faqs` | ✅ `@auto_log` + `@audit_log` | P0 |
| `update_faq` | PUT | `/api/admin/faqs/{id}` | ✅ `@auto_log` + `@audit_log` | P0 |
| `delete_faq` | DELETE | `/api/admin/faqs/{id}` | ✅ `@auto_log` + `@audit_log` | P0 |
| `create_inquiry` | POST | `/api/member/inquiries` | ✅ `@auto_log` + `@audit_log` | P0 |
| `list_my_inquiries` | GET | `/api/member/inquiries` | ✅ `@auto_log(log_result_count=True)` | P0 |
| `get_inquiry` | GET | `/api/member/inquiries/{id}` | ✅ `@auto_log` | P0 |
| `list_all_inquiries` | GET | `/api/admin/inquiries` | ✅ `@auto_log(log_result_count=True)` | P0 |
| `reply_to_inquiry` | POST | `/api/admin/inquiries/{id}/reply` | ✅ `@auto_log` + `@audit_log` | P0 |

**修复内容**：
- 所有端点添加 `@auto_log` 装饰器自动记录业务日志
- 查询类端点使用 `log_result_count=True` 参数记录结果数量
- CRUD 操作使用 `log_resource_id=True` 参数记录资源ID
- 关键操作（创建、更新、删除、审批等）添加 `@audit_log` 装饰器

##### 文件 2: `backend/src/modules/support/service.py`

**修复内容**：
- ❌ 移除所有日志记录代码
- ✅ 保留所有业务逻辑

---

#### 模块 7: upload (文件上传模块)

##### 文件 1: `backend/src/modules/upload/router.py`

**需要修复的端点**（5个）：

| 端点 | 方法 | 路径 | 需要添加的日志 | 优先级 |
|------|------|------|--------------|--------|
| `upload_public_file` | POST | `/api/upload/public` | ✅ `@auto_log` + `@audit_log` | P0 |
| `upload_private_file` | POST | `/api/upload/private` | ✅ `@auto_log` + `@audit_log` | P0 |
| `download_file` | GET | `/api/upload/files/{file_id}` | ✅ `@auto_log` | P0 |
| `redirect_to_file` | GET | `/api/upload/files/{file_id}/redirect` | ✅ `@auto_log` | P0 |
| `delete_file` | DELETE | `/api/upload/files/{file_id}` | ✅ `@auto_log` + `@audit_log` | P0 |

**修复内容**：
- 所有端点添加 `@auto_log` 装饰器自动记录业务日志
- 文件上传操作使用 `log_resource_id=True` 参数记录文件ID
- 关键操作（上传、删除）添加 `@audit_log` 装饰器

##### 文件 2: `backend/src/modules/upload/service.py`

**修复内容**：
- ❌ 移除所有日志记录代码
- ✅ 保留所有业务逻辑

---

#### 模块 8: dashboard (仪表盘模块)

##### 文件 1: `backend/src/modules/dashboard/router.py`

**需要修复的端点**（1个）：

| 端点 | 方法 | 路径 | 需要添加的日志 | 优先级 |
|------|------|------|--------------|--------|
| `get_dashboard_stats` | GET | `/api/admin/dashboard/stats` | ✅ `@auto_log` | P0 |

**修复内容**：
- 添加 `@auto_log` 装饰器自动记录业务日志

##### 文件 2: `backend/src/modules/dashboard/service.py`

**修复内容**：
- ❌ 移除所有日志记录代码
- ✅ 保留所有业务逻辑

---

### 2.3 日志记录方式

#### 使用装饰器自动记录日志

所有路由端点统一使用装饰器方式记录日志，无需手动调用日志服务。

**业务日志装饰器 `@auto_log`**

使用 `@auto_log` 装饰器可以自动记录业务日志，无需手动调用 `logging_service.create_log()`。

**优点**：
- ✅ 代码更简洁，减少重复代码
- ✅ 自动提取资源ID和结果数量
- ✅ 自动处理成功和失败情况
- ✅ 自动关联请求上下文（trace_id, user_id等）

**使用示例**：

```python
from ...common.modules.logger import auto_log

@router.post("/api/members", response_model=MemberResponse, status_code=status.HTTP_201_CREATED)
@auto_log("create_member", log_resource_id=True)
async def create_member(
    data: MemberCreate,
    request: Request,
    current_user: Member = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Create member."""
    member = await service.create_member(data, db)
    return MemberResponse.model_validate(member)
    # 装饰器会自动记录成功日志，包含 member.id
```

**装饰器参数**：
- `operation_name`: 操作名称（必需）
- `success_message`: 自定义成功消息（可选）
- `error_message`: 自定义错误消息（可选）
- `log_resource_id`: 是否提取并记录资源ID（默认：True）
- `log_result_count`: 是否提取并记录结果数量（默认：False，适用于列表查询）
- `log_level`: 成功日志级别（默认："INFO"）

**列表查询示例**：

```python
@router.get("/api/members")
@auto_log("list_members", log_result_count=True)
async def list_members(
    query: MemberListQuery = Depends(),
    request: Request,
    current_user: Member = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """List members."""
    members, total = await service.list_members(query, db)
    return MemberListResponse(items=members, total=total)
    # 装饰器会自动记录成功日志，包含 total 数量
```

**自定义消息示例**：

```python
@router.put("/api/members/{member_id}/approve")
@auto_log(
    operation_name="approve_member",
    success_message="Member approved successfully",
    error_message="Failed to approve member",
    log_resource_id=True
)
async def approve_member(
    member_id: UUID,
    request: Request,
    current_user: Member = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Approve member."""
    member = await service.approve_member(member_id, db)
    return MemberResponse.model_validate(member)
```

**注意事项**：
- 装饰器会自动捕获异常并记录错误日志
- 异常会重新抛出，由全局异常处理器处理
- 如果函数返回 `Response` 对象，会自动提取状态码
- 支持从 Pydantic 模型、字典、列表等多种结果类型中提取信息

#### 审计日志装饰器

审计日志也有装饰器 `@audit_log`，可以自动记录关键操作到审计日志。

**使用示例**：

```python
from ...common.modules.audit import audit_log
from ...common.modules.logger import auto_log

@router.post("/api/members", response_model=MemberResponse, status_code=status.HTTP_201_CREATED)
@auto_log("create_member", log_resource_id=True)  # 业务日志
@audit_log(action="create", resource_type="member")  # 审计日志
async def create_member(
    data: MemberCreate,
    request: Request,
    current_user: Member = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Create member."""
    member = await service.create_member(data, db)
    return MemberResponse.model_validate(member)
    # 自动记录：业务日志 + 审计日志
```

**装饰器参数**：
- `action`: 操作类型（必需，如 'create', 'update', 'delete', 'approve', 'login'）
- `resource_type`: 资源类型（可选，如 'member', 'performance', 'project'）
- `get_resource_id`: 提取资源ID的函数（可选，默认从返回值提取）

**自定义资源ID提取**：

```python
@router.put("/api/members/{member_id}/approve")
@audit_log(
    action="approve",
    resource_type="member",
    get_resource_id=lambda result: result.id if result else None
)
async def approve_member(member_id: UUID, ...):
    member = await service.approve_member(member_id, db)
    return MemberResponse.model_validate(member)
```

**组合使用**（业务日志 + 审计日志）：

```python
@router.post("/api/members", response_model=MemberResponse, status_code=status.HTTP_201_CREATED)
@auto_log("create_member", log_resource_id=True)  # 业务日志：记录到 app_logs.log
@audit_log(action="create", resource_type="member")  # 审计日志：记录到数据库 audit_logs 表
async def create_member(
    data: MemberCreate,
    request: Request,
    current_user: Member = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Create member."""
    member = await service.create_member(data, db)
    return MemberResponse.model_validate(member)
    # 自动记录：
    # 1. 业务日志（app_logs.log）- 包含操作详情
    # 2. 审计日志（数据库 audit_logs 表）- 合规性追踪
```

**装饰器执行顺序**：
- 装饰器从下往上执行
- `@audit_log` 应该放在 `@auto_log` 下面（更靠近函数）
- 这样 `@audit_log` 先执行，`@auto_log` 后执行

#### 标准模板：使用装饰器记录日志

所有端点统一使用装饰器方式记录日志，无需手动调用日志服务。

**模板 1: 查询类端点（GET）**

```python
from ...common.modules.logger import auto_log

@router.get("/api/endpoint")
@auto_log("list_items", log_result_count=True)
async def list_items(
    query: QueryParams = Depends(),
    request: Request,
    current_user: Member = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """List items."""
    items, total = await service.list_items(query, db)
    return ItemListResponse(items=items, total=total)
    # 装饰器自动记录：成功日志包含 total 数量，失败日志包含错误信息
```

**模板 2: 创建类端点（POST）**

```python
from ...common.modules.logger import auto_log
from ...common.modules.audit import audit_log

@router.post("/api/endpoint", response_model=ItemResponse, status_code=status.HTTP_201_CREATED)
@auto_log("create_item", log_resource_id=True)  # 业务日志
@audit_log(action="create", resource_type="item")  # 审计日志
async def create_item(
    data: ItemCreate,
    request: Request,
    current_user: Member = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Create item."""
    item = await service.create_item(data, db)
    return ItemResponse.model_validate(item)
    # 装饰器自动记录：业务日志（包含 item.id）+ 审计日志
```

**模板 3: 更新类端点（PUT/PATCH）**

```python
from ...common.modules.logger import auto_log
from ...common.modules.audit import audit_log

@router.put("/api/endpoint/{item_id}", response_model=ItemResponse)
@auto_log("update_item", log_resource_id=True)  # 业务日志
@audit_log(action="update", resource_type="item")  # 审计日志
async def update_item(
    item_id: UUID,
    data: ItemUpdate,
    request: Request,
    current_user: Member = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Update item."""
    item = await service.update_item(item_id, data, db)
    return ItemResponse.model_validate(item)
    # 装饰器自动记录：业务日志（包含 item.id）+ 审计日志
```

**模板 4: 删除类端点（DELETE）**

```python
from ...common.modules.logger import auto_log
from ...common.modules.audit import audit_log

@router.delete("/api/endpoint/{item_id}", response_model=dict)
@auto_log("delete_item", log_resource_id=True)  # 业务日志
@audit_log(action="delete", resource_type="item")  # 审计日志
async def delete_item(
    item_id: UUID,
    request: Request,
    current_user: Member = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete item."""
    await service.delete_item(item_id, db)
    return {"message": "Item deleted successfully"}
    # 装饰器自动记录：业务日志（包含 item_id）+ 审计日志
```

**模板 5: 审批类端点（PUT/POST）**

```python
from ...common.modules.logger import auto_log
from ...common.modules.audit import audit_log

@router.put("/api/members/{member_id}/approve")
@auto_log(
    "approve_member",
    success_message="Member approved successfully",
    log_resource_id=True
)  # 业务日志
@audit_log(action="approve", resource_type="member")  # 审计日志
async def approve_member(
    member_id: UUID,
    request: Request,
    current_user: Member = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Approve member."""
    member = await service.approve_member(member_id, db)
    return MemberResponse.model_validate(member)
    # 装饰器自动记录：业务日志（自定义消息）+ 审计日志
```

---

## 🛠️ 三、辅助工具设计

### 3.1 脚本 1: 日志调用链完整性检查脚本

**文件路径**: `backend/scripts/check_log_chain_completeness.py`

**功能描述**:
- 分析日志文件，检查每个 HTTP 请求的日志调用链是否完整
- 生成详细的 MD 报告，列出所有不完整的调用链
- 支持按模块、按端点、按 trace_id 进行分析

**输入**:
- 日志文件路径（`backend/logs/app_logs.log`）
- 可选：时间范围、trace_id 列表

**输出**:
- MD 格式报告文件（`backend/logs/log_chain_completeness_report.md`）

**报告内容**:
1. **执行摘要**
   - 总请求数
   - 完整调用链数量
   - 不完整调用链数量
   - 完整率百分比

2. **按模块统计**
   - 每个模块的请求数、完整数、不完整数
   - 完整率

3. **不完整的调用链详情**
   - 按模块分组
   - 每个不完整的调用链包含：
     - trace_id
     - 请求路径和方法
     - 时间戳
     - 缺少的日志类型（HTTP中间件日志、业务日志、SQL日志等）
     - 已有的日志类型

4. **缺失日志类型统计**
   - 缺少 HTTP 中间件日志的请求数
   - 缺少业务日志的请求数
   - 缺少 SQL 日志的请求数（如果有数据库操作）

5. **建议修复清单**
   - 列出所有需要修复的端点和文件
   - 按优先级排序

**实现思路**:
1. 读取日志文件，解析 JSON 格式的日志
2. 按 `trace_id` 分组，构建每个请求的日志调用链
3. 检查每个调用链是否包含：
   - HTTP 中间件日志（`module="src.main"`, `function="log_http_requests"`）
   - 业务日志（路由层的 `logging_service.create_log()`）
   - SQL 日志（如果有数据库操作，应该有 SQL 执行日志）
     - SELECT 操作：应该有 `before_cursor_execute` 日志（DEBUG 级别）
     - INSERT/UPDATE/DELETE 操作：应该有 `before_cursor_execute`（DEBUG）和 `after_cursor_execute`（INFO）日志
4. 生成报告

**SQL 日志识别**:
- `module="db.session"` 且 `function="before_cursor_execute"` → SQL 执行前日志
- `module="db.session"` 且 `function="after_cursor_execute"` → SQL 执行后日志（仅 INSERT/UPDATE/DELETE）
- `extra_data.db_operation` 字段包含操作类型（SELECT, INSERT, UPDATE, DELETE 等）

---

### 3.2 脚本 2: 端到端自动化测试脚本

**文件路径**: `backend/scripts/e2e_test_all_modules.py`

**功能描述**:
- 自动化测试所有模块的所有功能
- 模拟真实的用户操作流程（登录、浏览、操作、登出）
- 记录所有请求的 trace_id，用于后续日志分析
- 分模块组织代码，但放在一个脚本中，结构清晰

**测试范围**:

#### 模块 1: 认证模块 (user)
- 会员注册
- 会员登录
- 管理员登录
- 获取当前用户信息
- 刷新 token
- 修改个人资料
- 修改密码
- 密码重置请求
- 密码重置
- 登出

#### 模块 2: 会员管理模块 (member)
- 获取我的个人资料
- 更新我的个人资料
- 管理员：获取会员列表
- 管理员：获取会员详情
- 管理员：批准会员
- 管理员：拒绝会员
- 管理员：验证公司信息
- 管理员：搜索 NICE D&B 公司
- 管理员：导出会员数据

#### 模块 3: 绩效管理模块 (performance)
- 会员：获取我的绩效列表
- 会员：获取绩效详情
- 会员：创建绩效记录
- 会员：更新绩效记录
- 会员：删除绩效记录
- 会员：提交绩效记录
- 管理员：获取所有绩效列表
- 管理员：获取绩效详情
- 管理员：批准绩效
- 管理员：请求补正
- 管理员：拒绝绩效
- 管理员：导出绩效数据

#### 模块 4: 项目管理模块 (project)
- 公共：获取项目列表
- 公共：获取项目详情
- 会员：申请项目
- 会员：获取我的申请列表
- 管理员：创建项目
- 管理员：更新项目
- 管理员：删除项目
- 管理员：获取项目申请列表
- 管理员：更新申请状态
- 管理员：导出项目数据
- 管理员：导出申请数据

#### 模块 5: 内容管理模块 (content)
- 公共：获取公告列表
- 公共：获取最新公告
- 公共：获取公告详情
- 公共：获取新闻列表
- 公共：获取最新新闻
- 公共：获取新闻详情
- 公共：获取横幅列表
- 公共：获取系统信息
- 管理员：创建公告
- 管理员：更新公告
- 管理员：删除公告
- 管理员：创建新闻
- 管理员：更新新闻
- 管理员：删除新闻
- 管理员：获取所有横幅
- 管理员：创建横幅
- 管理员：更新横幅
- 管理员：删除横幅
- 管理员：更新系统信息

#### 模块 6: 支持模块 (support)
- 公共：获取 FAQ 列表
- 会员：创建咨询
- 会员：获取我的咨询列表
- 会员：获取咨询详情
- 管理员：创建 FAQ
- 管理员：更新 FAQ
- 管理员：删除 FAQ
- 管理员：获取所有咨询列表
- 管理员：回复咨询

#### 模块 7: 文件上传模块 (upload)
- 上传公共文件
- 上传私有文件
- 下载文件
- 重定向到文件
- 删除文件

#### 模块 8: 仪表盘模块 (dashboard)
- 管理员：获取仪表盘统计

**实现结构**:

```python
# 脚本结构示例（伪代码）

class E2ETestAllModules:
    def __init__(self):
        self.base_url = "http://localhost:8000"
        self.trace_ids = []  # 记录所有请求的 trace_id
        self.test_results = {}  # 记录测试结果
        
    # 工具方法
    def make_request(self, method, path, ...):
        """发送请求，记录 trace_id"""
        pass
    
    # 模块 1: 认证模块测试
    class AuthModuleTests:
        def test_register(self): pass
        def test_login(self): pass
        def test_admin_login(self): pass
        # ... 其他测试方法
    
    # 模块 2: 会员管理模块测试
    class MemberModuleTests:
        def test_get_my_profile(self): pass
        def test_update_my_profile(self): pass
        # ... 其他测试方法
    
    # ... 其他模块测试类
    
    # 主测试流程
    def run_all_tests(self):
        """按模块顺序执行所有测试"""
        # 1. 认证模块
        # 2. 会员管理模块
        # 3. 绩效管理模块
        # ... 依次执行
        
    def generate_report(self):
        """生成测试报告，包含所有 trace_id"""
        pass

if __name__ == "__main__":
    tester = E2ETestAllModules()
    tester.run_all_tests()
    tester.generate_report()
```

**输出**:
1. 控制台输出：测试进度和结果
2. JSON 报告文件：包含所有请求的 trace_id、响应状态、测试结果
3. 测试数据清理：自动清理测试过程中创建的数据

**注意事项**:
- 需要先创建测试用户（会员和管理员）
- 测试数据应该可以自动清理
- 支持跳过某些测试（如果环境不支持）
- 记录所有请求的 trace_id，便于后续日志分析

---

## 📊 四、实施计划

### 阶段一：路由层日志补全（优先级 P0）

| 模块 | 文件 | 端点数量 | 预计时间 | 负责人 |
|------|------|---------|---------|--------|
| user | `router.py` | 10 | 2小时 | - |
| user | `dependencies.py` | 3 | 1小时 | - |
| member | `router.py` | 9 | 2小时 | - |
| performance | `router.py` | 12 | 3小时 | - |
| project | `router.py` | 11 | 3小时 | - |
| content | `router.py` | 19 | 4小时 | - |
| support | `router.py` | 9 | 2小时 | - |
| upload | `router.py` | 5 | 1小时 | - |
| dashboard | `router.py` | 1 | 0.5小时 | - |

**小计**: 80个端点，预计 18.5 小时

### 阶段二：服务层日志清理（优先级 P0）

| 模块 | 文件 | 预计时间 | 负责人 |
|------|------|---------|--------|
| user | `service.py` | 0.5小时 | - |
| member | `service.py` | 0.5小时 | - |
| performance | `service.py` | 0.5小时 | - |
| project | `service.py` | 0.5小时 | - |
| content | `service.py` | 0.5小时 | - |
| support | `service.py` | 0.5小时 | - |
| upload | `service.py` | 0.5小时 | - |
| dashboard | `service.py` | 0.5小时 | - |

**小计**: 8个文件，预计 4 小时

### 阶段三：创建辅助工具（优先级 P1）

| 任务 | 文件 | 预计时间 | 负责人 |
|------|------|---------|--------|
| 日志调用链完整性检查脚本 | `check_log_chain_completeness.py` | 4小时 | - |
| 端到端自动化测试脚本 | `e2e_test_all_modules.py` | 8小时 | - |

**小计**: 2个脚本，预计 12 小时

### 阶段四：验证和测试（优先级 P0）

| 任务 | 说明 | 预计时间 | 负责人 |
|------|------|---------|--------|
| 运行端到端测试 | 执行所有模块的自动化测试 | 1小时 | - |
| 运行日志完整性检查 | 生成调用链完整性报告 | 0.5小时 | - |
| 修复发现的问题 | 根据报告修复不完整的调用链 | 2小时 | - |
| 最终验证 | 再次运行测试和检查 | 0.5小时 | - |

**小计**: 预计 4 小时

### 总时间估算

- **阶段一**：18.5 小时
- **阶段二**：4 小时
- **阶段三**：12 小时
- **阶段四**：4 小时

**总计**: 38.5 小时（约 5 个工作日）

---

## 📈 五、进度追踪

| 日期 | 完成内容 | 剩余工作 |
|------|---------|---------|
| 2025-12-02 | 创建补全计划 v2.0 | 所有阶段待完成 |
| 2025-12-02 | ✅ 阶段一：user 模块完成<br/>- router.py (10个端点) 已添加 @auto_log 和 @audit_log 装饰器<br/>- dependencies.py (3个函数) 已添加 @auto_log 装饰器<br/>- 移除所有手动日志调用 | 阶段一：剩余 6 个模块<br/>阶段二：服务层日志清理<br/>阶段三：辅助工具脚本 |
| 2025-12-02 | ✅ 阶段一：member 模块完成<br/>- router.py (9个端点) 已添加 @auto_log 和 @audit_log 装饰器<br/>- 移除所有手动日志调用 | 阶段一：剩余 5 个模块<br/>阶段二：服务层日志清理<br/>阶段三：辅助工具脚本 |
| 2025-12-02 | ✅ 阶段二：服务层日志清理完成<br/>- 检查所有服务文件，确认没有日志记录代码<br/>- 所有服务文件（user, member, performance, project, content, support, upload, dashboard）都已确认无日志记录代码 | 阶段一：剩余 5 个模块<br/>阶段三：辅助工具脚本 |
| 2025-12-02 | ✅ 阶段三：辅助工具脚本完成<br/>- 创建日志调用链完整性检查脚本 (check_log_chain_completeness.py)<br/>- 创建端到端自动化测试脚本 (e2e_test_all_modules.py) | 阶段一：剩余 5 个模块<br/>阶段四：验证和测试 |
| 2025-12-02 | ✅ 阶段一：路由层日志补全完成<br/>- 所有 8 个模块的路由文件都已添加 @auto_log 和 @audit_log 装饰器<br/>- user (10个端点) ✅<br/>- member (9个端点) ✅<br/>- performance (12个端点) ✅<br/>- project (11个端点) ✅<br/>- content (19个端点) ✅<br/>- support (9个端点) ✅<br/>- upload (5个端点) ✅<br/>- dashboard (1个端点) ✅<br/>- 总计：80个端点全部完成 | 阶段四：验证和测试 |

---

## 🔗 六、相关文档

- [下一步计划](./NEXT_STEPS.md)
- [项目架构](./ARCHITECTURE.md)

---

**文档维护**: 每次修复后更新进度追踪表  
**最后更新**: 2025-12-02

---

## 📝 八、辅助工具脚本说明

### ✅ 已创建的辅助工具脚本

#### 1. 日志调用链完整性检查脚本

**文件路径**: `backend/scripts/check_log_chain_completeness.py`

**功能**:
- 分析日志文件，检查每个 HTTP 请求的日志调用链是否完整
- 生成详细的 MD 报告，列出所有不完整的调用链
- 支持按模块、按端点、按 trace_id 进行分析
- 支持时间范围过滤和 trace_id 列表过滤

**使用方法**:
```bash
# 分析最近 1000 条日志
python backend/scripts/check_log_chain_completeness.py --limit 1000

# 分析指定时间范围的日志
python backend/scripts/check_log_chain_completeness.py \
  --start-time "2025-12-01T00:00:00" \
  --end-time "2025-12-02T23:59:59"

# 分析指定的 trace_id 列表
python backend/scripts/check_log_chain_completeness.py \
  --trace-ids "abc123,def456"

# 指定输出文件
python backend/scripts/check_log_chain_completeness.py \
  --output backend/logs/my_report.md
```

**报告内容**:
1. 执行摘要（总请求数、完整率等）
2. 按模块统计
3. 缺失日志类型统计
4. 不完整的调用链详情（按模块分组）
5. 建议修复清单

#### 2. 端到端自动化测试脚本

**文件路径**: `backend/scripts/e2e_test_all_modules.py`

**功能**:
- 自动化测试所有模块的所有功能
- 模拟真实的用户操作流程（登录、浏览、操作、登出）
- 记录所有请求的 trace_id，用于后续日志分析
- 分模块组织代码，结构清晰

**测试范围**:
- 模块 1: 认证模块（10个端点）
- 模块 2: 会员管理模块（9个端点）
- 模块 3: 绩效管理模块（12个端点）
- 模块 4: 项目管理模块（11个端点）
- 模块 5: 内容管理模块（19个端点）
- 模块 6: 支持模块（9个端点）
- 模块 7: 文件上传模块（5个端点）
- 模块 8: 仪表盘模块（1个端点）

**使用方法**:
```bash
# 使用默认配置运行所有测试
python backend/scripts/e2e_test_all_modules.py

# 指定基础 URL
python backend/scripts/e2e_test_all_modules.py \
  --base-url http://localhost:8000

# 指定测试用户
python backend/scripts/e2e_test_all_modules.py \
  --admin-username admin \
  --admin-password pass123 \
  --member-username member \
  --member-password pass123

# 指定输出文件
python backend/scripts/e2e_test_all_modules.py \
  --output backend/logs/my_test_report.json

# 安静模式（不显示详细日志）
python backend/scripts/e2e_test_all_modules.py --quiet
```

**输出**:
- JSON 格式测试报告（包含所有 trace_id、测试结果、统计信息）
- 控制台输出测试进度和摘要

**注意事项**:
- 需要先创建测试用户（会员和管理员）
- 测试数据会自动创建，但不会自动清理（需要手动清理）
- 支持跳过某些测试（如果环境不支持）

---

## 📝 七、已完成工作详情

### ✅ 已完成模块

#### 1. user 模块（认证模块）
- **router.py**: 10个端点全部完成
  - `register` - ✅ @auto_log + @audit_log
  - `login` - ✅ @auto_log + @audit_log
  - `admin_login` - ✅ @auto_log + @audit_log
  - `password_reset_request` - ✅ @auto_log
  - `password_reset` - ✅ @auto_log
  - `get_current_user_info` - ✅ @auto_log
  - `logout` - ✅ @auto_log + @audit_log
  - `refresh_token` - ✅ @auto_log
  - `update_profile` - ✅ @auto_log + @audit_log
  - `change_password` - ✅ @auto_log + @audit_log
- **dependencies.py**: 3个函数全部完成
  - `get_current_user` - ✅ @auto_log
  - `get_current_active_user` - ✅ @auto_log
  - `get_current_admin_user` - ✅ @auto_log
- **service.py**: 无需修改（无日志记录代码）

#### 2. member 模块（会员管理模块）
- **router.py**: 9个端点全部完成
  - `get_my_profile` - ✅ @auto_log
  - `update_my_profile` - ✅ @auto_log + @audit_log
  - `list_members` - ✅ @auto_log(log_result_count=True)
  - `get_member` - ✅ @auto_log
  - `approve_member` - ✅ @auto_log + @audit_log
  - `reject_member` - ✅ @auto_log + @audit_log
  - `verify_company` - ✅ @auto_log + @audit_log
  - `search_nice_dnb` - ✅ @auto_log
  - `export_members` - ✅ @auto_log(log_result_count=True) + @audit_log
- **service.py**: 待检查（阶段二处理）

### 🔄 改造说明

所有已完成的模块都遵循以下改造原则：

1. **移除手动日志调用**
   - 移除所有 `logging_service.create_log()` 调用
   - 移除所有 `audit_log_service.create_audit_log()` 调用
   - 移除所有 `get_trace_id()` 手动调用
   - 移除所有 `get_client_info()` 手动调用

2. **添加装饰器**
   - 业务日志：使用 `@auto_log` 装饰器
   - 审计日志：使用 `@audit_log` 装饰器
   - 装饰器顺序：`@auto_log` 在上，`@audit_log` 在下（靠近函数）

3. **简化代码**
   - 移除 try-except 中的手动日志记录
   - 让装饰器自动处理异常日志
   - 保持业务逻辑简洁

4. **保持功能不变**
   - 所有业务逻辑保持不变
   - 异常处理机制保持不变
   - API 接口保持不变
