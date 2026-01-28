# I18n & Localization Check Skill

## 目标

检查和修复项目中的国际化和本地化问题，确保多语言支持的一致性和完整性。

## 适用场景

- 发现 JSX/TSX 组件中硬编码的中文/韩语文本
- 检查翻译键的一致性
- 验证翻译文件的完整性
- 修复组件中的本地化相关问题
- 审查新功能的国际化实现

**注意**: 此 skill 专注于 React 组件（.jsx/.tsx）中的 i18n 问题。枚举、常量、工具函数（.js/.ts）中的硬编码不在检查范围内。

## 项目语言配置

**主要语言**: 韩语 (ko)  
**次要语言**: 中文 (zh)

**翻译文件位置**:
- Frontend: `frontend/src/*/locales/{ko,zh}.json`
- 共享翻译: `frontend/src/shared/i18n/locales/{ko,zh}.json`

## 检查清单

### 1. 硬编码文本检查（仅 JSX/TSX 组件）

**检查范围**:
- ✅ React 组件文件（.jsx, .tsx）
- ❌ 枚举文件（enum.js, enums.js）
- ❌ 常量文件（constants.js）
- ❌ 工具函数（helpers.js, utils.js）

**禁止模式**:
```javascript
// ❌ 硬编码中文
<span>提交成功</span>
alert("删除失败");
const message = "请输入用户名";

// ❌ 硬编码韩语
<span>제출 성공</span>
alert("삭제 실패");
const message = "사용자 이름을 입력하세요";
```

**正确模式**:
```javascript
// ✅ 使用翻译键（fallback 使用韩语，因为主要语言是韩语）
<span>{t('message.submitSuccess', '제출 성공')}</span>
alert(t('message.deleteFailed', '삭제 실패'));
const message = t('form.enterUsername', '사용자 이름을 입력하세요');
```

**重要规则**:
- **Fallback 文本必须使用韩语**（项目主要语言）
- 翻译文件中同时维护韩语(ko.json)和中文(zh.json)
- 代码中的 fallback 仅作为翻译键缺失时的后备显示

### 2. 翻译键命名规范

**命名约定**:
- 使用点号分隔的层级结构
- 使用 camelCase 命名
- 模块前缀 + 功能 + 具体内容

**示例**:
```javascript
// ✅ 正确的翻译键
t('admin.members.detail.companyName')
t('performance.status.approved')
t('common.save')
t('message.deleteSuccess')

// ❌ 错误的翻译键
t('companyName')  // 缺少模块前缀
t('admin_members_detail_company_name')  // 使用下划线
t('COMPANY_NAME')  // 全大写
```

### 3. 翻译文件结构

**标准结构**:
```json
{
  "common": {
    "save": "저장",
    "cancel": "취소",
    "delete": "삭제"
  },
  "admin": {
    "members": {
      "detail": {
        "companyName": "회사명",
        "businessNumber": "사업자등록번호"
      }
    }
  },
  "performance": {
    "status": {
      "draft": "초안",
      "submitted": "제출됨",
      "approved": "승인됨"
    }
  }
}
```

### 4. 常见问题检测

#### 问题 1: 翻译键不存在
```javascript
// ❌ 翻译键在翻译文件中不存在
t('admin.members.detail.unknownKey')

// ✅ 提供默认值作为后备
t('admin.members.detail.companyName', '회사명')
```

#### 问题 2: 翻译键不一致
```javascript
// ❌ 同一概念使用不同的键
t('common.gender.male')  // 在某个组件
t('common.male')         // 在另一个组件

// ✅ 统一使用相同的键
t('common.male')
```

#### 问题 3: 缺少语言支持
```json
// ❌ ko.json 有，但 zh.json 缺失
// ko.json
{
  "admin": {
    "members": {
      "detail": {
        "newField": "새 필드"
      }
    }
  }
}

// zh.json - 缺少 newField

// ✅ 两个文件保持同步
```

#### 问题 4: 硬编码的警告/错误消息
```javascript
// ❌ 硬编码错误消息
setError("营业执照号码不可用");
throw new Error("数据验证失败");

// ✅ 使用翻译
setError(t('error.businessNumberUnavailable', '营业执照号码不可用'));
throw new Error(t('error.validationFailed', '数据验证失败'));
```

## 检查工具

### 自动检查脚本

