# GangwonBiz Portal - 系统架构文档

## 系统概述

- **项目定位**：面向江原特别自治道创业企业的一站式业务与绩效管理门户，覆盖企业会员端与平台管理员端。
- **核心目标**：提升企业绩效采集效率、规范项目申报与资料管理、沉淀可追溯的数据资产、为管理部门提供实时监控与决策支撑。
- **主要角色**：访客（宣传页）、企业会员（数据录入/查询/项目申报）、平台管理员（审批、内容与绩效管理）、系统运营人员（配置及运维）。
- **运行环境**：前端采用 Vite + React 18（函数组件 + Hooks），后端基于 FastAPI + PostgreSQL（Supabase 托管），通过统一的认证与日志体系保障安全与可观测性。

## 项目 Spec 规划

本项目采用 Spec 驱动开发方法，将系统功能和架构标准化为 8 个独立的 Spec 文档。每个 Spec 包含需求文档（requirements.md）、设计文档（design.md）和任务列表（tasks.md）。

### Spec 列表

#### 已完成的 Spec（4个）✅

1. **backend-architecture-standards** ✅
   - **位置**: `.kiro/specs/backend-architecture-standards/`
   - **目标**: 规范后端代码结构、API 设计、数据库模型、错误处理、日志记录
   - **覆盖**: 项目结构、模块组织、RESTful API 规范、数据库设计模式、异常处理、代码风格

2. **frontend-architecture-standards** ✅
   - **位置**: `.kiro/specs/frontend-architecture-standards/`
   - **目标**: 规范前端代码结构、组件设计、状态管理、路由配置、样式规范
   - **覆盖**: 项目结构、组件模式、Zustand 状态管理、React Router 配置、国际化、响应式设计

3. **authentication-and-authorization** ✅
   - **位置**: `.kiro/specs/authentication-and-authorization/`
   - **目标**: 实现安全的认证授权系统，支持 JWT、角色权限、密码策略
   - **覆盖**: 用户认证、JWT Token 管理、角色权限控制、密码策略、会话管理、Token 黑名单

4. **file-storage-and-management** ✅
   - **位置**: `.kiro/specs/file-storage-and-management/`
   - **目标**: 实现完整的文件存储管理系统，支持上传、下载、验证、生命周期管理
   - **覆盖**: 文件上传（公开/私有）、文件验证、文件下载、图片处理、文件组织、版本控制

#### 待创建的 Spec（4个）📋

5. **logging-and-monitoring** 📋
   - **位置**: `.kiro/specs/logging-and-monitoring/`
   - **目标**: 建立统一的日志和监控系统，支持前后端日志收集、异常追踪、性能监控
   - **覆盖**: 
     - 结构化日志（JSON 格式）
     - 前后端日志统一收集
     - 异常追踪和管理
     - 日志查询和导出
     - 性能监控指标
     - 告警机制
   - **优先级**: P0（系统可观测性核心需求）

6. **audit-and-compliance** 📋
   - **位置**: `.kiro/specs/audit-and-compliance/`
   - **目标**: 实现审计日志系统，满足合规要求（PIPA - 韩国个人信息保护法）
   - **覆盖**:
     - 审计日志记录（操作、用户、时间、IP）
     - 审计日志查询和筛选
     - 审计日志导出
     - 审计日志统计分析
     - 数据保留策略（7年）
     - 合规性报告
   - **优先级**: P0（法律合规要求）

7. **integration-services** 📋
   - **位置**: `.kiro/specs/integration-services/`
   - **目标**: 统一管理第三方服务集成，提供标准化的集成接口和错误处理
   - **覆盖**:
     - Nice D&B API 集成（企业信息验证）
     - 邮件服务（SMTP，支持多提供商）
     - SMS 服务（待实现）
     - 韩国地址搜索 API（Daum Postcode）
     - 统一的错误处理和重试机制
     - API 调用监控和日志
   - **优先级**: P1（提升系统集成质量）

8. **settings-and-configuration** 📋
   - **位置**: `.kiro/specs/settings-and-configuration/`
   - **目标**: 实现动态配置管理系统，支持业务配置的灵活调整
   - **覆盖**:
     - 业务领域配置（Business Field）
     - 产业合作领域配置（Industry Cooperation）
     - 知识产权分类配置（IP Classification）
     - 条款版本管理（Terms & Conditions）
     - JSON 配置导入导出
     - 配置缓存和更新机制
     - 前端配置加载服务
   - **优先级**: P1（业务灵活性需求）

