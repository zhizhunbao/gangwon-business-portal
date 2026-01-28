# I18n 检查和修复工具

本目录包含用于检查和修复国际化（i18n）问题的自动化脚本。

## 脚本列表

### 1. i18n_check.py - 综合检查工具 ✅

**功能**:
- ✅ 检查 `t('key', '中文')` 模式（中文 fallback 问题）
- ✅ 检查 React 组件（.jsx, .tsx）中的硬编码中文/韩语文本
- ✅ 检查翻译文件（ko.json, zh.json）的同步性
- ✅ 生成详细的 Markdown 格式问题报告
- ❌ **不检查** .js/.ts 文件中的枚举、常量、工具函数（有特定的数据结构）

**用法**:
```bash
uv run python i18n_check.py <前端目录>
```

**示例**:
```bash
cd .agent/skills/dev-i18n_check/scripts
uv run python i18n_check.py ../../../../frontend/src
```

**输出**: `../I18N_ISSUES.md` 报告文件

**报告内容**:
- 中文 fallback 问题（优先级 P1）
- 硬编码文本问题（按类型分类）
- 修复建议和自动化命令

---

### 2. i18n_fix.py - 自动修复中文 Fallback ✅

**功能**:
- 自动查找 `t('key', '中文')` 模式
- 从 ko.json 中查找对应的韩语翻译
- 替换为 `t('key', '한국어')`
- 支持预览模式（dry-run）和应用模式

**用法**:
```bash
# 预览模式（不修改文件，仅显示将要修改的内容）
uv run python i18n_fix.py <前端目录> <ko.json路径>

# 应用模式（实际修改文件）
uv run python i18n_fix.py <前端目录> <ko.json路径> --apply
```

**示例**:
```bash
cd .agent/skills/dev-i18n_check/scripts

# 预览修复
uv run python i18n_fix.py ../../../../frontend/src ../../../../frontend/src/shared/i18n/locales/ko.json

# 应用修复
uv run python i18n_fix.py ../../../../frontend/src ../../../../frontend/src/shared/i18n/locales/ko.json --apply
```

**特点**:
- ✅ 安全的预览模式
- ✅ 自动从 ko.json 读取正确的韩语翻译
- ✅ 仅处理 .jsx/.tsx 组件文件
- ✅ 自动跳过 node_modules、dist、_deprecated 等目录

---

### 3. auto_fix_fallbacks.py - 增强版批量自动修复 🚀 (推荐)

**功能**:
- ✅ 自动加载并合并所有模块的 locales/ko.json 翻译
- ✅ 批量修复所有中文 fallback 为韩语
- ✅ 智能检测韩语/中文，避免错误替换
- ✅ 生成详细的修复报告
- ✅ 自动生成需要手动处理的问题列表

**用法**:
```bash
# 预览模式（推荐先运行）
uv run python auto_fix_fallbacks.py <前端目录>

# 应用模式（实际修改文件）
uv run python auto_fix_fallbacks.py <前端目录> --apply
```

**示例**:
```bash
cd .agent/skills/dev-i18n_check/scripts

# 预览修复（查看将要修改什么）
uv run python auto_fix_fallbacks.py ../../../../frontend/src

# 应用修复（实际修改）
uv run python auto_fix_fallbacks.py ../../../../frontend/src --apply
```

**特点**:
- ✅ **智能翻译查找**: 自动加载所有模块的 locales 目录（不仅仅是 shared）
- ✅ **批量处理**: 一次性处理所有文件（448 处问题中可以自动修复 ~90%）
- ✅ **安全可靠**: 预览模式让你先查看将要修改的内容
- ✅ **详细报告**: 生成 MANUAL_FIX_NEEDED.md 列出需要手动处理的问题
- ✅ **智能过滤**: 只替换真正的韩语翻译，避免错误替换

**输出**:
- 修复统计（成功/失败数量）
- MANUAL_FIX_NEEDED.md 报告（需要手动处理的问题）

---

### 4. fix_double_parenthesis.py - 修复双括号问题 🔧

**功能**:
- 检测并修复 `t('key', 'fallback'))` 双括号问题
- 将其修复为 `t('key', 'fallback')`
- 支持预览和应用模式

**用法**:
```bash
# 预览模式
uv run python fix_double_parenthesis.py <前端目录>

# 应用模式
uv run python fix_double_parenthesis.py <前端目录> --apply
```

**示例**:
```bash
cd .agent/skills/dev-i18n_check/scripts

# 预览
uv run python fix_double_parenthesis.py ../../../../frontend/src

# 应用修复
uv run python fix_double_parenthesis.py ../../../../frontend/src --apply
```

---

## 完整工作流程

### 🚀 推荐流程（使用增强版脚本）

