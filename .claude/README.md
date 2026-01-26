# Claude Code 配置指南

本目录包含了针对江原企业门户项目定制的 Claude Code 配置。这些配置基于 [everything-claude-code](https://github.com/affaan-m/everything-claude-code) 项目，并根据我们的技术栈（React + Vite + Zustand + i18n）进行了优化。

## 📁 目录结构

```
.claude/
├── rules/                    # 代码规则和标准
│   ├── security.md          # 安全检查规范
│   ├── coding-style.md      # 代码风格指南
│   ├── git-workflow.md      # Git 工作流程
│   └── testing.md           # 测试要求
├── agents/                   # 专门的任务代理
│   ├── code-reviewer.md     # 代码审查专家
│   ├── build-error-resolver.md  # 构建错误解决
│   └── e2e-runner.md        # E2E 测试运行器
├── commands/                 # 快捷命令
│   ├── code-review.md       # /code-review 命令
│   ├── build-fix.md         # /build-fix 命令
│   └── e2e.md               # /e2e 命令
├── skills/                   # Skills 索引（实际内容在 ../.agent/skills/）
│   └── README.md            # Skills 索引和分类目录
├── hooks.json               # 自动化钩子配置
└── README.md                # 本文件
```

## 🚀 快速开始

### 1. 启用配置

这些配置已经在项目级别可用。Claude Code 会自动读取 `.claude/` 目录下的配置。

### 2. 使用命令

在 Claude Code 中可以直接使用以下命令：

```bash
# 代码审查
/code-review

# 修复构建错误
/build-fix

# 生成 E2E 测试
/e2e
```

### 3. Rules（规则）

Rules 会自动应用于所有 Claude Code 的交互。它们定义了：

- **安全规范** (`.claude/rules/security.md`)
  - 禁止硬编码密钥
  - 输入验证要求
  - XSS/SQL 注入防护

- **代码风格** (`.claude/rules/coding-style.md`)
  - 不可变性原则
  - 文件组织规范
  - React 最佳实践
  - i18n 使用规范

- **Git 工作流** (`.claude/rules/git-workflow.md`)
  - Commit 消息格式
  - PR 流程
  - 提交前检查清单

- **测试要求** (`.claude/rules/testing.md`)
  - 80% 测试覆盖率
  - TDD 工作流
  - E2E 测试场景

### 4. Agents（代理）

Agents 是专门处理特定任务的专家。Claude Code 会自动在合适的时候调用它们：

- **code-reviewer**: 写完代码后自动进行安全和质量审查
- **build-error-resolver**: 构建失败时快速定位和修复错误
- **e2e-runner**: 生成和运行 Playwright E2E 测试

### 5. Hooks（钩子）

Hooks 在特定事件触发时自动运行。已配置的 hooks：

- **PostToolUse - Edit JS/JSX**: 编辑后检查 console.log
- **PostToolUse - Edit i18n**: 编辑翻译文件时提醒更新所有语言
- **PreToolUse - Git Push**: Push 前提醒审查和测试
- **PreToolUse - Write Docs**: 阻止创建不必要的文档文件
- **Stop**: 每次响应后检查 console.log

## 📚 Skills（技能）

### Skills 统一管理

**位置**: 所有 skills 统一存储在 `../.agent/skills/` 目录下

**索引**: 查看 [.claude/skills/README.md](.claude/skills/README.md) 获取完整的 skills 列表和分类

### Skills 分类概览

- **全栈开发** (5个): 前端模式（React + Vite + Zustand）、API 设计、后端架构、测试数据
- **安全** (2个): 安全审查、安全扫描
- **测试** (2个): TDD 工作流、验证循环
- **文档管理** (4个): 文档审查、Markdown 检查、格式转换
- **需求管理** (2个): PRD、需求分析
- **架构质量** (2个): 架构重构、代码质量检查
- **Git 协作** (2个): Git 工作流、GitHub 审查
- **国际化** (2个): 翻译管理、术语一致性
- **PDF 处理** (2个): OCR、PDF 转换
- **资源生成** (1个): 项目资源自动生成

**总计**: 24 个 skills

### 常用 Skills 快速链接

1. **[dev-frontend_patterns](../.agent/skills/dev-frontend_patterns)** - 江原企业门户前端开发专项（推荐）
2. **[dev-api-design](../.agent/skills/dev-api-design)** - RESTful API 设计规范
3. **[dev-security_review](../.agent/skills/dev-security_review)** - 安全审查专家
4. **[dev-translation](../.agent/skills/dev-translation)** - 多语言翻译管理（韩语/中文）
5. **[dev-tdd_workflow](../.agent/skills/dev-tdd_workflow)** - 测试驱动开发工作流

## 💡 使用示例

### 代码审查

完成代码编写后，使用代码审查命令：

```
User: /code-review

Claude: 正在审查最近的更改...

发现 2 个问题：

[HIGH] console.log 语句
文件: frontend/src/components/UserCard.jsx:15
问题: 发现 console.log 语句
修复: 移除 console.log

[MEDIUM] 硬编码文本
文件: frontend/src/components/Welcome.jsx:8
问题: 硬编码文本 "欢迎"
修复: 使用 t('common.welcome')
```

### 修复构建错误

构建失败时：

```
User: /build-fix

Claude: 运行构建并修复错误...

发现 3 个错误：

1. [导入错误] Cannot find module '@/components/Button'
   修复: 添加 .jsx 扩展名

2. [环境变量] process is not defined
   修复: 使用 import.meta.env.VITE_API_URL

3. [React Hook] useState 在条件中调用
   修复: 将 hook 移到组件顶层

正在应用修复...
✅ 所有错误已修复，构建通过！
```

### 生成 E2E 测试

```
User: /e2e 测试用户登录流程

Claude: 生成 Playwright E2E 测试...

创建了 tests/e2e/auth/login.spec.js:
- ✅ 有效凭证登录成功
- ✅ 无效凭证显示错误
- ✅ 登出功能正常

运行测试:
npx playwright test tests/e2e/auth/login.spec.js
```

## 🔧 自定义配置

### 修改 Rules

编辑 `.claude/rules/` 下的文件以适应团队需求。

### 添加新 Skill

所有 skills 统一管理在 `../.agent/skills/` 目录下：

1. 在 `../.agent/skills/` 创建新目录（例如 `my-new-skill`）
2. 创建 `SKILL.md` 文件，包含 frontmatter：

```markdown
---
name: my-new-skill
description: Skill 描述
---

# My New Skill

Skill 内容和指令...
```

3. 更新 `.claude/skills/README.md` 索引文件，添加新 skill 的分类和链接

### 添加新 Agent

在 `.claude/agents/` 创建新的 `.md` 文件：

```markdown
---
name: your-agent-name
description: Agent 描述
tools: Read, Write, Edit, Bash
model: opus
---

你的 agent 指令...
```

### 添加新 Command

在 `.claude/commands/` 创建新的 `.md` 文件：

```markdown
# Your Command

命令说明和使用方法...
```

### 修改 Hooks

编辑 `.claude/hooks.json` 添加或修改钩子：

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "tool == \"Edit\"",
        "hooks": [
          {
            "type": "command",
            "command": "your-command-here"
          }
        ],
        "description": "Hook 描述"
      }
    ]
  }
}
```

## 📖 参考资源

- [Claude Code 官方文档](https://docs.anthropic.com/claude-code)
- [everything-claude-code](https://github.com/affaan-m/everything-claude-code)
- [项目 CLAUDE.md](../CLAUDE.md)

## 🤝 贡献

如果你发现配置可以改进：

1. 修改相应文件
2. 测试更改
3. 提交 PR 并说明改进点

## 📝 注意事项

- **Skills 位置**: 所有 skills 统一存储在 `../.agent/skills/` 目录，`.claude/skills/` 只保留索引文件
- **Hooks 依赖**: Hooks 中的 Node.js 命令需要项目安装了 Node.js
- **环境适配**: 某些 hooks 可能需要根据 CI/CD 环境调整
- **保持更新**: 定期查看 [everything-claude-code](https://github.com/affaan-m/everything-claude-code) 获取更新

## ❓ 常见问题

### Q: 如何禁用某个 hook？

A: 在 `.claude/hooks.json` 中注释掉或删除对应的 hook 配置。

### Q: 命令不工作怎么办？

A: 确保 `.claude/commands/` 目录下有对应的 `.md` 文件，并且格式正确。

### Q: 如何查看所有可用命令？

A: 在 Claude Code 中输入 `/help` 查看所有命令。

### Q: Skills 为什么在 `.agent/skills` 而不是 `.claude/skills`？

A: 为了统一管理，所有 skills 存储在 `../.agent/skills/` 目录下。`.claude/skills/README.md` 提供索引和快速链接。这样可以：
- 避免重复维护
- 集中管理所有技能
- 两个配置系统（.claude 和 .agent）都能访问

### Q: 如何查看所有可用 skills？

A: 查看 [.claude/skills/README.md](.claude/skills/README.md) 获取完整的分类索引。

---

**Happy Coding with Claude Code! 🚀**