### Spec 开发流程

每个 Spec 遵循以下开发流程：

1. **需求阶段** - 编写 `requirements.md`
   - 使用 EARS 模式编写验收标准
   - 遵循 INCOSE 语义质量规则
   - 定义用户故事和验收标准

2. **设计阶段** - 编写 `design.md`
   - 架构设计和组件接口
   - 数据模型设计
   - 正确性属性定义（Property-Based Testing）
   - 错误处理策略
   - 测试策略

3. **实施阶段** - 编写 `tasks.md`
   - 将设计转换为可执行任务
   - 任务包含实现和测试
   - 支持增量开发
   - 可选任务标记（*）

### Spec 依赖关系

```
backend-architecture-standards ─┐
                                ├─→ authentication-and-authorization
frontend-architecture-standards ─┘

authentication-and-authorization ─→ file-storage-and-management

backend-architecture-standards ─┐
                                ├─→ logging-and-monitoring
frontend-architecture-standards ─┘

logging-and-monitoring ─→ audit-and-compliance

backend-architecture-standards ─→ integration-services

backend-architecture-standards ─┐
                                ├─→ settings-and-configuration
frontend-architecture-standards ─┘
```

### Spec 优先级

- **P0（核心基础）**: 
  - backend-architecture-standards ✅
  - frontend-architecture-standards ✅
  - authentication-and-authorization ✅
  - file-storage-and-management ✅
  - logging-and-monitoring 📋
  - audit-and-compliance 📋

- **P1（重要增强）**:
  - integration-services 📋
  - settings-and-configuration 📋

## 核心业务流程

1. **访问与注册**：企业通过江原创业门户横幅进入系统，提交营业执照信息注册账号，等待管理员审批。
2. **企业侧操作**：登录后浏览公告、申报项目、上报季度/年度绩效数据、维护企业基本信息，并可跟踪审批状态。
3. **管理员审核**：管理员在后台审批企业入驻、处理绩效补正/批准、发布公告和横幅、维护咨询与 FAQ 内容。
4. **数据沉淀与导出**：所有 Approved 数据进入统计区，提供仪表盘图表与 Excel 导出，同时为 Nice D&B API 检索、绩效分析等能力提供数据支持。

## 架构总览

- **逻辑分层**：
  - 表现层（Member Web / Admin Web）
  - 应用层（FastAPI 服务、任务编排、权限控制）
  - 领域层（企业、项目、绩效、内容管理领域模型）
  - 基础设施层（PostgreSQL、对象存储、第三方 API、日志与监控）
- **组件交互示意**：
  ```
  [Member SPA]        [Admin SPA]
        \                /
         \  HTTPS / REST /
           [API Gateway / FastAPI]
                   |
          -----------------------
          |  PostgreSQL (Supabase)
          |  Object Storage (附件)
          |  Nice D&B API
          |  Mail/SMS Service
  ```
- **部署拓扑（建议）**：静态前端通过 CDN 托管（如 Vercel/S3 + CloudFront），反向代理（Nginx）转发至 FastAPI（Uvicorn + Gunicorn）。数据库与对象存储使用 Supabase 托管的 PostgreSQL 与 Storage，定时任务可运行在 Supabase Edge Functions 或独立的 Celery/Serverless 任务中。
- **非功能性要求**：
  - 可用性 ≥ 99%（工作时间），关键接口需具备健康检查与熔断策略。
  - 数据安全：企业敏感数据静态加密（Supabase 加密磁盘）、传输 HTTPS、凭证采用 PBKDF2/SHA256。
  - 审计能力：登录、审批、数据更改需写入审计日志。
  - 可观测性：统一结构化日志 + Prometheus/OpenTelemetry 指标，严重错误触发告警。

## 前端架构

- **整体结构**：单个 Vite 项目，所有前端源文件集中在 `frontend/src/`。按照 `member/`（企业会员端）、`admin/`（管理员端）与 `shared/`（共享层）三层划分，统一通过 Vite 构建并复用组件库、API 客户端、样式与国际化资源。`frontend/index.html` + `frontend/src/main.jsx` 作为单入口，使用路径别名（如 `@shared`、`@member`、`@admin`）提升可维护性。
- **状态管理**：使用 Zustand 管理跨页面状态（轻量、简洁、无样板代码），配合 TanStack Query（React Query）处理服务端数据缓存与同步。React Router DOM 实现模块化路由，支持基于角色的路由守卫与动态菜单。
- **国际化**：基于 react-i18next 提供韩/中文切换，静态资源与文案集中存放于 `shared/i18n`。

