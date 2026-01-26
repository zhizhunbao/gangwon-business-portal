# Skills 索引

所有 skills 统一管理在 `../../.agent/skills/` 目录下。本文件提供快速索引和分类。

## 📂 Skills 位置

所有 skills 实际存储在：`../../.agent/skills/`

---

## 🗂️ Skills 完整列表

### 💻 全栈开发 (Full-Stack Development)

#### 前端 (Frontend)

##### 1. **frontend-patterns** - 通用 React 前端模式
   - **路径**: [../../.agent/skills/frontend-patterns](../../.agent/skills/frontend-patterns)
   - **描述**: React + Vite + Zustand + i18n 通用前端开发模式
   - **用途**: 组件模式、状态管理、性能优化、UI 最佳实践
   - **适用**: 所有 React 项目的通用模式和最佳实践

##### 2. **dev-frontend_patterns** - 江原企业门户前端开发专项（⭐ 推荐）
   - **路径**: [../../.agent/skills/dev-frontend_patterns](../../.agent/skills/dev-frontend_patterns)
   - **描述**: 专注于江原企业门户项目的前端开发规范
   - **用途**: VUE-like 结构拆分（Views/Modules/Shared）、严格的开发顺序
   - **适用**: 江原企业门户项目专用（包含强制开发流程）
   - **特点**:
     - 强制开发顺序：enum.js → locales → services → hooks → components → views
     - 模块化架构（admin/member/shared 分离）
     - 严格的代码组织规范

> **💡 前端两者区别**:
> - `frontend-patterns`: 通用的 React 最佳实践和模式
> - `dev-frontend_patterns`: 江原门户项目特定的架构规范和开发流程（更严格、更具体）

#### 后端 (Backend)

##### 3. **dev-api-design** - RESTful API 设计规范
   - **路径**: [../../.agent/skills/dev-api-design](../../.agent/skills/dev-api-design)
   - **用途**: API 端点设计、API 契约定义、版本管理、错误处理、API 文档、前后端接口对接

##### 4. **dev-backend_patterns** - 后端架构模式
   - **路径**: [../../.agent/skills/dev-backend_patterns](../../.agent/skills/dev-backend_patterns)
   - **用途**: Repository/Service 模式、数据库优化、缓存策略、认证、错误处理

##### 5. **backend-test-data** - 后端测试数据生成
   - **路径**: [../../.agent/skills/backend-test-data](../../.agent/skills/backend-test-data)
   - **用途**: 生成 Supabase 测试数据（会员、项目、实绩、FAQ 等）

---

### 🔐 安全 (Security)

#### 6. **dev-security_review** - 安全审查专家
   - **路径**: [../../.agent/skills/dev-security_review](../../.agent/skills/dev-security_review)
   - **用途**: 认证、用户输入处理、密钥管理、API 安全、敏感功能实现

#### 7. **dev-security_scan** - 自动化安全扫描
   - **路径**: [../../.agent/skills/dev-security_scan](../../.agent/skills/dev-security_scan)
   - **用途**: 硬编码密钥检查、SQL 注入风险扫描、提交前安全检查

---

### 🧪 测试 (Testing)

#### 8. **dev-tdd_workflow** - 测试驱动开发工作流
   - **路径**: [../../.agent/skills/dev-tdd_workflow](../../.agent/skills/dev-tdd_workflow)
   - **用途**: TDD 工作流、业务流程测试验证（审核、申报等）、80%+ 覆盖率要求

#### 9. **dev-verification_loop** - 代码验证循环
   - **路径**: [../../.agent/skills/dev-verification_loop](../../.agent/skills/dev-verification_loop)
   - **用途**: 功能完成后验证、PR 前检查、重构后验证、质量门禁

---

### 📝 文档管理 (Documentation)

#### 10. **dev-document_review** - 文档审查
   - **路径**: [../../.agent/skills/dev-document_review](../../.agent/skills/dev-document_review)
   - **用途**: 系统化评审技术文档、确保文档准确性和与代码一致性

#### 11. **dev-project_docs** - 项目文档管理
   - **路径**: [../../.agent/skills/dev-project_docs](../../.agent/skills/dev-project_docs)
   - **用途**: 江原企业门户项目文档管理、01-10 编号目录结构维护

#### 12. **dev-markdown_check** - Markdown 质量检查
   - **路径**: [../../.agent/skills/dev-markdown_check](../../.agent/skills/dev-markdown_check)
   - **用途**: Markdown 语法检查、文档结构验证、格式问题修复、最佳实践检查

#### 13. **dev-docx_to_md** - Word 文档转 Markdown
   - **路径**: [../../.agent/skills/dev-docx_to_md](../../.agent/skills/dev-docx_to_md)
   - **用途**: .docx 转 .md、内容提取、批量转换、格式和图片保留

---

### 📋 需求管理 (Requirements)

#### 14. **dev-prd** - PRD 产品需求文档管理
   - **路径**: [../../.agent/skills/dev-prd](../../.agent/skills/dev-prd)
   - **用途**: PRD 编写、功能描述、验收标准、业务流程定义（江原门户专项）

#### 15. **dev-requirements** - 需求编写专家
   - **路径**: [../../.agent/skills/dev-requirements](../../.agent/skills/dev-requirements)
   - **用途**: 功能需求、系统需求、验收标准、API 契约、业务规则、技术规范编写

---

### 🏗️ 架构与质量 (Architecture & Quality)

#### 16. **dev-architecture_refactor** - 架构重构指导
   - **路径**: [../../.agent/skills/dev-architecture_refactor](../../.agent/skills/dev-architecture_refactor)
   - **用途**: 基于架构图重构系统、代码结构与架构设计对齐、架构验证

