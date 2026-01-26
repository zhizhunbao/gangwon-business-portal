# GangwonBiz Portal - 系统架构文档

## 系统概述

- **项目定位**：面向江原特别自治道创业企业的一站式业务与绩效管理门户，覆盖企业会员端与平台管理员端。
- **核心目标**：提升企业绩效采集效率、规范项目申报与资料管理、沉淀可追溯的数据资产、为管理部门提供实时监控与决策支撑。
- **主要角色**：访客（宣传页）、企业会员（数据录入/查询/项目申报）、平台管理员（审批、内容与绩效管理）、系统运营人员（配置及运维）。
- **运行环境**：前端采用 Vite + React 18（函数组件 + Hooks），后端基于 FastAPI + PostgreSQL（Supabase 托管），通过统一的认证与日志体系保障安全与可观测性。

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
| Messages    | `frontend/src/admin/modules/messages`    | **站内信系统**：消息线程管理、群发消息、消息统计分析、消息模板管理                                               |
| Content     | `frontend/src/admin/modules/content`     | 主横幅、滚动横幅、新闻、FAQ、系统介绍等静态页维护（**已移除弹窗管理**）                                        |
| Settings    | `frontend/src/admin/modules/settings`    | 系统配置管理（业务领域、产业合作领域、知识产权分类）、<br />条款管理（使用条款、个人信息收集等）、JSON配置维护 |
| Reports     | `frontend/src/admin/modules/reports`     | 统计报表、Excel/CSV 导出、打印模板配置                                                                         |
| Audit-logs  | `frontend/src/admin/modules/audit-logs` | 审计日志查询、应用日志查看、异常记录管理、按来源/级别/时间筛选、异常标记为已解决、日志导出                     |

### 更新的Admin模块JSX组件架构

基于站内信系统需求，Admin模块组件架构已更新：

#### Messages模块 (站内信系统) - 高优先级

```jsx
// 完整的站内信通信系统
- Messages.jsx (消息主页) ✅
- MessageList.jsx (消息列表) ✅  
- SendMessage.jsx (发送消息) ✅
- MessageThread.jsx (消息会话详情) ✅ 已实现
- MessageComposer.jsx (富文本消息编辑器) ✅ 已实现
- BroadcastMessage.jsx (群发消息功能) ✅ 已实现
- MessageAnalytics.jsx (消息统计分析) ✅ 已实现
- UnreadBadge.jsx (未读消息徽章) ✅ 已实现
```

#### Content模块 (内容管理)

```jsx
- ContentManagement.jsx (内容管理主页) ✅
- NoticeManagement.jsx (公告管理) ✅
- NewsManagement.jsx (新闻管理) ✅
- BannerManagement.jsx (横幅管理) ✅
- SystemInfoManagement.jsx (系统介绍管理) ✅ 已实现
- FAQManagement.jsx (FAQ管理) ✅ 已实现
```

#### 其他模块保持不变
- Dashboard模块 ✅ 已完成
- Members模块 ✅ 基本完成
- Performance模块 ✅ 基本完成  
- Projects模块 ✅ 基本完成
- Reports模块 🔄 需要完善
- Settings模块 🔄 需要完善
- Audit-logs模块 ✅ 基本完成

#### 实现状态

**已完成的核心模块**：
- ✅ Dashboard模块 - 企业状态概览和关键指标
- ✅ Members模块 - 企业管理和审批
- ✅ Performance模块 - 绩效数据审核和管理
- ✅ Projects模块 - 项目和申请管理
- ✅ Messages模块 - 站内信系统
- ✅ Content模块 - 内容管理（公告、新闻、横幅、FAQ、系统介绍）
- ✅ Audit-logs模块 - 审计日志查看
- ✅ Reports模块 - 基础报表功能
- ✅ Settings模块 - 基础系统设置

**功能完整性**：
所有PRD要求的核心功能已实现，满足业务需求。

### 共享层