### 企业会员端模块

| 模块        | 目录建议                                    | 主要职责                                                                         |
| ----------- | ------------------------------------------- | -------------------------------------------------------------------------------- |
| Auth        | `frontend/src/member/modules/auth`        | 登录、注册、找回账号、整合审批中提示与密码策略校验                               |
| Home        | `frontend/src/member/modules/home`        | 个人化首页、横幅轮播、最新公告、项目快捷入口                                     |
| Profile     | `frontend/src/member/modules/profile`     | 企业基本信息维护、企业资料修改 （营业执照号不可修改）、附件更新                  |
| About       | `frontend/src/member/modules/about`       | 系统介绍、常见问题、运营方联系方式                                               |
| Projects    | `frontend/src/member/modules/projects`    | 公告列表、详情与附件、项目在线申报流程                                           |
| Performance | `frontend/src/member/modules/performance` | 绩效数据录入（销售雇佣/政府支持/知识产权）、<br />提交、草稿管理、状态查询、导出 |
| Support     | `frontend/src/member/modules/support`     | 1:1 咨询、FAQ、工单跟踪、通知中心                                                |

### 管理员端模块

| 模块        | 目录建议                                   | 主要职责                                                                                                       |
| ----------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Dashboard   | `frontend/src/admin/modules/dashboard`   | 企业现况看板、关键指标图表、公告提醒                                                                           |
| Members     | `frontend/src/admin/modules/members`     | 企业入驻审批、检索、Nice D&B API 查询、资料维护                                                                |
| Performance | `frontend/src/admin/modules/performance` | 绩效数据审核、补正、修改、导出、批量操作                                                                       |
| Projects    | `frontend/src/admin/modules/projects`    | 项目创建、公告管理、资料附件、批量发布                                                                         |
| Content     | `frontend/src/admin/modules/content`     | 主横幅、滚动横幅、弹窗、新闻、FAQ、系统介绍等静态页维护                                                        |
| Settings    | `frontend/src/admin/modules/settings`    | 系统配置管理（业务领域、产业合作领域、知识产权分类）、<br />条款管理（使用条款、个人信息收集等）、JSON配置维护 |
| Reports     | `frontend/src/admin/modules/reports`     | 统计报表、Excel/CSV 导出、打印模板配置                                                                         |
| Logging     | `frontend/src/admin/modules/logging`    | 应用日志查询、异常记录查看、按来源/级别/时间筛选、异常标记为已解决、日志导出                               |

### 共享层

| 模块       | 目录建议                           | 主要职责                                        |
| ---------- | ---------------------------------- | ----------------------------------------------- |
| Components | `frontend/src/shared/components` | UI 基础组件（表格、表单、图表、上传）、业务组件 |
| Hooks      | `frontend/src/shared/hooks`      | 通用逻辑（认证守卫、表单校验、文件上传、分页）  |
| Stores     | `frontend/src/shared/stores`     | Zustand 状态管理（认证状态、UI状态、全局配置）  |
| Services   | `frontend/src/shared/services`   | Axios 客户端封装、API 定义、错误处理、缓存策略、日志与异常上报服务（logging.service.js）  |
| Styles     | `frontend/src/shared/styles`     | 基础样式、主题变量、BEM 规范样式库              |
| Utils      | `frontend/src/shared/utils`      | 辅助函数、常量、权限工具、日期与数字格式化      |
| i18n       | `frontend/src/shared/i18n`       | 语言资源、语言切换逻辑、动态文案加载            |

### Mock 数据层（开发阶段）

在后端 API 未完成前，使用 **MSW (Mock Service Worker)** 模拟接口数据，使前端开发不依赖后端进度。

