# Git 提交规范 (Conventional Commits)

## 概述

本规范基于 [Conventional Commits 1.0.0](https://www.conventionalcommits.org/)，定义 Git 提交信息的标准格式。

---

## 一、提交信息格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 示例

```
feat(user): 添加用户注册功能

- 实现邮箱注册接口
- 添加密码强度验证
- 发送注册确认邮件

Closes #123
```

---

## 二、Type（类型）

| 类型 | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | feat: 添加用户登录功能 |
| `fix` | 修复 Bug | fix: 修复登录验证码失效问题 |
| `docs` | 文档变更 | docs: 更新 API 文档 |
| `style` | 代码格式（不影响逻辑） | style: 格式化代码 |
| `refactor` | 重构（非新功能、非修复） | refactor: 重构用户服务 |
| `perf` | 性能优化 | perf: 优化查询性能 |
| `test` | 测试相关 | test: 添加用户模块单元测试 |
| `build` | 构建系统或依赖 | build: 升级 FastAPI 到 0.100 |
| `ci` | CI 配置 | ci: 添加 GitHub Actions |
| `chore` | 其他杂项 | chore: 更新 .gitignore |
| `revert` | 回滚提交 | revert: 回滚用户注册功能 |

### 破坏性变更

在类型后加 `!` 表示破坏性变更：

```
feat!: 移除用户名登录，仅支持邮箱登录

BREAKING CHANGE: 登录接口不再支持用户名，请使用邮箱登录
```

---

## 三、Scope（范围）

表示影响的模块或功能区域，可选但推荐使用。

### 常用 Scope

```
# 按模块
feat(user): ...
feat(order): ...
feat(payment): ...
feat(auth): ...

# 按层级
feat(api): ...
feat(service): ...
feat(model): ...
feat(router): ...

# 按功能
feat(login): ...
feat(register): ...
feat(search): ...
```

### 项目 Scope 约定

根据项目结构定义统一的 scope：

```
# 后端模块
user, order, product, payment, auth, notification

# 前端模块
components, pages, hooks, store, utils

# 基础设施
docker, ci, deploy, config
```

---

## 四、Subject（主题）

### 规则

1. 使用祈使句（动词开头）
2. 首字母小写（英文）或直接中文
3. 不超过 50 个字符
4. 结尾不加句号

### ✅ 正确示例

```
feat(user): 添加用户注册功能
fix(order): 修复订单金额计算错误
docs(readme): 更新安装说明
refactor(auth): 重构 JWT 验证逻辑
```

### ❌ 错误示例

```
feat(user): 添加了用户注册功能。    # 不要用过去式，不要句号
fix: bug修复                        # 描述不清晰
Update user.py                      # 不要描述文件名
```

---

## 五、Body（正文）

### 规则

1. 与 subject 空一行
2. 说明 **为什么** 和 **做了什么**
3. 每行不超过 72 个字符
4. 可使用列表格式

### 示例

```
feat(order): 添加订单导出功能

支持将订单数据导出为 Excel 和 CSV 格式：
- 添加 ExportService 处理导出逻辑
- 支持按时间范围筛选
- 支持选择导出字段
- 大数据量使用流式导出

导出文件保存在 /exports 目录，24小时后自动清理。
```

---

## 六、Footer（页脚）

### 关联 Issue

```
# 关闭 Issue
Closes #123
Closes #123, #456

# 关联 Issue（不关闭）
Refs #123
Related to #123
```

### 破坏性变更

```
BREAKING CHANGE: 登录接口响应格式变更

旧格式：
{
    "token": "xxx"
}

新格式：
{
    "access_token": "xxx",
    "refresh_token": "xxx",
    "expires_in": 3600
}
```

### 多个 Footer

```
feat(auth): 重构认证模块

重新设计认证流程，支持多种登录方式。

BREAKING CHANGE: 移除旧的 /login 接口，使用 /auth/login

Closes #123
Reviewed-by: zhangsan
```

---

## 七、完整示例

### 简单提交

```
fix(user): 修复用户头像上传失败
```

### 标准提交

```
feat(payment): 添加微信支付功能

集成微信支付 SDK，支持扫码支付和 JSAPI 支付：
- 添加 WechatPayService
- 实现支付回调处理
- 添加支付状态查询接口

Closes #456
```

### 破坏性变更

```
feat(api)!: 统一 API 响应格式

所有 API 响应统一为以下格式：
{
    "code": 0,
    "message": "success",
    "data": {}
}

BREAKING CHANGE: 旧的直接返回数据的接口需要从 response.data 获取

迁移指南：
- 旧：const user = response
- 新：const user = response.data

Closes #789
```

### 回滚提交

```
revert: feat(user): 添加用户注册功能

This reverts commit abc1234.

原因：注册功能存在安全漏洞，暂时回滚
```

---

## 八、Git 工作流

### 分支命名

```
# 功能分支
feature/user-registration
feature/order-export

# 修复分支
fix/login-validation
hotfix/payment-error

# 发布分支
release/v1.2.0
```

### 提交频率

```
# ✅ 好的实践：小而频繁的提交
git commit -m "feat(user): 添加用户模型"
git commit -m "feat(user): 添加用户仓储"
git commit -m "feat(user): 添加用户服务"
git commit -m "feat(user): 添加用户路由"

# ❌ 不好的实践：大而少的提交
git commit -m "feat(user): 添加完整的用户模块"  # 包含几千行代码
```

### Merge vs Rebase

```
# 功能分支合并到主分支：使用 Squash Merge
git merge --squash feature/user-registration

# 同步主分支到功能分支：使用 Rebase
git rebase main
```

---

## 九、工具配置

### Commitlint

```javascript
// commitlint.config.js
module.exports = {
    extends: ['@commitlint/config-conventional'],
    rules: {
        'type-enum': [
            2,
            'always',
            [
                'feat',
                'fix',
                'docs',
                'style',
                'refactor',
                'perf',
                'test',
                'build',
                'ci',
                'chore',
                'revert',
            ],
        ],
        'scope-enum': [
            2,
            'always',
            ['user', 'order', 'product', 'payment', 'auth', 'api', 'config'],
        ],
        'subject-max-length': [2, 'always', 50],
        'body-max-line-length': [2, 'always', 72],
    },
};
```

### Husky + Git Hooks

```json
// package.json
{
    "husky": {
        "hooks": {
            "commit-msg": "commitlint -E HUSKY_GIT_PARAMS"
        }
    }
}
```

### Commitizen

```bash
# 安装
npm install -g commitizen cz-conventional-changelog

# 配置
echo '{ "path": "cz-conventional-changelog" }' > ~/.czrc

# 使用（交互式提交）
git cz
```

### Python Pre-commit

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/commitizen-tools/commitizen
    rev: v3.13.0
    hooks:
      - id: commitizen
        stages: [commit-msg]
```

---

## 十、Changelog 生成

### 自动生成

基于 Conventional Commits 可自动生成 CHANGELOG：

```bash
# 使用 conventional-changelog
npx conventional-changelog -p angular -i CHANGELOG.md -s

# 使用 standard-version
npx standard-version
```

### Changelog 格式

```markdown
# Changelog

## [1.2.0] - 2024-01-15

### Features
- **user**: 添加用户注册功能 (#123)
- **payment**: 添加微信支付功能 (#456)

### Bug Fixes
- **order**: 修复订单金额计算错误 (#789)

### BREAKING CHANGES
- **api**: 统一 API 响应格式

## [1.1.0] - 2024-01-01
...
```

---

## 十一、检查清单

### 提交前检查

- [ ] Type 是否正确？
- [ ] Scope 是否准确？
- [ ] Subject 是否清晰简洁？
- [ ] 是否需要 Body 说明？
- [ ] 是否有关联的 Issue？
- [ ] 是否有破坏性变更需要说明？

### 代码审查检查

- [ ] 提交信息是否符合规范？
- [ ] 提交粒度是否合适？
- [ ] 是否有无意义的提交需要 Squash？

### 常见问题

| 问题 | 解决方案 |
|------|---------|
| 提交信息写错了 | `git commit --amend` |
| 需要合并多个提交 | `git rebase -i HEAD~n` |
| 提交到错误分支 | `git cherry-pick` + `git reset` |
| 忘记关联 Issue | 在 PR 描述中补充 |
