---
name: dev-project_docs
description: 项目文档管理专家。专注于江原道企业门户项目文档管理，确保 01-10 编号目录结构的一致性与可维护性。
---

# 项目文档管理 (江原道企业门户专项)

## 目标

确保江原道企业门户项目的文档质量、一致性和可维护性，使其成为开发与业务的唯一事实来源。

## 核心原则

### 1. 结构化管理 (Sorted Order)

- 必须遵循项目预定义的 **01-10 编号目录结构**。
- 每个子目录应包含一个 `README.md` 作为该类文档的导航入口。

### 2. 多语言对齐 (i18n Alignment)

- 文档中的业务术语（如：`지원사업`, `신청`）必须符合 `docs/glossary.md` 中的中英韩对照。

### 3. 文档即代码 (Docs as Code)

- 文档与代码应在同一个 PR 中提交，严禁“代码先行，文档补齐”。

## 文档结构标准 (精简版)

```
docs/
├── requirements/    # 🎯 需求定义 (Master PRD, Feature PRDs, 原型图)
├── design/          # 🏗️ 技术设计 (架构设计, 数据库设计, API 文档)
├── guides/          # 💻 指南规范 (安装手册, 测试规范, 部署方案)
├── archive/         # 🕰️ 历史记录 (旧版文档, 会议记录, 历史报告)
├── glossary.md      # 📖 业务术语表 (中英韩)
├── CHANGELOG.md     # 变更日志
└── README.md        # 文档索引 README
```

## PRD 分层策略 (requirements/)

- **Strategic Layer**: `docs/requirements/master_prd.md` - 总体愿景、核心业务流程。
- **Feature Layer**: `docs/requirements/prd_*.md` - 具体功能点的详细 PRD。
- **Inputs**: `docs/requirements/active/` - 客户提供的原始输入资料。

## README.md 规范 (项目根目录)

由于本项目受**专有软件许可协议**保护，README 必须包含：

- **项目简介**：江原道企业门户的核心目标。
- **技术栈**：React 18 + Tailwind + Zustand。
- **快速开始**：`npm install` 与 `npm run dev`。
- **版权声明**：指引至根目录下的 `LICENSE` 文件。

## 文档命名规范

| 类型     | 规范            | 示例                           |
| -------- | --------------- | ------------------------------ |
| PRD 文档 | `name-prd.md`   | `business-registration-prd.md` |
| 接口文档 | `module-api.md` | `project-service-api.md`       |
| 环境配置 | `env-config.md` | `prod-env-config.md`           |

## 质量审查清单

- [ ] **术语一致性**：是否使用了 `glossary.md` 中定义的术语？
- [ ] **路径准确性**：所有交叉引用的链接（如 `[架构](../02-architecture/)`）是否有效？
- [ ] **多端区分**：是否明确了功能属于 `Admin` 还是 `Member`？
- [ ] **格式规范**：是否包含文件头部声明、版本号及最后更新时间？

---

## 自动化检查

`scripts/` 目录下的工具应针对 01-10 结构进行验证：

- `validate-docs.js`: 检查编号目录的完整性及无效链接。
- `update-glossary.js`: 同步更新所有文档中的术语链接。

---

_本规范由 dev-project_docs skill 为江原道企业门户项目定制生成。_