| 模块     | 目录建议                          | 主要职责                                   |
| -------- | --------------------------------- | ------------------------------------------ |
| Data     | `frontend/src/mocks/data`       | 静态 JSON 数据（企业、项目、绩效、内容等） |
| Handlers | `frontend/src/mocks/handlers`   | MSW 请求拦截器（模拟 REST API 响应）       |
| Browser  | `frontend/src/mocks/browser.js` | 浏览器环境 Mock 配置（开发模式启用）       |
| Server   | `frontend/src/mocks/server.js`  | Node 环境 Mock 配置（单元测试使用，可选）  |
| Config   | `frontend/src/mocks/config.js`  | Mock 开关、延迟配置、错误模拟              |

**使用方式**：

- 开发阶段：在 `main.jsx` 中条件启用 MSW Browser Worker
- API 就绪后：通过环境变量 `VITE_USE_MOCK=false` 切换到真实接口
- 无需修改业务代码，切换完全透明

## 后端架构

- **框架**：FastAPI 0.115+ + Uvicorn，依赖注入管理配置、数据库 Session、第三方客户端。
- **数据库**：SQLAlchemy 2.0+ 异步 ORM + asyncpg 驱动，通过 `async_sessionmaker` 管理连接池与事务。
- **接口风格**：RESTful API + WebSocket（实时通知/审批进度），遵循 `/api/v1` 前缀与 OpenAPI 规范。
- **任务调度**：对于审批提醒、数据校验与报表生成，使用 APScheduler（轻量级后台任务）+ Supabase Edge Functions（定时触发）。

### 核心模块

| 模块        | 目录建议                                 | 主要职责                                                                                               |
| ----------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Config      | `backend/src/common/modules/config`    | 环境变量加载、业务配置JSON管理、特性开关、外部服务地址管理                                             |
| Logger      | `backend/src/common/modules/logger`    | **已实现** 结构化日志（JSON格式）、标准化 Logger 命名（完整模块路径）、追踪 ID 注入、日志采集管道、符合行业标准（结构化日志、上下文信息、日志轮转、双重存储） |
| Exception   | `backend/src/common/modules/exception` | 统一异常、HTTP 错误转换、业务错误码                                                                    |
| Logging     | `backend/src/common/modules/logging`   | **已实现** 应用日志与异常记录、前后端日志统一存储、日志查询API、异常追踪与解决状态管理                             |
| Audit       | `backend/src/common/modules/audit`     | 审计日志记录与查询（操作记录、IP、UA）                                                                 |
| DB          | `backend/src/common/modules/db`        | SQLAlchemy ORM、异步 Session、Alembic 迁移管理                                                         |
| Storage     | `backend/src/common/modules/storage`   | 统一文件上传下载、按企业ID分类存储、<br />文件名转换、附件生命周期管理、旧文件清理                     |
| Auth        | `backend/src/modules/user`             | JWT/OAuth2 认证、角色权限、密码策略、审计日志                                                          |
| Member      | `backend/src/modules/member`           | 企业资料CRUD、审批流、Nice D&B API 调用、企业信息维护                                                  |
| Project     | `backend/src/modules/project`          | 项目/公告 CRUD、附件存储、申报审批流程                                                                 |
| Performance | `backend/src/modules/performance`      | 绩效数据模型（销售雇佣/政府支持/知识产权）、<br />提交流程、审批与补正、统计接口                       |
| Support     | `backend/src/modules/support`          | FAQ、1:1 咨询、通知、工单状态跟踪                                                                      |
| Content     | `backend/src/modules/content`          | 主横幅、滚动横幅、弹窗、新闻资料、<br />系统介绍等静态页面、条款内容管理、可视化内容发布               |
| Settings    | `backend/src/modules/settings`         | 系统配置项CRUD、业务领域配置、产业合作领域配置、<br />知识产权分类配置、条款版本管理、JSON配置导入导出 |
| Report      | `backend/src/modules/report`           | 指标聚合、仪表盘数据、Excel/CSV 导出、打印模板                                                         |
| Integration | `backend/src/modules/integration`      | 第三方服务封装 （Nice D&B、邮件服务已实现、短信、推送、韩国地址搜索API）                                         |

## 数据层设计