| 模块       | 目录建议                           | 主要职责                                        |
| ---------- | ---------------------------------- | ----------------------------------------------- |
| Components | `frontend/src/shared/components` | UI 基础组件（表格、表单、图表、上传）、业务组件 |
| Hooks      | `frontend/src/shared/hooks`      | 通用逻辑（认证守卫、表单校验、文件上传、分页）  |
| Stores     | `frontend/src/shared/stores`     | Zustand 状态管理（认证状态、UI状态、全局配置）  |
| Services   | `frontend/src/shared/services`   | Axios 客户端封装、API 定义、缓存策略  |
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
| DB          | `backend/src/common/modules/db`        | SQLAlchemy ORM、异步 Session、Alembic 迁移管理                                                         |
| Storage     | `backend/src/common/modules/storage`   | 统一文件上传下载、按企业ID分类存储、文件名转换、附件生命周期管理                                       |
| Auth        | `backend/src/modules/user`             | JWT/OAuth2 认证、角色权限、密码策略                                                                    |
| Member      | `backend/src/modules/member`           | 企业资料CRUD、审批流、Nice D&B API 调用、企业信息维护                                                  |
| Project     | `backend/src/modules/project`          | 项目/公告 CRUD、附件存储、申报审批流程                                                                 |
| Performance | `backend/src/modules/performance`      | 绩效数据模型（销售雇佣/政府支持/知识产权）、提交流程、审批与补正、统计接口                             |
| Messages    | `backend/src/modules/messages`         | **站内信系统**：消息线程管理、群发消息、消息统计、消息模板                                              |
| Support     | `backend/src/modules/support`          | FAQ、1:1 咨询、通知、工单状态跟踪                                                                      |
| Content     | `backend/src/modules/content`          | 主横幅、滚动横幅、新闻资料、系统介绍等静态页面、条款内容管理、可视化内容发布                           |
| Settings    | `backend/src/modules/settings`         | 系统配置项CRUD、业务领域配置、产业合作领域配置、知识产权分类配置、条款版本管理、JSON配置导入导出       |
| Report      | `backend/src/modules/report`           | 指标聚合、仪表盘数据、Excel/CSV 导出、打印模板                                                         |
| Integration | `backend/src/modules/integration`      | 第三方服务封装（Nice D&B、邮件服务、短信、推送、韩国地址搜索API）                                      |

## 数据层设计

- **数据库**：PostgreSQL（Supabase）。采用命名空间 `public`，核心表包括 `members`、`member_profiles`、`projects`、`project_applications`、`performance_records`、`performance_reviews`、`message_threads`、`thread_messages`、`message_attachments`、`broadcast_messages`、`broadcast_recipients`、`broadcast_attachments`、`attachments`、`notices`、`faqs`、`inquiries`、`audit_logs`、`app_logs`。
- **数据库迁移**：使用 Alembic 进行版本化管理，迁移文件位于 `backend/alembic/versions/`，包括初始 schema 和后续的增量迁移。
- **关系约束**：
  - `members` 与 `performance_records` 为一对多，审批记录存储在 `performance_reviews`。
  - **站内信系统**：`message_threads` 与 `thread_messages` 为一对多，`broadcast_messages` 与 `broadcast_recipients` 为一对多，消息附件通过 `message_attachments` 和 `broadcast_attachments` 管理。
  - 附件统一挂载至 `attachments`，通过 `resource_type` + `resource_id` 建立多态关联。
- **缓存**：根据业务需求可引入 Redis 缓存热点配置、统计结果与验证码。
- **对象存储**：附件与横幅图像通过 Supabase Storage，使用分目录策略按企业与功能分级。

## 集成与接口

- **Nice D&B API**：管理员在企业审批与代表人检索时调用，采用 API Key 验证。
- **邮件服务**：发送注册审批、绩效补正、项目通知、密码重置。使用 SMTP 协议（支持 Gmail/Outlook/SendGrid/AWS SES 等）。
- **SMS 服务**：待实现，可接入 AWS SNS 或国内第三方服务，接口封装在 Integration 模块。
- **认证网关**：所有接口需携带 Bearer Token；公共内容提供匿名访问版本（公告列表、FAQ）。
- **健康检查接口**：提供 `/healthz` 端点用于服务健康检查。

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
- **异步化**：后端 IO 操作（数据库、HTTP 请求）默认使用异步。
- **业务专注**：业务代码专注核心逻辑，不包含日志记录、异常处理、降级逻辑等基础设施代码。
- **响应格式**：前端响应包装为 `{ code, message, data }`，保持接口一致性。

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
- ❌ 业务代码不添加日志记录、try-catch 异常处理、fallback 降级逻辑。
- ✅ 专注核心业务逻辑实现、代码可读性与可维护性。
- ✅ 关键业务流程需提供设计文档与接口契约。
- ✅ 保持代码简洁，避免过度工程化。

## 设计风格约束

- 前端 UI 遵循简洁行政门户风格，主色系参考江原特别自治道官方规范，支持浅色主题。
- 组件需响应式适配桌面与平板端，移动端提供精简视图或跳转主站。
- 图表展示统一使用同色系渐变，重要指标提供数值 + 趋势线。
- 表单交互提供即时校验、错误提示与帮助文案，提高填报效率。