```bash
# 进入脚本目录
cd .agent/skills/dev-i18n_check/scripts

# 1️⃣ 检查所有问题
uv run python i18n_check.py ../../../../frontend/src

# 2️⃣ 查看详细报告
# 打开 ../I18N_ISSUES.md 查看问题详情

# 3️⃣ 批量自动修复中文 fallback（推荐！）
# 先预览
uv run python auto_fix_fallbacks.py ../../../../frontend/src

# 确认后应用（可以修复 ~90% 的问题）
uv run python auto_fix_fallbacks.py ../../../../frontend/src --apply

# 4️⃣ 查看需要手动处理的问题
# 打开 ../MANUAL_FIX_NEEDED.md

# 5️⃣ 手动添加缺失的翻译键
# 根据 MANUAL_FIX_NEEDED.md 中的提示，在各模块的 locales/ko.json 和 zh.json 中添加翻译

# 6️⃣ 重新运行自动修复（修复剩余问题）
uv run python auto_fix_fallbacks.py ../../../../frontend/src --apply

# 7️⃣ 修复双括号问题（如果有）
uv run python fix_double_parenthesis.py ../../../../frontend/src --apply

# 8️⃣ 最终检查
uv run python i18n_check.py ../../../../frontend/src
```

### 标准流程（使用基础脚本）

```bash
# 进入脚本目录
cd .agent/skills/dev-i18n_check/scripts

# 1️⃣ 检查所有问题
uv run python i18n_check.py ../../../../frontend/src

# 2️⃣ 查看详细报告
# 打开 ../I18N_ISSUES.md 查看问题详情

# 3️⃣ 修复中文 fallback（仅处理 shared i18n）
# 先预览
uv run python i18n_fix.py ../../../../frontend/src ../../../../frontend/src/shared/i18n/locales/ko.json

# 确认后应用
uv run python i18n_fix.py ../../../../frontend/src ../../../../frontend/src/shared/i18n/locales/ko.json --apply

# 4️⃣ 修复双括号问题（如果有）
uv run python fix_double_parenthesis.py ../../../../frontend/src --apply

# 5️⃣ 重新检查确认修复
uv run python i18n_check.py ../../../../frontend/src

# 6️⃣ 手动修复剩余的硬编码文本
# 根据报告中的提示，在代码中添加翻译键
```

---

## 快速命令（从项目根目录）

如果你在项目根目录，可以使用以下简化命令：

```bash
# 检查问题
uv run python .agent/skills/dev-i18n_check/scripts/i18n_check.py frontend/src

# 🚀 批量自动修复（推荐）
# 预览
uv run python .agent/skills/dev-i18n_check/scripts/auto_fix_fallbacks.py frontend/src

# 应用
uv run python .agent/skills/dev-i18n_check/scripts/auto_fix_fallbacks.py frontend/src --apply

# 修复中文 fallback（仅 shared，基础方式）
uv run python .agent/skills/dev-i18n_check/scripts/i18n_fix.py frontend/src frontend/src/shared/i18n/locales/ko.json --apply

# 修复双括号
uv run python .agent/skills/dev-i18n_check/scripts/fix_double_parenthesis.py frontend/src --apply
```

---

## 常见问题

### Q: 为什么不检查 .js/.ts 文件？
A: 枚举、常量、工具函数通常有特定的数据结构（如 `labelKo`/`labelZh`），需要不同的处理方式。此工具专注于 React 组件中的 i18n 问题，这些问题对用户体验影响更大。

### Q: 什么是中文 fallback 问题？
A: 项目主要语言是韩语，所以 fallback 应该使用韩语：
```javascript
// ❌ 错误：使用中文 fallback
t('common.save', '保存')

// ✅ 正确：使用韩语 fallback
t('common.save', '저장')
```

### Q: i18n_fix.py 修复后为什么还有问题？
A: `i18n_fix.py` 只能修复已经在 ko.json 中存在的翻译键。如果某个键在 ko.json 中不存在，你需要手动添加翻译后再运行修复。

### Q: 修复脚本安全吗？
A: 是的，所有脚本都支持预览模式（dry-run），你可以先查看将要修改的内容，确认无误后再使用 `--apply` 参数应用修改。

---

## 技术细节

### 支持的文件类型
- ✅ .jsx (React 组件)
- ✅ .tsx (React TypeScript 组件)
- ❌ .js (除非是组件文件)
- ❌ .ts (除非是组件文件)

### 跳过的目录
- `node_modules`
- `locales`
- `.venv`
- `_deprecated`
- `dist`
- `build`

### 检测模式
- **硬编码文本**: `[\u4e00-\u9fff]+` (中文), `[\uac00-\ud7af]+` (韩语)
- **中文 fallback**: `t('[key]', '[中文文本]')`
- **双括号**: `t('[key]', '[fallback]'))`

---

## 贡献

如果你发现问题或有改进建议，请更新此文档并提交 PR。

**维护者**: Claude Code Team
**最后更新**: 2026-01-27