#### 17. **dev-code_quality_check** - 代码质量自动检查
   - **路径**: [../../.agent/skills/dev-code_quality_check](../../.agent/skills/dev-code_quality_check)
   - **用途**: 函数/文件大小检查、嵌套深度检查、提交前代码审查、质量报告生成

---

### 🌐 Git 与协作 (Git & Collaboration)

#### 18. **dev-git** - Git 工作流最佳实践
   - **路径**: [../../.agent/skills/dev-git](../../.agent/skills/dev-git)
   - **用途**: Git 仓库初始化、commit/push/pull、分支管理、合并冲突处理、.gitignore 配置

#### 19. **dev-github_review** - GitHub PR 审查
   - **路径**: [../../.agent/skills/dev-github_review](../../.agent/skills/dev-github_review)
   - **用途**: GitHub 项目审查、项目质量评估、可复用模式提取、开源实践集成

---

### 🌍 国际化 (i18n)

#### 20. **dev-translation** - 多语言翻译管理
   - **路径**: [../../.agent/skills/dev-translation](../../.agent/skills/dev-translation)
   - **用途**: IT 技术文档翻译、双语内容创建（韩语/中文）、术语一致性、API 文档翻译

#### 21. **dev-terminology** - 术语一致性管理
   - **路径**: [../../.agent/skills/dev-terminology](../../.agent/skills/dev-terminology)
   - **用途**: 项目术语字典、命名统一约定、前后端/测试/数据库一致性保证

---

### 📄 PDF 处理 (PDF Processing)

#### 22. **dev-pdf_ocr** - PDF OCR 文字识别
   - **路径**: [../../.agent/skills/dev-pdf_ocr](../../.agent/skills/dev-pdf_ocr)
   - **用途**: 扫描 PDF 文字提取、图像 PDF OCR、架构图/流程图文字识别

#### 23. **dev-pdf_processing** - PDF 综合处理
   - **路径**: [../../.agent/skills/dev-pdf_processing](../../.agent/skills/dev-pdf_processing)
   - **用途**: PDF 文字/表格提取、PDF 转 Markdown、双语文档处理、表单填充、合并/拆分、程序化创建

---

### 🎨 资源生成 (Asset Generation)

#### 24. **asset-generation** - 项目资源自动生成
   - **路径**: [../../.agent/skills/asset-generation](../../.agent/skills/asset-generation)
   - **用途**: 横幅、项目图片、新闻图片生成、纯色和装饰性背景支持

---

## 📊 Skills 统计

- **总计**: 24 个 skills
- **全栈开发**: 5 个（前端 2 个 + 后端 3 个）
- **安全**: 2 个
- **测试**: 2 个
- **文档管理**: 4 个
- **需求管理**: 2 个
- **架构质量**: 2 个
- **Git 协作**: 2 个
- **国际化**: 2 个
- **PDF 处理**: 2 个
- **资源生成**: 1 个

---

## 🎯 常用 Skills 快速链接

### 江原企业门户项目核心 Skills

1. **[dev-frontend_patterns](../../.agent/skills/dev-frontend_patterns)** ⭐ - 前端开发专项规范（强制流程）
2. **[dev-api-design](../../.agent/skills/dev-api-design)** - RESTful API 设计
3. **[dev-prd](../../.agent/skills/dev-prd)** - PRD 需求文档编写
4. **[dev-translation](../../.agent/skills/dev-translation)** - 韩语/中文翻译管理
5. **[dev-security_review](../../.agent/skills/dev-security_review)** - 安全审查
6. **[dev-tdd_workflow](../../.agent/skills/dev-tdd_workflow)** - TDD 测试工作流

### 通用开发 Skills

1. **[frontend-patterns](../../.agent/skills/frontend-patterns)** - React 通用最佳实践
2. **[dev-backend_patterns](../../.agent/skills/dev-backend_patterns)** - 后端架构模式
3. **[dev-git](../../.agent/skills/dev-git)** - Git 工作流
4. **[dev-code_quality_check](../../.agent/skills/dev-code_quality_check)** - 代码质量检查

---

## 🚀 使用方式

### 在 Claude Code 中使用

Skills 会自动被 Claude Code 识别和使用。您也可以显式引用：

```
"请使用 dev-security_review skill 审查这段代码"
"用 dev-translation skill 检查翻译一致性"
"按照 dev-frontend_patterns skill 的规范重构这个组件"
```

### 查看 Skill 内容

```bash
# 打开 skill 文件
cat ../../.agent/skills/dev-api-design/SKILL.md

# 或在 IDE 中打开
code ../../.agent/skills/dev-frontend_patterns/SKILL.md
```

---

## ➕ 添加新 Skill

1. 在 `../../.agent/skills/` 创建新目录（例如 `my-new-skill`）
2. 添加 `SKILL.md` 文件（包含 frontmatter）：

```markdown
---
name: my-new-skill
description: Skill 简短描述
---

# My New Skill

详细的 skill 内容和指令...
```

3. 更新本索引文件（`.claude/skills/README.md`），添加新 skill 的分类和链接

---

## 🔗 相关文档

- [.claude 配置说明](../README.md)
- [.agent 配置说明](../../.agent/README.md)
- [项目 CLAUDE.md](../../CLAUDE.md)
- [代码规范](../rules/coding-style.md)
- [Git 工作流](../rules/git-workflow.md)
- [安全规范](../rules/security.md)
- [测试要求](../rules/testing.md)

---

**最后更新**: 2026-01-25
**Skills 位置**: `../../.agent/skills/`
**总数**: 24 个 skills