#### 1. i18n_check.py - 综合检查工具 ✅

脚本: `.agent/skills/dev-i18n_check/scripts/i18n_check.py`

```bash
# 一键检查：中文 fallback + 硬编码文本 + 翻译同步 + 生成报告
uv run python .agent/skills/dev-i18n_check/scripts/i18n_check.py frontend/src
```

**功能**:
- ✅ **检查中文 fallback**: 查找 `t('key', '中文')` 模式（优先级 P1）
- ✅ **检查硬编码文本**: 扫描 React 组件（.jsx, .tsx）中的硬编码中文/韩语文本
- ✅ **检查翻译同步**: 检查韩语和中文翻译文件的同步性
- ✅ **生成详细报告**: Markdown 格式问题分析报告，按优先级排序
- ❌ **不检查** .js/.ts 文件中的枚举、常量、工具函数（有特定数据结构）

**输出**: `.agent/skills/dev-i18n_check/I18N_ISSUES.md`

**报告内容**:
- 中文 fallback 问题列表（P1 优先级）
- 硬编码文本问题（按文件类型分类）
- 翻译同步问题
- 自动化修复命令

#### 2. i18n_fix.py - 自动修复中文 Fallback ✅

脚本: `.agent/skills/dev-i18n_check/scripts/i18n_fix.py`

```bash
# 预览模式：查看哪些中文 fallback 需要改为韩语
uv run python .agent/skills/dev-i18n_check/scripts/i18n_fix.py frontend/src frontend/src/shared/i18n/locales/ko.json

# 应用模式：实际修改文件
uv run python .agent/skills/dev-i18n_check/scripts/i18n_fix.py frontend/src frontend/src/shared/i18n/locales/ko.json --apply
```

**功能**:
- 自动查找 React 组件中所有 `t('key', '中文')` 模式
- 从 ko.json 中查找对应的韩语翻译
- 替换为 `t('key', '한국어')`
- 支持预览模式（安全）和应用模式
- **仅处理** .jsx/.tsx 组件文件

**特点**:
- ✅ 安全的预览模式，修改前可以查看
- ✅ 自动从 ko.json 读取正确的韩语翻译
- ✅ 智能跳过不需要检查的目录

#### 3. auto_fix_fallbacks.py - 增强版批量自动修复 🚀 (推荐)

脚本: `.agent/skills/dev-i18n_check/scripts/auto_fix_fallbacks.py`

```bash
# 预览模式（推荐先运行）
uv run python .agent/skills/dev-i18n_check/scripts/auto_fix_fallbacks.py frontend/src

# 应用模式（实际修改文件）
uv run python .agent/skills/dev-i18n_check/scripts/auto_fix_fallbacks.py frontend/src --apply
```

**功能**:
- 自动加载并合并所有模块的 locales/ko.json 翻译
- 批量修复所有中文 fallback 为韩语
- 智能检测韩语/中文，避免错误替换
- 生成详细的修复报告和需要手动处理的问题列表

**特点**:
- ✅ 智能翻译查找：自动加载所有模块的 locales 目录
- ✅ 批量处理：可以一次性自动修复 ~90% 的问题
- ✅ 安全可靠：预览模式让你先查看将要修改的内容
- ✅ 详细报告：生成 MANUAL_FIX_NEEDED.md 列出需要手动处理的问题

**输出**:
- 修复统计（成功/失败数量）
- `MANUAL_FIX_NEEDED.md` 报告

#### 4. fix_double_parenthesis.py - 修复双括号问题 🔧

脚本: `.agent/skills/dev-i18n_check/scripts/fix_double_parenthesis.py`

```bash
# 预览模式
uv run python .agent/skills/dev-i18n_check/scripts/fix_double_parenthesis.py frontend/src

# 应用模式
uv run python .agent/skills/dev-i18n_check/scripts/fix_double_parenthesis.py frontend/src --apply
```

**功能**:
- 检测并修复 `t('key', 'fallback'))` 双括号语法错误
- 将其修复为 `t('key', 'fallback')`
- 支持预览和应用模式

### 手动检查步骤

1. **搜索组件中的硬编码文本**:
```bash
# 搜索 JSX/TSX 文件中的中文字符
rg "[\u4e00-\u9fff]+" --type-add 'jsx:*.jsx' --type-add 'tsx:*.tsx' -t jsx -t tsx -g "!**/locales/**"

# 搜索 JSX/TSX 文件中的韩文字符
rg "[\uac00-\ud7af]+" --type-add 'jsx:*.jsx' --type-add 'tsx:*.tsx' -t jsx -t tsx -g "!**/locales/**"
```

