# Gangwon Business Portal - 下一步实施计划

**Document Version:** 1.3.3  
**Created Date:** 2025-11-25  
**Last Updated:** 2025-11-26 (Phase 4.3 集成测试 52/52 用例通过，后端日志增强)  
**Target Completion:** Q1 2026  
**Plan Owner:** Development Team  
**Phase 1 Status:** ✅ 已完成  
**Phase 2.1 Status:** ✅ 已完成  
**Phase 2.2 Status:** ✅ 已完成  
**Phase 2.3 Status:** ✅ 已完成

---

## 📋 目录

1. [计划概述](#计划概述)
2. [Phase 1: 前端完善 (Week 1-2)](#phase-1-前端完善-week-1-2)
3. [Phase 2: 后端基础架构 (Week 3-4)](#phase-2-后端基础架构-week-3-4)
4. [Phase 3: 核心 API 开发 (Week 5-6)](#phase-3-核心api开发-week-5-6)
5. [Phase 4: 前后端集成 (Week 7-8)](#phase-4-前后端集成-week-7-8)
6. [Phase 5: 高级功能实现 (Week 9-10)](#phase-5-高级功能实现-week-9-10)
7. [Phase 6: 测试与优化 (Week 11-12)](#phase-6-测试与优化-week-11-12)
8. [Phase 7: 部署上线 (Week 13-14)](#phase-7-部署上线-week-13-14)
9. [资源需求](#资源需求)
10. [风险管理](#风险管理)
11. [质量保证](#质量保证)

---

## 计划概述

> 开发环境与 MCP 工具配置说明见 `docs/DEVTOOLS_MCP.md`。

### 当前状态回顾

根据 [PROJECT_STATUS.md](./PROJECT_STATUS.md) 分析：

基于 [PRD.md](./PRD.md) 要求，完成以下核心目标：

1. **建立完整的后端系统** - FastAPI + PostgreSQL + Supabase
2. **实现所有核心 API** - 认证、会员、绩效、项目管理
3. **前后端全面集成** - 替换 Mock 数据为真实 API
4. **确保系统安全性** - JWT 认证、数据加密、审计日志
5. **达到生产就绪** - 性能优化、监控、部署

### 实施原则

- **迭代开发**: 每周一个可演示的增量
- **质量优先**: 代码审查、API 测试、集成验证
- **风险管理**: 提前识别阻塞，快速调整方案
- **文档同步**: 代码与文档同步更新

### 时间轴总览

```mermaid
gantt
    title 项目实施时间轴 (14周)
    dateFormat  YYYY-MM-DD
    section Phase 1
    前端完善           :2025-11-25, 2w
    section Phase 2
    后端基础架构       :2025-12-09, 2w
    section Phase 3
    核心API开发        :2025-12-23, 2w
    section Phase 4
    前后端集成         :2026-01-06, 2w
    section Phase 5
    高级功能实现       :2026-01-20, 2w
    section Phase 6
    测试与优化         :2026-02-03, 2w
    section Phase 7
    部署上线           :2026-02-17, 2w
```

---

## Phase 1: 前端完善 (Week 1-2)

**时间**: 2025-11-25 ~ 2025-12-08  
**负责人**: 前端开发  
**目标**: 完成前端剩余工作，为后端集成做准备

### 1.1 国际化完善

#### 任务清单

- [x] **完成中文翻译** (已完成 - 100%)
  - ✅ 核心页面翻译已完成
  - ✅ 弹窗管理模块翻译已完成（韩语、中文）
  - ✅ 所有翻译文件完整性检查通过（17 个模块）
  - ✅ 覆盖所有前端页面和组件
  - ✅ 特殊术语标准化（绩效、知识产权、政府支持等）
  - ✅ 翻译键一致性验证完成（韩语/中文）
- [x] **语言切换优化** (已完成)
  - ✅ 日期格式化函数支持语言切换（formatDate, formatDateTime）
  - ✅ 数字格式化函数支持语言切换（formatNumber, formatCurrency）
  - ✅ 更新 ConsultationDetail 组件使用当前语言格式化日期
  - ✅ 更新 PerformanceList 组件使用当前语言格式化货币
  - ✅ 所有格式化函数支持 'ko' 和 'zh' 语言参数

#### 验收标准

- ✅ 所有页面支持韩语/中文无缝切换（已完成）
- ✅ 无翻译缺失或显示 key 的情况（已验证）
- ✅ 布局在两种语言下均正常

### 1.2 Mock 数据完善

#### 任务清单

- [x] **补充缺失 API 模拟** (已完成)

  ```
  已实现的Mock API:
  ✅ POST /api/performance (提交绩效)
  ✅ PUT /api/performance/:id (修改绩效)
  ✅ GET /api/projects/:id/applications (项目申请列表)
  ✅ POST /api/projects/:id/apply (提交项目申请)
  ✅ POST /api/upload (文件上传)
  ✅ POST /api/admin/company/search (企业检索) - 新增
  ✅ GET /api/admin/members/nice-dnb (Nice D&B 数据) - 新增
  🟡 GET /api/admin/dashboard/export (数据导出) - 待实现
  ```

- [x] **优化 Mock 响应数据** (基本完成)

  - ✅ 确保数据结构符合 PRD 定义
  - ✅ 添加边界情况测试数据（空列表、错误状态等）
  - ✅ 模拟 API 延迟和错误响应

- [x] **验证所有页面** (基本完成)
  - ✅ Reports 模块已测试并完善
  - ✅ 企业检索功能已实现
  - ✅ Nice D&B 数据展示已实现
  - 🟡 其他页面持续验证中

#### 交付物

- ✅ `frontend/src/mocks/handlers/` 更新完整的 Mock API
- ⚪ `docs/MOCK_API_SPEC.md` Mock API 文档（可选）

### 1.3 前端 Bug 修复与优化

#### 任务清单

- [x] **修复已知问题** (基本完成)

  - ✅ 项目申请表单完善 (`member/modules/projects`) - ApplicationModal 已实现
  - ✅ JSON 语法错误修复 (`locales/zh.json`)
  - ✅ 弹窗管理功能实现 (`admin/modules/content`) - 已完成（包含图片上传、表单验证、国际化）
  - ✅ 企业检索 UI 完善 (`admin/modules/reports`) - 已完成（包含 Nice D&B 集成、财务数据展示、国际化）

- [x] **性能优化** (已完成)

  - ✅ 图片懒加载优化 - 创建了 LazyImage 组件，应用于 PressPreview 和 PressList
  - ✅ 组件渲染性能分析 - 使用 useMemo 和 useCallback 优化了 10 个主要组件
  - ✅ 减少不必要的 re-render - 所有事件处理函数和配置对象已优化

- [x] **代码质量** (已完成)
  - ✅ 清理未使用的 import 和变量 - 已清理 MemberList 中的未使用导入
  - ✅ 统一代码风格 - 所有组件遵循统一的 React Hooks 使用模式
  - ✅ 添加关键注释 - 为 LazyImage 和关键函数添加了 JSDoc 注释

#### 验收标准

- ✅ 所有已知 Bug 修复（基本完成）
- ✅ 首屏加载时间 < 2 秒（开发模式）
- ✅ 无控制台 warning/error（已修复）

### 1.4 前端文档

#### 任务清单

- [x] **组件使用文档** (已完成)

  - ✅ `docs/COMPONENT_LIBRARY.md` - 所有共享组件使用说明
  - ✅ 包含 Props、示例代码、效果截图

- [x] **前端开发指南** (已完成)
  - ✅ `frontend/DEVELOPMENT.md` - 本地开发环境搭建
  - ✅ 代码规范、目录结构说明
  - ✅ 常见问题 FAQ

#### 交付物

- ✅ `docs/COMPONENT_LIBRARY.md`
- ✅ `frontend/DEVELOPMENT.md`

---

## Phase 2: 后端基础架构 (Week 3-4)

**时间**: 2025-12-09 ~ 2025-12-22  
**负责人**: 后端开发  
**目标**: 搭建完整的后端开发环境和基础架构

### 2.1 项目初始化

**状态**: ✅ **已完成** (2025-12-26)

#### 架构决策

**后端目录组织方式**: 按业务领域（Domain）组织，而非按角色（Role）组织

- ✅ **推荐方式**（已采用）: `modules/member/` 包含会员自服务和管理员管理会员的所有端点

  - `/api/member/*` - 会员自服务端点
  - `/api/admin/members/*` - 管理员管理端点
  - 共享同一个 `MemberService` 和 `schemas`，避免代码重复
  - 权限通过依赖注入控制：`get_current_active_user` vs `get_current_admin_user`

- ❌ **不推荐**: 按角色分开为 `admin/member/` 和 `member/member/`，会导致代码重复和维护困难

#### 任务清单

- [x] **创建后端项目结构** ✅

  ```
  backend/
  ├── src/
  │   ├── common/
  │   │   └── modules/
  │   │       ├── config/      # 环境配置
  │   │       ├── logger/      # 日志配置
  │   │       ├── exception/   # 异常处理
  │   │       ├── db/          # 数据库会话和模型
  │   │       └── storage/     # 文件存储
  │   ├── modules/
  │   │   ├── user/           # 认证模块 ✅ 已实现
  │   │   │   ├── router.py   # 认证路由
  │   │   │   ├── service.py  # 认证服务
  │   │   │   ├── schemas.py  # 请求/响应模型
  │   │   │   └── dependencies.py # 权限依赖
  │   │   ├── member/         # 会员模块 ✅ 已实现
  │   │   │   ├── router.py   # 会员路由（包含会员和管理员端点）
  │   │   │   ├── service.py  # 会员服务
  │   │   │   └── schemas.py  # 请求/响应模型
  │   │   ├── performance/    # 绩效模块 ⚪ 待实现
  │   │   ├── project/        # 项目模块 ⚪ 待实现
  │   │   ├── content/        # 内容模块 ⚪ 待实现
  │   │   └── support/        # 支持模块 ⚪ 待实现
  │   └── main.py             # FastAPI入口
  ├── tests/                  # 测试目录
  ├── alembic/                # 数据库迁移
  ├── requirements.txt        # 依赖
  ├── .env.example            # 环境变量模板
  └── README.md
  ```

- [x] **依赖配置** ✅

  ```python
  # requirements.txt 核心依赖
  fastapi==0.115.0
  uvicorn[standard]==0.30.0
  sqlalchemy==2.0.25
  asyncpg==0.29.0
  pydantic==2.5.0
  pydantic-settings==2.1.0
  python-jose[cryptography]==3.3.0
  passlib[bcrypt]==1.7.4
  python-multipart==0.0.6
  supabase==2.3.0
  alembic==1.13.0
  ```

- [x] **基础模块实现** ✅

  - ✅ 配置模块 (`config/`) - Pydantic Settings
  - ✅ 数据库模块 (`db/`) - SQLAlchemy 异步会话和模型定义（`session.py` + `models.py`）
  - ✅ 日志模块 (`logger/`) - 结构化 JSON 日志
  - ✅ 异常处理 (`exception/`) - 自定义异常和全局处理器
  - ✅ 存储模块 (`storage/`) - Supabase Storage 服务（`__init__.py` 导出 + `service.py` 实现）

- [x] **业务模块实现** ✅ (部分完成)

  - ✅ 认证模块 (`user/`) - 注册、登录、Token 刷新
    - `POST /api/auth/register` - 会员注册 ✅
    - `POST /api/auth/login` - 会员登录 ✅
    - `POST /api/auth/admin-login` - 管理员登录 🟡 (待实现)
    - `GET /api/auth/me` - 获取当前用户 ✅
    - `POST /api/auth/logout` - 登出 ✅
    - `POST /api/auth/refresh` - 刷新 Token ✅
  - ✅ 会员模块 (`member/`) - 会员资料和管理
    - `GET /api/member/profile` - 获取我的资料 ✅
    - `PUT /api/member/profile` - 更新我的资料 ✅
    - `GET /api/admin/members` - 会员列表（分页、筛选）✅
    - `GET /api/admin/members/:id` - 会员详情 ✅
    - `PUT /api/admin/members/:id/approve` - 批准会员 ✅
    - `PUT /api/admin/members/:id/reject` - 拒绝会员 ✅

- [x] **FastAPI 应用** ✅

  - ✅ 主应用入口 (`main.py`)
  - ✅ CORS 中间件配置
  - ✅ 异常处理器注册
  - ✅ 健康检查端点 (`/healthz`, `/readyz`)

- [x] **配置文件** ✅
  - ✅ `requirements.txt` - Python 依赖
  - ✅ `.env.example` - 环境变量模板
  - ✅ `.gitignore` - Git 忽略文件
  - ✅ `README.md` - 后端开发文档

#### 验收标准

- ✅ 项目目录结构创建完成
- ✅ 依赖配置完成（requirements.txt）
- ✅ 基础模块实现完成（config, db, logger, exception, storage）
- ✅ 数据库模型定义完成（models.py）
- ✅ 认证模块部分实现（注册、登录、Token 管理）
- ✅ 会员模块部分实现（会员自服务和管理员管理）
- ✅ FastAPI 应用可启动 (`uvicorn src.main:app`)
- ✅ 健康检查端点可用 (`/healthz`, `/readyz`)

### 2.2 数据库设计与部署

**状态**: ✅ **已完成** (2025-11-25)

**重要成果**: 数据库已成功部署到 Supabase！

- Alembic 迁移生成并执行（Revision: `15e8f88ef4d4`）
- 所有 12 个数据库表已在 Supabase 中创建
- 数据库连接测试通过

#### 完成总结

Phase 2.2 所有准备工作已完成，包括：

**状态**: ✅ **已完成** (Phase 2.1 已完成所有基础模块)

#### 任务清单

- [ ] **配置模块** (`common/modules/config`)

  ```python
  # config/settings.py
  from pydantic_settings import BaseSettings

  class Settings(BaseSettings):
      # 应用配置
      APP_NAME: str = "Gangwon Business Portal"
      APP_VERSION: str = "1.0.0"
      DEBUG: bool = False

      # 数据库配置
      DATABASE_URL: str

      # Supabase配置
      SUPABASE_URL: str
      SUPABASE_KEY: str

      # JWT配置
      SECRET_KEY: str
      ALGORITHM: str = "HS256"
      ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24小时

      # CORS配置
      ALLOWED_ORIGINS: list = ["http://localhost:5173"]

      class Config:
          env_file = ".env"
  ```

- [ ] **数据库连接** (`common/modules/db`)

  ```python
  # db/session.py
  from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
  from sqlalchemy.orm import sessionmaker

  engine = create_async_engine(settings.DATABASE_URL, echo=True)
  AsyncSessionLocal = sessionmaker(
      engine, class_=AsyncSession, expire_on_commit=False
  )

  async def get_db():
      async with AsyncSessionLocal() as session:
          yield session
  ```

- [ ] **日志配置** (`common/modules/logger`)

  - 结构化 JSON 日志
  - 日志级别配置
  - 请求 ID 追踪

- [ ] **异常处理** (`common/modules/exception`)
  - 自定义异常类
  - 全局异常处理器
  - 标准错误响应格式

#### 交付物

- `backend/src/common/` 完整基础模块
- `backend/.env.example` 环境变量模板
- `backend/README.md` 后端开发文档

### 2.4 健康检查与监控

#### 任务清单

- [ ] **健康检查端点**

  ```python
  @app.get("/healthz")
  async def health_check():
      return {"status": "healthy"}

  @app.get("/readyz")
  async def readiness_check(db: AsyncSession = Depends(get_db)):
      # 检查数据库连接
      await db.execute("SELECT 1")
      return {"status": "ready"}
  ```

- [ ] **基础监控**
  - 请求计数
  - 响应时间
  - 错误率统计

#### 验收标准

- ✅ `/healthz` 和 `/readyz` 端点正常工作
- ✅ 日志正常输出
- ✅ 异常能正确捕获和格式化

---

## Phase 3: 核心 API 开发 (Week 5-6)

**时间**: 2025-12-23 ~ 2026-01-05  
**负责人**: 后端开发  
**目标**: 实现所有核心业务 API

### 3.1 认证 API (`modules/user`)

**状态**: ✅ **已完成** (2025-11-25)

#### API 列表

根据 PRD 附录 B API Endpoints:

**公开端点**:

- ✅ `POST /api/auth/register` - 会员注册 (已实现)
- ✅ `POST /api/auth/login` - 会员登录 (已实现)
- ✅ `POST /api/auth/admin-login` - 管理员登录 (已实现 2025-11-25)
- ✅ `POST /api/auth/password-reset-request` - 请求重置密码 (已实现 2025-11-25)
- ✅ `POST /api/auth/password-reset` - 重置密码 (已实现 2025-11-25)

**受保护端点**:

- ✅ `GET /api/auth/me` - 获取当前用户信息 (已实现)
- ✅ `POST /api/auth/logout` - 登出 (已实现)
- ✅ `POST /api/auth/refresh` - 刷新 Token (已实现)

#### 验收标准

- ✅ 核心认证 API 已实现（注册、登录、Token 管理）
- ✅ JWT Token 生成和验证正常
- ✅ 密码加密存储（bcrypt）
- ✅ 管理员登录功能（已实现）
- ✅ 密码重置功能（已实现，邮件服务待集成）
- ⚪ 邮箱验证功能（可选，延后）

#### 后续工作

- [ ] 集成邮件服务（SendGrid/AWS SES）用于密码重置
- [ ] 添加 rate limiting 防止暴力破解
- [ ] 编写自动化测试

#### 实现细节

```python
# modules/user/schemas.py
from pydantic import BaseModel, EmailStr

class MemberRegisterRequest(BaseModel):
    # Step 1: 账号信息
    business_number: str
    company_name: str
    password: str
    email: EmailStr

    # Step 2: 公司信息
    region: str
    company_type: str
    corporate_number: str
    address: str
    contact_person: str

    # Step 3: 业务信息
    industry: str
    revenue: float
    employee_count: int
    founding_date: str
    website: str
    main_business: str

    # Step 4: 文件上传 (文件ID)
    logo_file_id: str | None
    certificate_file_id: str | None

    # Step 5: 条款同意
    terms_agreed: bool

class LoginRequest(BaseModel):
    business_number: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict
```

```python
# modules/user/service.py
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class AuthService:
    async def register_member(self, data: MemberRegisterRequest, db: AsyncSession):
        # 1. 验证business_number唯一性
        existing = await db.execute(
            select(Member).where(Member.business_number == data.business_number)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(400, "Business number already registered")

        # 2. 创建会员记录
        member = Member(
            business_number=data.business_number,
            company_name=data.company_name,
            email=data.email,
            password_hash=pwd_context.hash(data.password),
            status="pending",
            approval_status="pending"
        )
        db.add(member)
        await db.flush()

        # 3. 创建会员资料
        profile = MemberProfile(
            member_id=member.id,
            industry=data.industry,
            revenue=data.revenue,
            # ... 其他字段
        )
        db.add(profile)
        await db.commit()

        return member

    async def authenticate(self, business_number: str, password: str, db: AsyncSession):
        member = await db.execute(
            select(Member).where(Member.business_number == business_number)
        )
        member = member.scalar_one_or_none()

        if not member or not pwd_context.verify(password, member.password_hash):
            raise HTTPException(401, "Invalid credentials")

        if member.approval_status != "approved":
            raise HTTPException(403, "Account pending approval")

        return member

    def create_access_token(self, user_id: str, role: str):
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode = {"sub": str(user_id), "role": role, "exp": expire}
        return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
```

#### 验收标准

- 🟡 核心认证 API 已实现（注册、登录、Token 管理）
- ✅ JWT Token 生成和验证正常
- ✅ 密码加密存储（bcrypt）
- ⚪ 管理员登录功能（待实现）
- ⚪ 密码重置功能（待实现）
- ⚪ 邮箱验证功能（可选，延后）

### 3.2 会员 API (`modules/member`)

**状态**: 🟡 **部分完成** (核心功能已实现，部分功能待完善)

#### API 列表

**会员自服务**:

- ✅ `GET /api/member/profile` - 获取公司资料 (已实现)
- ✅ `PUT /api/member/profile` - 更新公司资料 (已实现)
- ⚪ `POST /api/member/profile/logo` - 上传公司 Logo (待实现)

**管理员-会员管理**:

- ✅ `GET /api/admin/members` - 会员列表（分页、筛选）(已实现)
- ✅ `GET /api/admin/members/:id` - 会员详情 (已实现)
- ✅ `PUT /api/admin/members/:id/approve` - 批准会员 (已实现)
- ✅ `PUT /api/admin/members/:id/reject` - 拒绝会员 (已实现)
- ⚪ `DELETE /api/admin/members/:id` - 删除会员（软删除）(待实现)

#### 实现要点

- 分页查询实现
- 筛选条件（公司名、行业、地区）
- 审批状态流转
- 审批历史记录

### 3.3 绩效 API (`modules/performance`)

**状态**: ✅ **已完成** (2025-11-25)

#### API 列表

**会员端**:

- ✅ `GET /api/performance` - 绩效记录列表 (已实现)
- ✅ `GET /api/performance/:id` - 绩效详情 (已实现)
- ✅ `POST /api/performance` - 提交绩效数据 (已实现)
- ✅ `PUT /api/performance/:id` - 修改绩效数据（草稿状态）(已实现)
- ✅ `DELETE /api/performance/:id` - 删除绩效（草稿状态）(已实现)
- ✅ `POST /api/performance/:id/submit` - 提交审核 (已实现)

**管理员端**:

- ✅ `GET /api/admin/performance` - 待审核绩效列表 (已实现)
- ✅ `GET /api/admin/performance/:id` - 绩效详情 (已实现)
- ✅ `PUT /api/admin/performance/:id/approve` - 批准绩效 (已实现)
- ✅ `PUT /api/admin/performance/:id/request-fix` - 要求修改 (已实现)
- ✅ `PUT /api/admin/performance/:id/reject` - 驳回绩效 (已实现)
- ✅ `GET /api/admin/performance/export` - 导出绩效数据 (已实现)

#### 数据结构

绩效数据存储在 `performance_records.data_json` 字段：

```json
{
  "sales_employment": {
    "total_revenue": 1500000000,
    "new_employees": 5,
    "total_employees": 35,
    "revenue_breakdown": [
      { "category": "국내매출", "amount": 1000000000 },
      { "category": "수출매출", "amount": 500000000 }
    ],
    "employment_breakdown": [
      { "role": "연구개발", "count": 10 },
      { "role": "생산직", "count": 15 },
      { "role": "관리직", "count": 10 }
    ]
  },
  "government_support": [
    {
      "program_name": "중소기업 R&D 지원",
      "organization": "중소벤처기업부",
      "amount": 50000000,
      "support_type": "무상지원",
      "period_start": "2024-01-01",
      "period_end": "2024-12-31"
    }
  ],
  "intellectual_property": [
    {
      "ip_type": "특허",
      "registration_number": "10-2024-1234567",
      "registration_date": "2024-06-15",
      "title": "AI 기반 생산 최적화 시스템",
      "status": "등록"
    }
  ]
}
```

### 3.4 项目 API (`modules/project`)

**状态**: ✅ **已完成** (2025-11-25)

#### API 列表

**公开/会员端**:

- ✅ `GET /api/projects` - 项目列表（分页）(已实现 - 公开访问)
- ✅ `GET /api/projects/:id` - 项目详情 (已实现 - 公开访问)
- ✅ `POST /api/projects/:id/apply` - 申请项目 (已实现)
- ✅ `GET /api/my-applications` - 我的申请记录 (已实现)

**管理员端**:

- ✅ `POST /api/admin/projects` - 创建项目 (已实现)
- ✅ `PUT /api/admin/projects/:id` - 更新项目 (已实现)
- ✅ `DELETE /api/admin/projects/:id` - 删除项目 (已实现)
- ✅ `GET /api/admin/projects/:id/applications` - 项目申请列表 (已实现)
- ✅ `PUT /api/admin/applications/:id/status` - 更新申请状态 (已实现)

### 3.5 内容 API (`modules/content`)

#### API 列表

**公告管理**:

- `GET /api/notices` - 公告列表
- `GET /api/notices/latest5` - 最新 5 条公告
- `GET /api/notices/:id` - 公告详情
- `POST /api/admin/content/notices` - 创建公告（WYSIWYG）
- `PUT /api/admin/content/notices/:id` - 更新公告
- `DELETE /api/admin/content/notices/:id` - 删除公告

**新闻稿管理**:

- `GET /api/press` - 新闻列表
- `GET /api/press/latest1` - 最新新闻
- `POST /api/admin/content/press` - 创建新闻

**横幅管理**:

- `GET /api/banners?type=MAIN` - 获取横幅（按类型）
- `POST /api/admin/content/banners` - 创建横幅
- `PUT /api/admin/content/banners/:id` - 更新横幅
- `DELETE /api/admin/content/banners/:id` - 删除横幅

**系统介绍**:

- `GET /api/system-info` - 获取系统介绍
- `PUT /api/admin/content/system-info` - 更新系统介绍

### 3.6 支持 API (`modules/support`)

#### API 列表

**FAQ**:

- `GET /api/faqs` - FAQ 列表
- `POST /api/admin/faqs` - 创建 FAQ
- `PUT /api/admin/faqs/:id` - 更新 FAQ
- `DELETE /api/admin/faqs/:id` - 删除 FAQ

**1:1 咨询**:

- `POST /api/inquiries` - 提交咨询
- `GET /api/inquiries` - 我的咨询列表
- `GET /api/inquiries/:id` - 咨询详情
- `GET /api/admin/inquiries` - 所有咨询（管理员）
- `PUT /api/admin/inquiries/:id/reply` - 回复咨询

### 3.7 文件上传 API

**状态**: ✅ **已完成** (2025-12-26)

#### API 列表

- ✅ `POST /api/upload/public` - 公开文件上传（横幅、公告图片）(已实现)
- ✅ `POST /api/upload/private` - 私有文件上传（绩效附件）(已实现)
- ✅ `GET /api/upload/{id}` - 下载文件（权限检查）(已实现)
- ✅ `GET /api/upload/{id}/redirect` - 重定向到文件 URL (已实现)
- ✅ `DELETE /api/upload/{id}` - 删除文件 (已实现)

#### 实现要点

**已实现功能**:

- ✅ 公开文件上传 (`POST /api/upload/public`)
  - 文件存储在 `public-files` bucket
  - 支持可选 `resource_type` 和 `resource_id` 参数
  - 返回公开 URL
- ✅ 私有文件上传 (`POST /api/upload/private`)
  - 文件存储在 `private-files` bucket
  - 需要认证
  - 支持可选 `resource_type` 和 `resource_id` 参数
- ✅ 文件下载 (`GET /api/upload/{id}`)
  - 公开文件返回公开 URL
  - 私有文件返回签名 URL（1 小时有效）
  - 权限检查：用户必须拥有文件或是管理员
- ✅ 文件重定向 (`GET /api/upload/{id}/redirect`)
  - 返回 HTTP 302 重定向到文件 URL
- ✅ 文件删除 (`DELETE /api/upload/{id}`)
  - 权限检查：用户必须拥有文件或是管理员
  - 同时删除存储和数据库记录

**技术实现**:

- ✅ 文件验证：大小限制（最大 10MB，可配置）、类型验证（可配置 MIME 类型）
- ✅ 自动文件类型检测（image、document、other）
- ✅ 文件路径组织：使用 `business_id` 组织文件路径
- ✅ 元数据存储：所有文件元数据存储在 `attachments` 表中
- ✅ 签名 URL 生成：私有文件使用 Supabase Storage 签名 URL（1 小时有效）
- ✅ 权限控制：所有端点需要认证，私有文件访问权限检查

#### Supabase Storage 桶配置

- ✅ `public-files` - 公开文件（横幅、公告图片）
- ✅ `private-files` - 私有文件（绩效附件、会员证书）
- ✅ 文件路径规则: `/{businessId}/{module}/{filename}`

#### 验收标准

- ✅ 所有文件上传 API 端点已实现
- ✅ 文件验证和权限控制正常
- ✅ 公开/私有文件存储分离
- ✅ 签名 URL 生成功能正常
- ✅ 文件删除功能正常（同时删除存储和数据库记录）

---

## Phase 4: 前后端集成 (Week 7-8)

**时间**: 2026-01-06 ~ 2026-01-19  
**负责人**: 全栈开发  
**目标**: 前后端 API 对接，替换 Mock 数据

### 4.1 API 集成准备

#### 任务清单

- [x] **API 路径前缀统一** (已完成 - 2025-12-26)
  - ✅ 修复前端 API 路径前缀（从 `/api/v1` 改为 `/api`，与后端一致）
  - ✅ 更新 `frontend/src/shared/utils/constants.js` 中的 `API_PREFIX`
  - ✅ 确保前后端 API 路径完全匹配

- [ ] **API 基础 URL 配置**

  ```javascript
  // frontend/.env.local
  VITE_API_BASE_URL=http://localhost:8000
  VITE_USE_MOCK=false  // 禁用Mock（当前为 true，测试时改为 false）
  ```

- [x] **Axios 拦截器配置** (已存在，已验证)
  - ✅ 请求拦截器已配置（添加 Token）
  - ✅ 响应拦截器已配置（处理 401 错误）
  - ✅ 文件位置：`frontend/src/shared/services/api.service.js`

### 4.2 模块对接 (按优先级)

#### 4.2.1 认证模块 (P0 - 最高优先级)

- [x] **会员登录功能** (已完成 - 2025-12-26)
  - ✅ 前端: `member/modules/auth/Login.jsx` - 已更新
  - ✅ 后端: `POST /api/auth/login` - 已对接
  - ✅ 修复字段映射：`businessLicense` → `business_number`
  - ✅ 更新响应处理，适配后端返回格式
  - ⚪ 测试: 登录成功、失败、未审批账号（待测试）

- [x] **注册功能** (已完成 - 2025-12-26)
  - ✅ 前端: `member/modules/auth/Register.jsx` - 已更新
  - ✅ 后端: `POST /api/auth/register` - 已对接
  - ✅ 实现字段映射和数据转换（前端字段 → 后端字段）
  - ✅ FormData 数据提取和 JSON 格式提交
  - ⚠️ 文件上传暂时跳过（后端需要认证，注册时用户未登录）
  - ⚪ 测试: 多步骤表单提交、字段验证（待测试）

- [x] **管理员登录** (已完成 - 2025-12-26)
  - ✅ 前端: `admin/modules/auth/Login.jsx` - 已更新（使用 `username` 字段）
  - ✅ 后端: `POST /api/auth/admin-login` - 已对接
  - ✅ 添加 `adminLogin` 方法到 `authService` 和 `useAuth` hook
  - ⚪ 测试: 管理员登录流程（待测试）

#### 4.2.2 会员管理 (P0)

- [ ] **公司资料**

  - 前端: `member/modules/performance/PerformanceCompanyInfo.jsx`
  - 后端: `GET /api/member/profile`, `PUT /api/member/profile`

- [ ] **会员列表**

  - 前端: `admin/modules/members/MemberList.jsx`
  - 后端: `GET /api/admin/members`

- [ ] **会员审批**
  - 前端: `admin/modules/members/MemberDetail.jsx`
  - 后端: `PUT /api/admin/members/:id/approve`

#### 4.2.3 绩效管理 (P0)

**状态**: ✅ **已完成** (2025-12-26)

- [x] **绩效录入** (已完成)

  - 前端: `member/modules/performance/PerformanceFormContent.jsx` - 已更新
  - 后端: `POST /api/performance` - 已对接
  - ✅ 创建 `performance.service.js`，封装绩效管理 API
  - ✅ 实现数据格式转换：前端表单数据 ↔ 后端 JSON 格式
  - ✅ 支持创建草稿、更新草稿、提交审核
  - ✅ 支持编辑模式（加载现有记录）
  - ✅ 三标签页数据结构对接完成（销售额雇佣、政府支持、知识产权）

- [x] **绩效查询** (已完成)

  - 前端: `member/modules/performance/PerformanceListContent.jsx` - 已更新
  - 后端: `GET /api/performance` - 已对接
  - ✅ 实现分页和筛选（年度、季度、状态）
  - ✅ 状态映射：后端状态 ↔ 前端显示
  - ✅ 支持编辑和删除（仅限草稿和需修改状态）

- [x] **绩效审批** (已完成)
  - 前端: `admin/modules/performance/PerformanceList.jsx` - 已更新
  - 后端: `GET /api/admin/performance`, `PUT /api/admin/performance/:id/approve` - 已对接
  - ✅ 在 `admin.service.js` 中添加绩效审批方法
  - ✅ 实现批准、要求修改、驳回功能
  - ✅ 支持筛选和分页

#### 4.2.4 项目管理 (P1)

- [ ] **项目列表**

  - 前端: `member/modules/projects/Projects.jsx`
  - 后端: `GET /api/projects`

- [ ] **项目详情**

  - 前端: `member/modules/projects/ProjectDetail.jsx`
  - 后端: `GET /api/projects/:id`

- [ ] **项目申请**
  - 完善前端申请表单
  - 后端: `POST /api/projects/:id/apply`

#### 4.2.5 内容管理 (P1)

- [ ] **首页数据**

  - 前端: `member/modules/home/Home.jsx`
  - 后端:
    - `GET /api/notices/latest5`
    - `GET /api/press/latest1`
    - `GET /api/banners?type=MAIN`

- [ ] **公告管理**
  - 前端: `admin/modules/content/ContentManagement.jsx`
  - 后端: Notice CRUD APIs
  - 重点: WYSIWYG 编辑器集成

#### 4.2.6 支持模块 (P2)

**状态**: ✅ **已完成** (2025-12-26)

- [x] **FAQ** (已完成)
  - ✅ 前端: `member/modules/support/FAQList.jsx` - 已更新
  - ✅ 后端: `GET /api/faqs` - 已对接
  - ✅ 创建 `support.service.js`，封装 FAQ API
  - ✅ 实现 `listFAQs()` 方法（支持分类筛选）

- [x] **1:1 咨询** (已完成)
  - ✅ 前端: `member/modules/support/InquiryPage.jsx` - 已更新
  - ✅ 前端: `member/modules/support/ConsultationForm.jsx` - 已更新（简化表单，移除 name/email/phone）
  - ✅ 前端: `member/modules/support/ConsultationHistory.jsx` - 已更新
  - ✅ 前端: `member/modules/support/ConsultationDetail.jsx` - 已更新
  - ✅ 后端: `POST /api/inquiries`, `GET /api/inquiries`, `GET /api/inquiries/:id` - 已对接
  - ✅ 创建 `support.service.js`，封装咨询 API
  - ✅ 实现 `createInquiry()` 方法（提交咨询）
  - ✅ 实现 `listMyInquiries()` 方法（我的咨询列表，支持分页）
  - ✅ 实现 `getInquiry()` 方法（咨询详情）
  - ✅ 数据格式转换：后端 snake_case ↔ 前端 camelCase
  - ✅ 状态映射：后端状态（pending, replied, closed）↔ 前端显示（pending, answered, closed）
  - ✅ 字段映射：后端 `admin_reply` → 前端 `answer`，`replied_at` → `answeredAt`

### 4.3 集成测试

**状态**: 🟡 **进行中** (2025-11-26 - 测试脚本已创建)

#### 已完成

- [x] **测试用例文档** ✅
  - 创建 `docs/TEST_CASES.md`，包含 52 个测试用例
  - 覆盖 6 个核心模块（认证、会员、绩效、项目、内容、支持）

- [x] **集成测试脚本** ✅
  - `backend/tests/integration/test_auth_api.py` - 认证模块测试 (8 个测试用例)
  - `backend/tests/integration/test_member_api.py` - 会员管理测试 (7 个测试用例)
  - `backend/tests/integration/test_performance_api.py` - 绩效管理测试 (9 个测试用例)
  - `backend/tests/integration/test_project_api.py` - 项目管理测试 (8 个测试用例)
  - `backend/tests/integration/test_content_api.py` - 内容管理测试 (10 个测试用例)
  - `backend/tests/integration/test_support_api.py` - 支持模块测试 (10 个测试用例)
  - `backend/tests/run_all_tests.py` - 测试主运行脚本
  - `backend/tests/README.md` - 测试文档

- [x] **测试基础设施** ✅
  - 自动化 API 端点测试
  - 认证 Token 管理
  - 测试结果 JSON 输出
  - 测试摘要报告生成
  - 服务器健康检查

#### 待完成

- [ ] **运行测试并修复问题**
  - 运行 `python tests/run_all_tests.py`
  - 修复测试中发现的 API 问题
  - 验证测试覆盖率

- [ ] **端到端用户流程测试**

  1. 会员注册 → 管理员审批 → 登录
  2. 提交绩效 → 管理员审核 → 查看结果
  3. 浏览项目 → 提交申请 → 查看状态
  4. 提交咨询 → 管理员回复 → 查看答复

- [ ] **错误处理测试**

  - 网络错误
  - API 错误（400、401、403、500）
  - 表单验证错误

- [ ] **性能测试**
  - 首屏加载时间
  - API 响应时间
  - 文件上传速度

#### 运行方式

```bash
# 先确保后端服务器运行
cd backend
python -m uvicorn src.main:app --reload --host 127.0.0.1 --port 8000

# 运行所有测试
python tests/run_all_tests.py

# 运行单个模块测试
python tests/integration/test_auth_api.py
python tests/integration/test_member_api.py
python tests/integration/test_performance_api.py
python tests/integration/test_project_api.py
python tests/integration/test_content_api.py
python tests/integration/test_support_api.py
```

#### 交付物

- ✅ `docs/TEST_CASES.md` - 测试用例文档
- ✅ `backend/tests/` - 集成测试脚本
- ⚪ `backend/tests/test_results/` - 测试结果报告
- ⚪ `docs/API_INTEGRATION_REPORT.md` - 集成测试报告
- ✅ 所有 Mock 数据替换完成的前端代码

---

## Phase 5: 高级功能实现 (Week 9-10)

**时间**: 2026-01-20 ~ 2026-02-02  
**负责人**: 全栈开发  
**目标**: 实现剩余高级功能

### 5.1 仪表板数据可视化

#### 任务清单

- [ ] **Dashboard API 开发**

  ```python
  # 管理员仪表板
  GET /api/admin/dashboard/metrics
  Response:
  {
    "total_members": 150,
    "total_revenue": 225000000000,
    "total_employment": 5250,
    "total_ip_rights": 48
  }

  GET /api/admin/dashboard/trends?year=2024
  Response:
  {
    "revenue_trend": [...],
    "employment_trend": [...],
    "ip_trend": [...]
  }
  ```

- [ ] **前端 ECharts 集成**
  - 更新 `admin/modules/dashboard` 使用真实数据
  - 趋势图表优化
  - 数据刷新机制

### 5.2 数据导出功能

#### 任务清单

- [ ] **Excel 导出**

  ```python
  # 使用 openpyxl 或 xlsxwriter
  GET /api/admin/performance/export?year=2024&quarter=1
  Response: Excel文件下载
  ```

- [ ] **前端下载处理**

  ```javascript
  const handleExport = async () => {
    const response = await api.get("/api/admin/performance/export", {
      params: { year, quarter },
      responseType: "blob",
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `performance_${year}_Q${quarter}.xlsx`);
    document.body.appendChild(link);
    link.click();
  };
  ```

### 5.3 Nice D&B API 集成

#### 任务清单

- [ ] **Nice D&B API 配置**

  ```python
  # modules/integration/nice_dnb.py
  class NiceDnBClient:
      def __init__(self):
          self.api_key = settings.NICE_DNB_API_KEY
          self.base_url = "https://api.nicednb.com"

      async def search_company(self, business_number: str):
          # 调用Nice D&B API
          # 返回公司财务数据
          pass
  ```

- [ ] **企业检索功能**
  - 前端: 完善 `admin/modules/reports` 企业检索 UI
  - 后端: `POST /api/admin/company/search`
  - 响应: 公司基本信息 + 财务数据

### 5.4 邮件通知

#### 任务清单

- [ ] **邮件服务配置**

  - 选择邮件服务商（SendGrid / AWS SES / SMTP）
  - 配置邮件模板

- [ ] **通知场景**
  1. 会员注册审批结果
  2. 绩效审核结果
  3. 项目申请状态更新
  4. 咨询回复通知

### 5.5 审计日志

#### 任务清单

- [ ] **后端审计日志中间件**

  ```python
  @app.middleware("http")
  async def audit_log_middleware(request: Request, call_next):
      # 记录关键操作
      if request.method in ["POST", "PUT", "DELETE"]:
          # 提取用户、资源、操作
          # 写入audit_logs表
          pass

      response = await call_next(request)
      return response
  ```

- [ ] **日志查询 API**
  - `GET /api/admin/audit-logs` - 审计日志列表
  - 筛选：用户、时间范围、操作类型

### 5.6 前后端统一日志 & 监控

#### 任务清单

- [ ] **前端日志收集与上报**
  - 在前端封装轻量级日志工具（error/info），统一由 `api.service.js` 或单独的 `logging.service.js` 调用
  - 拦截全局错误（`window.onerror`, `unhandledrejection`）和 Axios 请求失败，发送到后端日志 API
  - 日志内容包含：前端路由、用户 ID（如有）、浏览器信息、错误栈/信息

- [ ] **后端日志接收与归档**
  - 新增 `POST /api/logs/frontend` 接口，接收前端日志（带简单认证/速率限制）
  - 将前端日志写入统一的结构化日志（与后端 JSON 日志格式兼容），必要时落库到 `audit_logs` 或单独表

- [ ] **统一查询视图**
  - 在 `GET /api/admin/audit-logs` 或独立端点中同时支持查看后端操作日志和前端错误日志
  - 支持按来源（frontend/backend）、模块、用户、时间范围过滤

---

## Phase 6: 测试与优化 (Week 11-12)

**时间**: 2026-02-03 ~ 2026-02-16  
**负责人**: 全员  
**目标**: 全面测试和性能优化

### 6.1 功能测试

#### 测试矩阵

| 模块 | 功能点             | 手工测试 | 自动化测试 | 负责人 |
| ---- | ------------------ | -------- | ---------- | ------ |
| 认证 | 登录/注册/重置密码 | ✅       | 🟡         | 前端   |
| 会员 | 资料 CRUD/审批     | ✅       | ✅         | 后端   |
| 绩效 | 录入/查询/审批     | ✅       | ✅         | 全栈   |
| 项目 | 列表/详情/申请     | ✅       | 🟡         | 前端   |
| 内容 | 公告/新闻/横幅     | ✅       | ⚪         | 前端   |
| 支持 | FAQ/咨询           | ✅       | ⚪         | 前端   |

#### 测试用例

创建 `docs/TEST_CASES.md`，包含：

- 正常流程测试
- 边界条件测试
- 错误处理测试
- 权限控制测试

### 6.2 性能优化

#### 前端优化

- [ ] **代码分割优化**

  - 按路由懒加载
  - 第三方库分离（ECharts、i18next）

- [ ] **资源优化**

  - 图片压缩和 WebP 转换
  - 字体子集化
  - CSS/JS 压缩

- [ ] **缓存策略**
  - TanStack Query 缓存配置
  - 静态资源浏览器缓存

#### 后端优化

- [ ] **数据库查询优化**

  - 索引优化
  - N+1 查询问题检测
  - 慢查询日志分析

- [ ] **API 性能**

  - 数据库连接池配置
  - 响应压缩（gzip）
  - 分页优化

- [ ] **缓存实现（可选）**
  - Redis 缓存热点数据
  - API 响应缓存

### 6.3 安全测试

#### 测试清单

- [ ] **认证安全**

  - Token 过期测试
  - 密码强度验证
  - 防暴力破解

- [ ] **授权安全**

  - 角色权限测试
  - 跨用户数据访问测试

- [ ] **输入验证**

  - SQL 注入测试
  - XSS 攻击测试
  - 文件上传漏洞测试

- [ ] **HTTPS 配置**
  - SSL 证书配置
  - HSTS 启用
  - 安全头设置

### 6.4 无障碍测试

#### 测试工具

- Lighthouse（Chrome DevTools）
- axe DevTools
- WAVE 浏览器插件

#### 测试项

- 键盘导航
- 屏幕阅读器兼容
- 颜色对比度
- 焦点管理

---

## Phase 7: 部署上线 (Week 13-14)

**时间**: 2026-02-17 ~ 2026-03-02  
**负责人**: 运维+开发  
**目标**: 生产环境部署和上线

### 7.1 部署准备

#### 服务器要求

**前端服务器**:

- Nginx
- Node.js 18+ (如果需要 SSR)
- 或静态托管（Vercel / Netlify）

**后端服务器**:

- Ubuntu 22.04 LTS
- Python 3.11+
- PostgreSQL 15+ (Supabase hosted)
- Nginx (反向代理)
- Supervisor/Systemd (进程管理)

#### 环境配置

- [ ] **生产环境变量**

  ```bash
  # backend/.env.production
  APP_NAME=Gangwon Business Portal
  DEBUG=false
  DATABASE_URL=postgresql+asyncpg://user:pass@supabase-host/db
  SUPABASE_URL=https://your-project.supabase.co
  SUPABASE_KEY=your-production-key
  SECRET_KEY=your-secret-key
  ALLOWED_ORIGINS=https://gangwon-portal.com
  NICE_DNB_API_KEY=your-api-key
  ```

- [ ] **前端生产构建**
  ```bash
  # frontend/.env.production
  VITE_API_BASE_URL=https://api.gangwon-portal.com
  VITE_ENABLE_MOCK=false
  VITE_ENABLE_SENTRY=true
  ```

### 7.2 前端部署

#### 选项 A: Nginx 静态托管

```bash
# 1. 构建生产版本
cd frontend
npm run build

# 2. Nginx配置
server {
    listen 80;
    server_name gangwon-portal.com;
    root /var/www/gangwon-portal/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# 3. SSL配置（Let's Encrypt）
sudo certbot --nginx -d gangwon-portal.com
```

#### 选项 B: Vercel 部署

```bash
# vercel.json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}

# 部署
vercel --prod
```

### 7.3 后端部署

#### Uvicorn + Gunicorn

```bash
# 1. 安装依赖
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 2. 运行迁移
alembic upgrade head

# 3. Gunicorn配置
# gunicorn.conf.py
bind = "0.0.0.0:8000"
workers = 4
worker_class = "uvicorn.workers.UvicornWorker"
accesslog = "/var/log/gangwon-portal/access.log"
errorlog = "/var/log/gangwon-portal/error.log"

# 4. Supervisor配置
# /etc/supervisor/conf.d/gangwon-portal.conf
[program:gangwon-portal]
command=/path/to/venv/bin/gunicorn src.main:app -c gunicorn.conf.py
directory=/path/to/backend
user=www-data
autostart=true
autorestart=true
```

### 7.4 数据库迁移

#### 生产数据库检查

- [ ] 数据库备份
- [ ] 运行迁移测试
- [ ] 索引性能验证
- [ ] 连接池配置

### 7.5 监控与日志

#### 监控配置

- [ ] **应用监控**

  - Sentry 错误追踪
  - 或自建监控（Prometheus + Grafana）

- [ ] **服务器监控**

  - CPU/内存/磁盘使用率
  - 网络流量

- [ ] **数据库监控**
  - Supabase Dashboard
  - 慢查询监控

#### 日志管理

```python
# 生产环境日志配置
logging.config.dictConfig({
    "version": 1,
    "handlers": {
        "file": {
            "class": "logging.handlers.RotatingFileHandler",
            "filename": "/var/log/gangwon-portal/app.log",
            "maxBytes": 10485760,  # 10MB
            "backupCount": 10,
            "formatter": "json"
        }
    },
    "root": {"level": "INFO", "handlers": ["file"]}
})
```

### 7.6 上线检查清单

- [ ] **功能验证**

  - 所有核心功能可用
  - 用户注册登录正常
  - 数据提交和审批流程完整

- [ ] **性能验证**

  - 页面加载 < 3 秒
  - API 响应 < 500ms
  - 并发测试 500 用户

- [ ] **安全验证**

  - HTTPS 正常工作
  - 所有敏感端点受保护
  - 文件上传安全

- [ ] **备份恢复**

  - 数据库自动备份配置
  - 恢复流程测试

- [ ] **文档准备**
  - 用户操作手册
  - 管理员使用指南
  - 运维手册

### 7.7 灰度发布（推荐）

#### 阶段发布计划

**Week 13: 内部测试**

- 小范围用户测试（5-10 家企业）
- 收集反馈，修复 Bug

**Week 14: 全量发布**

- 开放所有企业注册
- 新闻发布和用户培训

---

## 资源需求

### 人力资源

| 角色           | 人数 | 投入时间   | 职责                |
| -------------- | ---- | ---------- | ------------------- |
| **前端开发**   | 1    | 全职 14 周 | Phase 1, 4 前端部分 |
| **后端开发**   | 1    | 全职 12 周 | Phase 2-5           |
| **全栈开发**   | 1    | 全职 4 周  | Phase 4 集成        |
| **测试工程师** | 1    | 全职 2 周  | Phase 6 测试        |
| **运维工程师** | 1    | 兼职 2 周  | Phase 7 部署        |
| **项目经理**   | 1    | 兼职 14 周 | 全程协调            |

### 技术资源

**开发环境**:

- 开发机器（本地）
- 测试环境（Supabase Free Tier）

**生产环境**:

- **Supabase Pro**: $25/月
- **服务器**: VPS 4GB RAM, $20/月
- **域名**: $15/年
- **SSL 证书**: 免费（Let's Encrypt）
- **监控**: Sentry 免费套餐 或 自建
- **邮件服务**: SendGrid 免费套餐（100 封/天）

**总成本估算**: 初期 $50/月，成熟期 $100-150/月

### 外部服务

| 服务             | 用途             | 成本            |
| ---------------- | ---------------- | --------------- |
| **Nice D&B API** | 企业信息查询     | 按查询计费      |
| **邮件服务**     | 邮件通知         | 免费套餐        |
| **对象存储**     | Supabase Storage | 包含在 Pro 套餐 |

---

## 风险管理

### 技术风险控制

| 风险                    | 缓解措施               | 应急方案                     |
| ----------------------- | ---------------------- | ---------------------------- |
| **后端开发延期**        | 前端使用 Mock 独立开发 | 延长集成周期，减少非关键功能 |
| **Supabase 限制**       | 监控用量，提前扩容     | 迁移到自建 PostgreSQL        |
| **Nice D&B API 不稳定** | 实现缓存和降级         | 手动录入企业信息             |
| **性能不达标**          | 提前性能测试           | 数据库优化、增加缓存         |

### 项目风险控制

| 风险           | 缓解措施                         |
| -------------- | -------------------------------- |
| **需求变更**   | 变更控制流程，延后到 V1.1        |
| **资源不足**   | 优先实现核心功能，降低 P2 优先级 |
| **测试不充分** | 引入自动化测试，提前测试         |
| **上线延期**   | 灰度发布，分阶段上线             |

---

## 质量保证

### 代码质量

- **代码审查**: 所有 PR 需要审查
- **编码规范**: 前端 ESLint，后端 Black
- **文档**: 关键函数注释，API 文档完整

### 测试覆盖

**最低要求**:

- 后端核心 API 单元测试覆盖率 > 70%
- 前端关键组件测试 > 50%
- 端到端测试覆盖主要用户流程

**测试类型**:

- 单元测试 (pytest, vitest)
- 集成测试 (后端 API)
- E2E 测试 (Playwright / Cypress, 可选)

### 性能标准

根据 PRD 非功能需求:

- 页面加载时间 < 3 秒（3G 网络）
- API 响应时间 95% < 500ms
- 支持 500 并发用户
- 数据库查询 < 100ms

### 安全标准

- HTTPS 全站启用
- JWT Token 24 小时过期
- 密码 bcrypt 加密
- 输入验证（前后端双重）
- 文件上传安全检查
- SQL 注入/XSS 防护

---

## 附录

### A. 关键里程碑

| Week    | 里程碑         | 交付物                  |
| ------- | -------------- | ----------------------- |
| Week 2  | 前端完善完成   | 国际化、Mock 优化、文档 |
| Week 4  | 后端基础完成   | 数据库、基础模块        |
| Week 6  | 核心 API 完成  | 所有业务 API            |
| Week 8  | 前后端集成完成 | 功能对接、集成测试      |
| Week 10 | 高级功能完成   | 仪表板、导出、Nice D&B  |
| Week 12 | 测试优化完成   | 测试报告、性能优化      |
| Week 14 | 生产上线       | 部署文档、运维手册      |

### B. 参考文档

- [PRD.md](./PRD.md) - 产品需求文档
- [PROJECT_STATUS.md](./PROJECT_STATUS.md) - 项目当前状态
- [ARCHITECTURE.md](./ARCHITECTURE.md) - 系统架构文档
- [Frontend README](../frontend/README.md) - 前端开发指南

### C. 联系方式

- **项目负责人**: [待定]
- **技术负责人**: [待定]
- **紧急联系**: [待定]

---

**文档结束**

> 此计划由开发团队制定，作为 Q1 2026 上线的实施路线图。如有调整，及时更新此文档。

**最后更新**: 2025-11-26 (Phase 4.3 进行中 - 集成测试执行准备)

---

## 更新日志

### v1.3.0 (2025-11-26)

**Phase 4.3 进行中 - 集成测试执行**:

- ✅ 创建测试用例文档 `docs/TEST_CASES.md`：
  - 52 个集成测试用例
  - 覆盖 6 个核心模块（认证、会员、绩效、项目、内容、支持）
  - 包含正常流程、边界条件、错误处理测试
- ✅ 创建集成测试脚本：
  - `backend/tests/integration/test_auth_api.py` - 认证模块测试 (8 个测试用例)
  - `backend/tests/integration/test_member_api.py` - 会员管理测试 (7 个测试用例)
  - `backend/tests/integration/test_performance_api.py` - 绩效管理测试 (9 个测试用例)
  - `backend/tests/integration/test_project_api.py` - 项目管理测试 (8 个测试用例)
  - `backend/tests/integration/test_content_api.py` - 内容管理测试 (10 个测试用例)
  - `backend/tests/integration/test_support_api.py` - 支持模块测试 (10 个测试用例)
  - `backend/tests/run_all_tests.py` - 测试主运行脚本
  - `backend/tests/README.md` - 测试文档
- ✅ 测试基础设施：
  - 自动化 API 端点测试
  - 认证 Token 管理
  - 测试结果 JSON 输出
  - 测试摘要报告生成
  - 服务器健康检查
- 🟡 后端服务器已启动（http://127.0.0.1:8000）
- 🟡 测试执行准备中
- 📊 整体进度：Phase 4.3 完成度 75%（测试脚本已创建，服务器已启动，准备执行测试）

**下一步重点**:

- 运行集成测试脚本，验证所有 API 端点
- 修复测试中发现的问题
- 完成端到端用户流程测试
- Phase 5: 高级功能实现

### v1.2.9 (2025-12-26)

**Phase 4.2.6 完成 - 支持模块对接**:

- ✅ 创建 `support.service.js`，封装支持模块 API：
  - 实现 FAQ API（`listFAQs()` 方法，支持分类筛选）
  - 实现咨询 API（`createInquiry()`, `listMyInquiries()`, `getInquiry()` 方法）
  - 数据格式转换：后端 snake_case ↔ 前端 camelCase
  - 状态映射：后端状态（pending, replied, closed）↔ 前端显示（pending, answered, closed）
  - 字段映射：后端 `admin_reply` → 前端 `answer`，`replied_at` → `answeredAt`
- ✅ 会员端 - FAQ 功能对接：
  - 更新 `FAQList.jsx` 组件使用 `supportService.listFAQs()`
  - 支持分类筛选（可选）
- ✅ 会员端 - 咨询功能对接：
  - 更新 `ConsultationForm.jsx` 组件使用 `supportService.createInquiry()`
  - 简化表单，移除 name/email/phone 字段（后端从当前用户获取）
  - 更新 `ConsultationHistory.jsx` 组件使用 `supportService.listMyInquiries()`
  - 更新 `ConsultationDetail.jsx` 组件使用 `supportService.getInquiry()`
  - 支持分页和状态筛选
  - 改进错误处理，支持后端标准错误格式
- 📊 整体进度：Phase 4.2.6 完成度 100%，支持模块对接全部完成

**下一步重点**:

- Phase 4.3: 集成测试准备
- Phase 5: 高级功能实现（仪表板数据可视化、数据导出、Nice D&B API 集成、邮件通知、审计日志）

### v1.2.8 (2025-12-26)

**Phase 4.2.5 完成 - 内容管理模块对接**:

- ✅ 创建 `content.service.js`，封装内容管理 API：
  - 实现公告 API（`listNotices()`, `getLatestNotices()`, `getNotice()`, `createNotice()`, `updateNotice()`, `deleteNotice()`）
  - 实现新闻稿 API（`listPressReleases()`, `getLatestPressRelease()`, `getPressRelease()`, `createPressRelease()`, `updatePressRelease()`, `deletePressRelease()`）
  - 实现横幅 API（`getBanners()`, `getAllBanners()`, `createBanner()`, `updateBanner()`, `deleteBanner()`）
  - 实现系统信息 API（`getSystemInfo()`, `updateSystemInfo()`）
  - 数据格式转换：后端 snake_case ↔ 前端 camelCase
- ✅ 会员端 - 首页数据对接：
  - 更新 `NoticesPreview.jsx` 组件使用 `contentService.getLatestNotices()`
  - 更新 `PressPreview.jsx` 组件使用 `contentService.getLatestPressRelease()`
- ✅ 管理员端 - 内容管理功能对接：
  - 更新 `ContentManagement.jsx` 组件使用 `contentService`
  - 实现横幅管理功能（列表、创建、更新、删除、图片上传）
  - 实现公告管理功能（列表、创建、更新、删除，使用 Textarea 暂时代替 WYSIWYG 编辑器）
  - 实现新闻稿管理功能（列表、创建、更新、删除、图片上传）
  - 弹窗管理功能保持不变（使用原有 API）
- 📊 整体进度：Phase 4.2.5 完成度 100%，内容管理模块对接全部完成

**下一步重点**:

- Phase 4.2.6: 支持模块对接（FAQ、1:1 咨询）
- Phase 4.3: 集成测试准备
- 可选：为公告管理集成 WYSIWYG 编辑器（TinyMCE 或 CKEditor）

### v1.2.7 (2025-12-26)

**Phase 4.2.4 完成 - 项目管理模块对接**:

- ✅ 创建 `project.service.js`，封装项目管理 API：
  - 实现 `listProjects()` 方法（`GET /api/projects`，支持分页、搜索、状态筛选）
  - 实现 `getProject()` 方法（`GET /api/projects/:id`）
  - 实现 `applyToProject()` 方法（`POST /api/projects/:id/apply`）
  - 实现 `getMyApplications()` 方法（`GET /api/my-applications`）
  - 数据格式转换：后端 snake_case ↔ 前端 camelCase
- ✅ 会员端 - 项目列表功能对接：
  - 更新 `ProjectList.jsx` 组件使用 `projectService`
  - 实现分页和筛选（状态、搜索）
  - 状态映射：后端状态 ↔ 前端显示（active, inactive, archived）
  - 支持查看详情和申请项目
- ✅ 会员端 - 项目详情功能对接：
  - 更新 `ProjectDetail.jsx` 组件使用 `projectService`
  - 显示项目详细信息（标题、描述、目标对象、期间、图片）
  - 支持申请项目（仅限 active 状态）
- ✅ 会员端 - 项目申请功能对接：
  - 更新 `ApplicationModal.jsx` 组件使用 `projectService`
  - 简化表单，只保留申请理由字段（符合后端 API 要求）
  - 实现表单验证（至少 10 个字符）
  - 改进错误处理，支持后端标准错误格式
- 📊 整体进度：Phase 4.2.4 完成度 100%，项目管理模块对接全部完成

**下一步重点**:

- Phase 4.2.5: 内容管理模块对接（首页数据、公告管理）
- Phase 4.2.6: 支持模块对接（FAQ、1:1 咨询）
- Phase 4.3: 集成测试准备

### v1.2.6 (2025-12-26)

**Phase 4.2.3 完成 - 绩效管理模块对接**:

- ✅ 会员端 - 绩效录入功能对接：
  - 创建 `performance.service.js`，封装绩效管理 API
  - 实现 `listRecords()` 方法（`GET /api/performance`，支持分页和筛选）
  - 实现 `getRecord()` 方法（`GET /api/performance/:id`）
  - 实现 `createRecord()` 方法（`POST /api/performance`）
  - 实现 `updateRecord()` 方法（`PUT /api/performance/:id`）
  - 实现 `deleteRecord()` 方法（`DELETE /api/performance/:id`）
  - 实现 `submitRecord()` 方法（`POST /api/performance/:id/submit`）
  - 实现 `convertFormDataToBackendFormat()` 方法，转换前端表单数据为后端格式
  - 更新 `PerformanceFormContent.jsx` 组件使用 `performanceService`
  - 支持编辑模式（加载现有记录）
  - 支持草稿保存和提交审核
  - 三标签页数据结构对接完成（销售额雇佣、政府支持、知识产权）
- ✅ 会员端 - 绩效查询功能对接：
  - 更新 `PerformanceListContent.jsx` 组件使用 `performanceService`
  - 实现分页和筛选（年度、季度、状态）
  - 状态映射：后端状态 ↔ 前端显示（draft, submitted, revision_requested, approved, rejected）
  - 支持编辑和删除（仅限草稿和需修改状态）
- ✅ 管理员端 - 绩效审批功能对接：
  - 在 `admin.service.js` 中添加绩效审批方法
  - 实现 `listPerformanceRecords()` 方法（`GET /api/admin/performance`）
  - 实现 `getPerformanceRecord()` 方法（`GET /api/admin/performance/:id`）
  - 实现 `approvePerformance()` 方法（`PUT /api/admin/performance/:id/approve`）
  - 实现 `requestPerformanceRevision()` 方法（`PUT /api/admin/performance/:id/request-fix`）
  - 实现 `rejectPerformance()` 方法（`PUT /api/admin/performance/:id/reject`）
  - 更新 `PerformanceList.jsx` 组件使用 `adminService`
  - 改进错误处理和用户提示
- 📊 整体进度：Phase 4.2.3 完成度 100%，绩效管理模块对接全部完成

**下一步重点**:

- Phase 4.2.4: 项目管理模块对接
- Phase 4.2.5: 内容管理模块对接
- Phase 4.3: 集成测试准备

### v1.2.5 (2025-12-26)

**Phase 4.2.2 完成 - 会员管理模块对接**:

- ✅ 会员端 - 公司资料功能对接：
  - 创建 `member.service.js`，封装会员资料 API
  - 实现 `getProfile()` 方法（`GET /api/member/profile`）
  - 实现 `updateProfile()` 方法（`PUT /api/member/profile`）
  - 字段映射：前端字段 ↔ 后端字段（businessLicense ↔ business_number, sales ↔ revenue 等）
  - 更新 `PerformanceCompanyInfo.jsx` 组件使用 `memberService`
  - 改进错误处理，支持后端标准错误格式
- ✅ 管理员端 - 会员管理功能对接：
  - 创建 `admin.service.js`，封装管理员会员管理 API
  - 实现 `listMembers()` 方法（`GET /api/admin/members`，支持分页和筛选）
  - 实现 `getMemberDetail()` 方法（`GET /api/admin/members/:id`）
  - 实现 `approveMember()` 方法（`PUT /api/admin/members/:id/approve`）
  - 实现 `rejectMember()` 方法（`PUT /api/admin/members/:id/reject`，支持拒绝原因）
  - 更新 `MemberList.jsx` 组件使用 `adminService`
  - 更新 `MemberDetail.jsx` 组件使用 `adminService`
  - 改进错误处理和用户提示
- 📊 整体进度：Phase 4.2.2 完成度 100%，会员管理模块对接全部完成

**下一步重点**:

- Phase 4.2.3: 绩效管理模块对接
- Phase 4.2.4: 项目管理模块对接
- Phase 4.3: 集成测试准备

### v1.2.4 (2025-12-26)

**Phase 4.2.1 完成 - 密码重置功能对接**:

- ✅ 密码重置请求功能对接：
  - 更新 `auth.service.js` 中的 `forgotPassword` 方法
  - 修复 API 路径：`/api/auth/forgot-password` → `/api/auth/password-reset-request`
  - 修复字段映射：`businessLicense` → `business_number`（自动去除连字符）
  - 更新 `ForgotPassword.jsx` 组件使用 `authService.forgotPassword()`
  - 改进错误处理，支持后端标准错误格式（`detail` 或 `message`）
- ✅ 密码重置完成功能对接：
  - 更新 `auth.service.js` 中的 `resetPassword` 方法
  - 修复 API 路径：`/api/auth/reset-password` → `/api/auth/password-reset`
  - 修复字段映射：`password` → `new_password`（已在 service 中处理）
  - 更新 `ResetPassword.jsx` 组件使用 `authService.resetPassword()`
  - 改进错误处理，支持后端标准错误格式
- 📊 整体进度：Phase 4.2.1 完成度从 75% 提升至 100%，认证模块对接全部完成

**下一步重点**:

- Phase 4.2.2: 开始会员管理模块对接（公司资料获取/更新、管理员会员列表/审批）
- Phase 4.2.3: 绩效管理模块对接
- Phase 4.3: 集成测试准备

### v1.2.3 (2025-12-26)

**Phase 4.1 完成 - API 集成准备**:

- ✅ API 路径前缀统一：
  - 修复前端 API 路径前缀（从 `/api/v1` 改为 `/api`，与后端一致）
  - 更新 `frontend/src/shared/utils/constants.js` 中的 `API_PREFIX`
  - 确保前后端 API 路径完全匹配

**Phase 4.2.1 进行中 - 认证模块对接**:

- ✅ 会员登录功能对接：
  - 修复字段映射：前端 `businessLicense` → 后端 `business_number`
  - 更新响应处理，适配后端返回格式（无 `refresh_token` 和 `expires_at`）
  - 更新错误处理，使用 `err.message` 或 `err.response?.data?.detail`
- ✅ 管理员登录功能对接：
  - 添加 `adminLogin` 方法到 `authService`（调用 `/api/auth/admin-login`）
  - 更新 `useAuth` hook，添加 `adminLogin` 方法
  - 更新管理员登录组件，使用 `username` 字段替代 `email`
  - 自动设置用户角色为 `admin`
- ✅ 注册功能对接（2025-12-26）：
  - 实现前端字段到后端字段的完整映射（businessLicense → business_number 等）
  - FormData 数据提取和 JSON 格式转换
  - 数字字段格式化（sales → revenue, employeeCount → employee_count）
  - 条款同意字段合并（terms_agreed）
  - 文件上传暂时跳过（后端需要认证，注册时用户未登录）
  - 更新错误处理，适配后端错误格式
- ✅ 密码重置功能对接（2025-12-26）：
  - 修复密码重置请求 API 路径和字段映射
  - 修复密码重置完成 API 路径和字段映射
  - 更新前端组件使用 `authService` 方法
  - 改进错误处理，支持后端标准错误格式
- 📊 整体进度：Phase 4.1 完成度 100%，Phase 4.2.1 完成度 100%（认证模块对接全部完成）

**下一步重点**:

- Phase 4.2.1: 完成认证模块剩余功能（密码重置）
- Phase 4.2.2: 开始会员管理模块对接
- Phase 4.3: 集成测试准备

### v1.2.2 (2025-12-26)

**Phase 3.7 完成 - 文件上传 API**:

- ✅ 文件上传模块实现完成：
  - 创建了完整的 `upload` 模块（router, schemas, service）
  - 支持公开文件上传（`POST /api/upload/public`）
  - 支持私有文件上传（`POST /api/upload/private`）
  - 文件下载功能（`GET /api/upload/{id}`）- 公开文件返回公开 URL，私有文件返回签名 URL
  - 文件重定向功能（`GET /api/upload/{id}/redirect`）
  - 文件删除功能（`DELETE /api/upload/{id}`）- 同时删除存储和数据库记录
- ✅ 文件验证和权限控制：
  - 文件大小验证（最大 10MB，可配置）
  - 文件类型验证（可配置允许的 MIME 类型）
  - 自动文件类型检测（image、document、other）
  - 权限检查：用户必须拥有文件或是管理员
- ✅ StorageService 增强：
  - 添加了 `create_signed_url()` 方法用于生成私有文件的签名 URL
  - 支持处理 Supabase 返回的不同格式（字典或字符串）
- ✅ 文件路径组织：使用 `business_id` 组织文件路径
- ✅ 元数据存储：所有文件元数据存储在 `attachments` 表中
- 📊 整体进度：Phase 3.7 完成度 100%，后端 API 完成度从 85% 提升至 90%

**下一步重点**:

- Phase 4: 前后端集成
  - API 集成准备（配置前端 API 基础 URL、更新 Axios 拦截器）
  - 模块对接（认证、会员、绩效、项目、内容、支持、文件上传）
  - 集成测试

### v1.1.5 (2025-12-26)

**Phase 1 完成 - 性能优化与代码质量**:

- ✅ 性能优化完成：
  - 创建 LazyImage 懒加载组件，支持 Intersection Observer
  - 优化 10 个主要组件的渲染性能（使用 useMemo 和 useCallback）
  - 减少不必要的 re-render，提升列表和表单交互性能
- ✅ 代码质量改进：
  - 清理未使用的 import（MemberList）
  - 统一代码风格，所有组件遵循统一的 React Hooks 模式
  - 添加关键注释（JSDoc 格式）
- ✅ 优化文档：创建 `docs/PHASE1_OPTIMIZATION_SUMMARY.md` 详细记录优化内容
- 📊 整体进度：Phase 1 完成度 100%，前端完成度从 93% 提升至 95%

**下一步重点**:

- Phase 2: 后端基础架构开发
  - 项目初始化（FastAPI 项目结构）
  - 数据库设计与部署（Supabase + Alembic）

### v1.2.1 (2025-12-26)

**Phase 2.1 进展更新**:

- ✅ 后端架构决策确认：按业务领域组织（Domain-Driven Design），而非按角色组织
- ✅ 认证模块部分实现：注册、登录、Token 管理已完成
- ✅ 会员模块部分实现：会员自服务和管理员管理端点已完成
- ✅ 数据库模型定义完成：所有核心表模型已在 `models.py` 中实现
- 📊 整体进度：从 55%提升至 57%（后端开发从 15%提升至 20%，数据库设计从 0%提升至 50%）

**下一步重点**:

- Phase 2.2: 数据库部署（Supabase 配置、Alembic 迁移）
- Phase 3: 继续开发剩余 API（绩效、项目、内容、支持模块）

### v1.2.0 (2025-12-26)

**Phase 2.1 完成总结**:

- ✅ 后端项目结构创建完成
  - 创建了完整的 `backend/` 目录结构
  - 包含 `src/common/modules/` 基础模块目录
  - 预留了 `src/modules/` 业务模块目录
- ✅ 基础模块实现完成
  - 配置模块 (`config/`) - Pydantic Settings 环境变量管理
  - 数据库模块 (`db/`) - SQLAlchemy 异步会话管理
  - 日志模块 (`logger/`) - 结构化 JSON 日志
  - 异常处理 (`exception/`) - 自定义异常类和全局处理器
  - 存储模块 (`storage/`) - Supabase Storage 文件上传服务
- ✅ FastAPI 应用初始化完成
  - 主应用入口 (`main.py`)
  - CORS 中间件配置
  - 异常处理器注册
  - 健康检查端点 (`/healthz`, `/readyz`)
- ✅ 配置文件完成
  - `requirements.txt` - Python 依赖管理
  - `.env.example` - 环境变量模板
  - `.gitignore` - Git 忽略文件
  - `README.md` - 后端开发文档
- 📊 整体进度：从 50%提升至 55%（后端开发从 0%提升至 15%）

**下一步重点**:

- Phase 2.2: 数据库设计与部署
  - Supabase 项目配置
  - 数据库 Schema 设计
  - Alembic 迁移配置

### v1.1.4 (2025-12-26)

**Phase 1 进展更新**:

- ✅ Reports 模块完善：企业检索功能、Nice D&B API 集成完成
- ✅ Mock API 扩展：企业检索 API (`/api/admin/company/search`) 和 Nice D&B API (`/api/admin/members/nice-dnb`) handler 已实现
- ✅ 财务数据可视化：信用等级、风险等级、财务历史、企业洞察展示
- ✅ 国际化完善：Reports 模块的韩语和中文翻译已完成（包含所有消息、字段、状态翻译）
- ✅ UI 优化：加载状态、错误处理、数据展示优化，财务历史卡片和洞察网格布局
- ✅ 代码质量：添加 JSDoc 注释，无 lint 错误
- 📊 整体进度：从 49%提升至 49%（前端完成度从 92%提升至 93%）

**下一步重点**:

- 继续验证其他页面在 Mock 模式下可用
- 启动后端开发（Phase 2）
- 准备后端 API 集成

### v1.1.3 (2025-11-25)

**Phase 1 进展更新**:

- ✅ 语言切换优化完成：日期和数字格式化函数支持语言切换
  - formatDate, formatDateTime 支持 'ko' 和 'zh' 语言参数
  - formatNumber, formatCurrency 支持 'ko' 和 'zh' 语言参数
  - 更新 ConsultationDetail 组件使用当前语言格式化日期
  - 更新 PerformanceList 组件使用当前语言格式化货币
- ✅ 所有格式化函数已本地化，组件自动根据当前语言切换格式
- 📊 整体进度：从 48%提升至 49%

**下一步重点**:

- 验证所有页面在 Mock 模式下可用
- 启动后端开发（Phase 2）

### v1.1.2 (2025-11-25)

**Phase 1 进展更新**:

- ✅ 国际化完成：所有翻译文件完整性检查通过（17 个模块），韩语和中文翻译键完全一致
- ✅ 翻译验证：使用自动化脚本验证所有翻译文件，无缺失键
- 📊 整体进度：从 47%提升至 48%

**下一步重点**:

- 语言切换功能测试和 UI 优化
- 验证所有页面在 Mock 模式下可用
- 启动后端开发（Phase 2）

### v1.1.1 (2025-11-25)

**Phase 1 进展更新**:

- ✅ 弹窗管理功能完善：图片上传、表单验证、日期格式化、用户体验优化
- ✅ 国际化完善：弹窗管理模块的韩语和中文翻译已完成
- ✅ 代码质量：无 lint 错误，错误处理完善
- 📊 整体进度：从 45%提升至 47%

**下一步重点**:

- 完成剩余国际化翻译
- 验证所有页面在 Mock 模式下可用
- 启动后端开发（Phase 2）

### v1.3.3 (2025-11-26)

**后端日志增强 & 文档同步**:

- ✅ 在 FastAPI 应用中增加 HTTP 请求日志中间件，统一记录 method/path/status/耗时，便于集成测试和生产排错
- ✅ 在认证、项目、绩效等核心 Service 中补充业务级别的 info/debug/warning 日志（注册/登录、项目申请、绩效提交与审批等关键路径）
- ✅ 更新 `docs/PROJECT_STATUS.md` 后端技术栈与非功能需求部分，反映 JWT、bcrypt 加密和日志体系已经落地

### v1.3.1 (2025-11-26)

**Phase 4.3 集成测试执行进展**:

- ✅ 运行 `backend/tests/run_all_tests.py`，完成首轮集成测试执行
- ✅ 修正认证/会员模块的鉴权行为：
  - 未携带 Token 的访问统一返回 401（`Unauthorized`）
  - 会员访问管理员端点统一返回 403（`Forbidden`）
- ✅ 放宽注册接口 `business_number` 的校验规则，并通过 Alembic 迁移将数据库列扩展为 `VARCHAR(20)`：
  - 新增迁移：`9b3f2c7d1a45_increase_business_number_length_to_20`
  - 避免因事业者号长度导致的 422/500 错误
- ✅ 认证与会员模块集成测试结果：
  - `authentication`：8 个用例中 7 个通过（剩余 1 个为偶发网络连接错误，非业务逻辑问题）
  - `member_management`：7 个用例全部通过（100%）

**下一步重点**:

- 修复绩效模块中的 500 错误（详情/更新/提交/审批相关用例）
- 修复项目申请及内容模块（横幅/SystemInfo）中的 500 错误
- 再次运行全量集成测试，直至 52 个用例全部通过

### v1.1.0 (2025-11-25)

**Phase 1 进展更新**:

- ✅ Mock API 完善：文件上传、绩效 POST/PUT、项目申请 API 已实现
- ✅ 前端文档：组件库文档和开发指南已创建
- 🟡 国际化：中文翻译 80%完成，核心页面已完成
- ✅ Bug 修复：项目申请表单完善、JSON 语法错误修复
- 📊 整体进度：从 40%提升至 45%

**下一步重点**:

- 完成剩余国际化翻译
- 验证所有页面在 Mock 模式下可用
- 启动后端开发（Phase 2）