- **数据库**：PostgreSQL（Supabase）。采用命名空间 `public`，核心表包括 `members`、`member_profiles`、`projects`、`project_applications`、`performance_records`、`performance_reviews`、`attachments`、`notices`、`faqs`、`inquiries`、`audit_logs`、`application_logs`、`application_exceptions`。
- **数据库迁移**：使用 Alembic 进行版本化管理，迁移文件位于 `backend/alembic/versions/`，包括初始 schema 和后续的增量迁移（如 `add_application_logs_and_exceptions_tables.py`）。
- **关系约束**：
  - `members` 与 `performance_records` 为一对多，审批记录存储在 `performance_reviews`。
  - 附件统一挂载至 `attachments`，通过 `resource_type` + `resource_id` 建立多态关联。
  - 审计日志记录操作主体、资源、动作、IP、UA。
  - `application_logs` **已实现**：记录前后端应用日志，包含日志级别（DEBUG/INFO/WARNING/ERROR/CRITICAL）、来源（backend/frontend）、标准化 Logger 名称（完整模块路径，如 `src.main`、`src.common.modules.logger.startup`）、模块、函数、行号、请求信息等字段。支持 `user_id` 类型自动转换（字符串/数字），通过 `source`、`level`、`trace_id`、`user_id`、`created_at` 建立索引，优化查询性能。符合行业标准的结构化日志设计。
  - `application_exceptions` **已实现**：记录前后端异常，包含异常类型、异常消息、堆栈跟踪、错误码、HTTP 状态码、请求信息等字段。支持 `user_id` 类型自动转换（字符串/数字），支持 `resolved` 状态标记（true/false）、解析人员（resolved_by）、解析时间和解析备注。通过 `source`、`exception_type`、`trace_id`、`user_id`、`resolved`、`created_at` 建立索引，便于异常追踪与问题解决。
- **缓存**：根据业务需求可引入 Redis 缓存热点配置、统计结果与验证码。
- **对象存储**：附件与横幅图像通过 Supabase Storage，使用分目录策略按企业与功能分级。

## 集成与接口

- **Nice D&B API**：管理员在企业审批与代表人检索时调用，采用 API Key 验证，结果缓存 24 小时，失败时回退人工输入。
- **邮件服务** **已实现**：发送注册审批、绩效补正、项目通知、密码重置。使用 SMTP 协议（支持 Gmail/Outlook/SendGrid/AWS SES 等），位置：`backend/src/common/modules/email/`，已集成到 user、member、performance 模块。
- **SMS 服务**：待实现，可接入 AWS SNS 或国内第三方服务，接口封装在 Integration 模块。
- **认证网关**：所有接口需携带 Bearer Token；公共内容提供匿名访问版本（公告列表、FAQ）。
- **审计与监控接口**：提供 `/healthz`、`/metrics` 端点，Prometheus 抓取指标，Grafana 展示。
- **日志与异常查询接口** **已实现**：提供 `/api/v1/logging/logs`（查询应用日志）、`/api/v1/exceptions`（查询异常记录）端点，支持按来源（backend/frontend）、级别、异常类型、时间范围、用户ID、trace_id 等条件查询。管理员可标记异常为已解决状态，前端可通过 `/api/v1/logging/frontend/logs` 和 `/api/v1/exceptions/frontend` 端点上报日志和异常。所有查询接口需要管理员权限，上报接口无需认证（生产环境应添加速率限制）。前端日志和异常上报支持 `user_id` 的数字类型自动转换。

## 配置文件

### 前端配置

| 文件名         | 路径                        | 主要职责                                 |
| -------------- | --------------------------- | ---------------------------------------- |
| package.json   | `frontend/package.json`   | 项目依赖管理、脚本命令、元信息           |
| vite.config.js | `frontend/vite.config.js` | Vite 构建配置（别名、代理、splitChunks） |
| .env.local     | `frontend/.env.local`     | API 基址、WebSocket 地址、SENTRY_KEY     |
| .gitignore     | `frontend/.gitignore`     | Git 忽略文件配置                         |
| index.html     | `frontend/index.html`     | 应用入口 HTML                            |
| main.jsx       | `frontend/src/main.jsx`   | React 入口、根组件挂载、全局样式加载     |

### 后端配置

| 文件名           | 路径                         | 主要职责                                   |
| ---------------- | ---------------------------- | ------------------------------------------ |
| requirements.txt | `backend/requirements.txt` | Python 依赖列表                            |
| pyproject.toml   | `backend/pyproject.toml`   | （可选）Poetry/PEP 621 项目信息与依赖管理  |
| .env.local       | `backend/.env.local`       | 数据库、JWT Secret、外部服务密钥           |
| .gitignore       | `backend/.gitignore`       | Git 忽略文件配置                           |
| main.py          | `backend/src/main.py`      | FastAPI 应用入口、路由注册、CORS、异常处理 |
| alembic.ini      | `backend/alembic.ini`      | 数据库迁移配置 （若使用 Alembic）          |