2. **检查翻译键使用**:
```bash
# 查找组件中所有 t() 调用
rg "t\(['\"]([^'\"]+)['\"]" --type-add 'jsx:*.jsx' --type-add 'tsx:*.tsx' -t jsx -t tsx
```

3. **验证翻译文件**:
```bash
# 比较 ko.json 和 zh.json 的键
diff <(jq -r 'paths | join(".")' ko.json | sort) \
     <(jq -r 'paths | join(".")' zh.json | sort)
```

## 修复指南

### 修复硬编码文本

**步骤**:
1. 识别硬编码文本
2. 确定合适的翻译键名
3. 在翻译文件中添加键值对
4. 替换硬编码文本为 `t()` 调用

**示例**:
```javascript
// Before
<div className="error">营业执照号码不可用</div>

// After
// 1. 在 ko.json 添加: "error.businessNumberUnavailable": "사업자등록번호를 사용할 수 없습니다"
// 2. 在 zh.json 添加: "error.businessNumberUnavailable": "营业执照号码不可用"
<div className="error">
  {t('error.businessNumberUnavailable', '사업자등록번호를 사용할 수 없습니다')}
</div>
```

**注意**: fallback 文本使用韩语（主要语言），确保即使翻译文件加载失败也能正常显示。

### 统一翻译键

**步骤**:
1. 搜索相同概念的不同翻译键
2. 选择最合适的键名
3. 更新所有使用处
4. 删除废弃的翻译键

**示例**:
```javascript
// Before - 不一致
t('common.gender.male')
t('common.male')

// After - 统一
t('common.male')
```

### 同步翻译文件

**步骤**:
1. 运行检查脚本找出缺失的键
2. 在缺失的文件中添加翻译
3. 确保两个语言文件结构一致

## 最佳实践

### 1. 始终提供默认值
```javascript
// ✅ 提供默认值，即使翻译缺失也能显示
t('admin.members.detail.companyName', '회사명')
```

### 2. 使用插值而非字符串拼接
```javascript
// ❌ 字符串拼接
t('message.welcome') + userName + t('message.suffix')

// ✅ 使用插值
t('message.welcomeUser', { name: userName })
// 翻译: "환영합니다, {{name}}님"
```

### 3. 避免在翻译中包含 HTML
```javascript
// ❌ HTML 在翻译中
// "message.terms": "请阅读<a href='/terms'>服务条款</a>"

// ✅ 分离 HTML 和文本
<span>
  {t('message.readTerms')}
  <a href="/terms">{t('common.termsOfService')}</a>
</span>
```

### 4. 组织翻译键的层级
```javascript
// ✅ 清晰的层级结构
admin.members.detail.companyName
admin.members.list.title
admin.projects.form.submitButton

// ❌ 扁平结构
adminMembersDetailCompanyName
adminMembersListTitle
```

## 术语一致性

### 标准术语表

维护 `docs/terminology/glossary.md`:

```markdown
# 术语表

| 英文 | 韩语 | 中文 | 翻译键 |
|------|------|------|--------|
| Company | 회사 | 公司 | common.company |
| Business Number | 사업자등록번호 | 营业执照号 | common.businessNumber |
| Representative | 대표자 | 代表人 | common.representative |
| Submit | 제출 | 提交 | common.submit |
| Approve | 승인 | 批准 | common.approve |
| Reject | 거절 | 拒绝 | common.reject |
```

### 术语使用规则

1. **一致性**: 同一概念始终使用相同的术语
2. **准确性**: 使用行业标准术语
3. **简洁性**: 避免冗长的翻译
4. **本地化**: 考虑目标语言的习惯用法

## 工作流程

### 完整检查和修复流程

**🚀 推荐工作流程（使用增强版脚本）**:

```bash
# 1️⃣ 检查所有问题
uv run python .agent/skills/dev-i18n_check/scripts/i18n_check.py frontend/src

# 2️⃣ 查看详细报告
# 打开 .agent/skills/dev-i18n_check/I18N_ISSUES.md

# 3️⃣ 批量自动修复中文 fallback（推荐！）
# 先预览
uv run python .agent/skills/dev-i18n_check/scripts/auto_fix_fallbacks.py frontend/src

# 确认后应用（可以自动修复 ~90% 的问题）
uv run python .agent/skills/dev-i18n_check/scripts/auto_fix_fallbacks.py frontend/src --apply

# 4️⃣ 查看需要手动处理的问题
# 打开 .agent/skills/dev-i18n_check/MANUAL_FIX_NEEDED.md

# 5️⃣ 手动添加缺失的翻译键
# 根据 MANUAL_FIX_NEEDED.md 中的提示，在各模块的 locales/ko.json 和 zh.json 中添加翻译

# 6️⃣ 重新运行自动修复（修复剩余问题）
uv run python .agent/skills/dev-i18n_check/scripts/auto_fix_fallbacks.py frontend/src --apply

# 7️⃣ 修复双括号问题（如果有）
uv run python .agent/skills/dev-i18n_check/scripts/fix_double_parenthesis.py frontend/src --apply

# 8️⃣ 最终检查
uv run python .agent/skills/dev-i18n_check/scripts/i18n_check.py frontend/src
```

### 新功能开发
1. 设计时确定需要的文本
2. 在翻译文件中添加键值对（ko 和 zh）
3. 在组件中使用 `t('key', '한국어 fallback')` - **注意使用韩语 fallback**
4. 测试两种语言的显示效果
5. 运行 i18n_check.py 确认没有问题

### Bug 修复
1. 运行 `i18n_check.py` 识别所有 i18n 问题
2. 使用 `i18n_fix.py --apply` 自动修复中文 fallback
3. 手动修复硬编码文本（添加翻译键 + 使用 `t()` 调用）
4. 重新运行检查脚本验证修复效果

### 代码审查
1. 运行 `i18n_check.py` 检查是否有问题
2. 验证翻译键命名是否规范
3. 确认翻译文件已同步更新（ko.json 和 zh.json）
4. 测试语言切换功能
5. 确认所有 fallback 使用韩语

## 范围说明

### ✅ 检查范围
- React 组件文件（.jsx, .tsx）
- 组件中的 UI 文本、错误消息、提示信息
- 翻译文件的同步性

### ❌ 不检查范围
- 枚举文件（enum.js, enums.js）
- 常量文件（constants.js）
- 工具函数（helpers.js, utils.js）
- 纯 JavaScript/TypeScript 文件（.js, .ts）

**原因**: 枚举、常量、工具函数通常有特定的数据结构（如 labelKo/labelZh），需要不同的处理方式。组件中的 i18n 问题优先级更高，影响用户体验。

## 参考资源

- [React i18next 文档](https://react.i18next.com/)
- [i18next 最佳实践](https://www.i18next.com/principles/fallback)
- 项目术语表: `docs/terminology/glossary.md`
- 翻译文件: `frontend/src/*/locales/`

## 总结

此 skill 专注于 React 组件（.jsx/.tsx）中的国际化问题：

**✅ 检查内容**:
- ✅ **中文 fallback** - `t('key', '中文')` 模式（优先级 P1）
- ✅ **硬编码文本** - 组件中的硬编码中文/韩语
- ✅ **翻译同步** - ko.json 和 zh.json 的键一致性
- ✅ **双括号问题** - `t('key', 'fallback'))` 语法错误

**❌ 不检查内容**:
- 枚举文件（enum.js）
- 常量文件（constants.js）
- 工具函数（helpers.js, utils.js）
- 纯 JS/TS 文件（非组件）

**工具**:
- `i18n_check.py` - 综合检查和生成报告（包含中文 fallback 检测）
- `auto_fix_fallbacks.py` - 🚀 增强版批量自动修复（推荐，可修复 ~90% 问题）
- `i18n_fix.py` - 基础版自动修复中文 fallback 为韩语
- `fix_double_parenthesis.py` - 修复双括号语法错误

**原则**:
- 主要语言：韩语（ko）
- 次要语言：中文（zh）
- **Fallback 文本必须使用韩语**（项目规范）
- 组件优先，枚举/常量可保持现状

**改进**:
- ✅ 改进了检测逻辑，更准确识别 fallback 位置
- ✅ 新增中文 fallback 自动检测和修复
- ✅ 优化报告格式，按优先级排序
- ✅ 提供完整的自动化工作流