## 代码风格

- **组织结构**：导入 → 常量与配置 → 数据模型 → 业务逻辑 → 接口层，模块化划分便于替换。
- **类型与注释**：Python 强制类型注解 + docstring，前端在关键逻辑中使用 JSDoc 注释，保持 API 类型文件同步。
- **异步化**：后端 IO 操作（数据库、HTTP 请求）默认使用异步，前端与后端均需处理 Cancellation/Timeout。
- **错误处理**：统一错误枚举 + 错误码，前端响应包装为 `{ code, message, data }`，后端日志记录 stacktrace。

## 技术栈

| 分类             | 技术栈                                                                                                                                                   |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **前端**   | Vite 6.x、React 18.3+、Zustand 5.x、TanStack Query 5.x、React Router DOM 6.x、Axios 1.x、ECharts 5.x、Tailwind CSS 3.x、react-i18next 15.x               |
| **后端**   | FastAPI 0.115+、SQLAlchemy 2.0+（异步 ORM）、asyncpg（PostgreSQL 异步驱动）、Pydantic 2.x、Python 3.11+、Uvicorn + Gunicorn、HTTPX、Authlib、APScheduler |
| **数据层** | Supabase PostgreSQL、Supabase Storage、Supabase Migrations                                                                                               |
| **运维**   | Docker、GitHub Actions（CI/CD）、Sentry（错误追踪）、Prometheus + Grafana（监控）                                                                        |

## 命名规范

### 后端命名规范（Python）

- **目录**：全小写蛇形（`modules/`, `project_service/`）。
- **文件**：蛇形（`settings.py`, `project_service.py`）。
- **类**：帕斯卡命名（`Settings`, `ProjectService`）。
- **函数/变量**：蛇形（`create_project()`, `project_name`）。
- **常量**：全大写蛇形（`MAX_FILE_SIZE`）。
- **私有成员**：单下划线 `_internal`，强私有双下划线 `__state`。
- **Pydantic Schema**：帕斯卡 + 后缀（`ProjectCreate`, `ProjectResponse`）。

### 前端命名规范（React/JavaScript）

- **目录**：公共目录使用蛇形，组件目录使用帕斯卡命名。
- **组件文件**：帕斯卡（`ProjectList.jsx`），组件导出默认函数组件。
- **JavaScript 文件**：驼峰（`router.js`, `apiClient.js`）。
- **样式文件**：与组件同名 SCSS，或全局 `index.scss`。
- **函数/变量**：小驼峰，布尔使用 `is/has/should` 前缀。
- **Hooks**：`use` 前缀（`useAuth`, `useUpload`）。
- **Zustand Store**：文件 `store.js`，store 导出使用 `use` 前缀（`useAuthStore`、`useProjectStore`）。
- **路由 name**：小驼峰（`projectList`），path 使用短横线（`/project-list`）。
- **国际化键**：小驼峰或点分隔（`project.list.title`）。
- **样式命名**：BEM（`.project-card`, `.project-card__title`）。

### 数据库命名

- 数据库/Schema：蛇形。
- 表名：复数蛇形（`performance_records`）。
- 字段名：蛇形（`created_at`）。
- 主键：`id`，外键：`<entity>_id`。
- 布尔：`is_`/`has_` 前缀。
- 时间戳：`_at` 后缀。
- 索引：`idx_<table>_<column>`，唯一约束：`uq_<table>_<column>`，外键约束：`fk_<table>_<ref_table>_<column>`。

## 项目约束

- ❌ 不引入自动化测试/代码检查/代码格式化工具，依赖人工 Code Review 与自测。
- ❌ 前端保持纯 JavaScript，不使用 TypeScript。
- 关注核心业务实现、代码可读性与可维护性。
- 关键业务流程需提供设计文档与接口契约。

## 设计风格约束

- 前端 UI 遵循简洁行政门户风格，主色系参考江原特别自治道官方规范，支持浅色主题。
- 组件需响应式适配桌面与平板端，移动端提供精简视图或跳转主站。
- 图表展示统一使用同色系渐变，重要指标提供数值 + 趋势线。
- 表单交互提供即时校验、错误提示与帮助文案，提高填报效率。
