# 国际化问题分析报告
生成时间: 2026-01-27 18:07:00

## 概览
- 硬编码文本: **7** 个文件，**21** 处问题
- 中文 Fallback: **0** 个文件，**0** 处问题

---

## ❌ 组件硬编码 (P1 - 高)

发现 7 个文件存在问题

### 📄 `frontend\src\admin\layouts\Header.jsx`

共 1 处硬编码

**行 186** - KOREAN
- 文本: `로그인`
- 上下文: `{t('admin.header.login') || '로그인'}`

### 📄 `frontend\src\admin\modules\members\MemberDetail.jsx`

共 1 处硬编码

**行 604** - CHINESE
- 文本: `查询中`
- 上下文: `<Loading text={t("common.loading") || "查询中..."} />`

### 📄 `frontend\src\admin\modules\statistics\components\Filter\IndustryFilters.jsx`

共 2 处硬编码

**行 32** - CHINESE
- 文本: `主力产业`
- 上下文: `placeholder={t("member.mainIndustryKsicMajor") || "主力产业 KSIC 代码"}`

**行 32** - CHINESE
- 文本: `代码`
- 上下文: `placeholder={t("member.mainIndustryKsicMajor") || "主力产业 KSIC 代码"}`

### 📄 `frontend\src\admin\modules\statistics\components\Filter\QuantitiveFilters.jsx`

共 1 处硬编码

**行 93** - KOREAN
- 文本: `명`
- 上下文: `{t("common.personUnit") || "명"}`

### 📄 `frontend\src\admin\modules\statistics\components\Filter\TimeFilters.jsx`

共 2 处硬编码

**行 14** - CHINESE
- 文本: `年`
- 上下文: `String(currentYear - i) + (t("statistics.filters.time.yearUnit") || "年"),`

**行 24** - CHINESE
- 文本: `月`
- 上下文: `label: o.label + (t("statistics.filters.time.monthUnit") || "月"),`

### 📄 `frontend\src\member\modules\auth\components\RegisterStep4Business.jsx`

共 1 处硬编码

**行 237** - CHINESE
- 文本: `多个值请用逗号分隔`
- 上下文: `{t("common.commaSeparatedHint") || "多个值请用逗号分隔"}`

### 📄 `frontend\src\shared\components\PasswordStrength.jsx`

共 13 处硬编码

**行 22** - KOREAN
- 文本: `자`
- 上下文: `label: t('auth.passwordCheck.minLength') || '8자 이상',`

**行 22** - KOREAN
- 文本: `이상`
- 上下文: `label: t('auth.passwordCheck.minLength') || '8자 이상',`

**行 27** - KOREAN
- 文本: `대문자`
- 上下文: `label: t('auth.passwordCheck.hasUpperCase') || '대문자 포함',`

**行 27** - KOREAN
- 文本: `포함`
- 上下文: `label: t('auth.passwordCheck.hasUpperCase') || '대문자 포함',`

**行 32** - KOREAN
- 文本: `소문자`
- 上下文: `label: t('auth.passwordCheck.hasLowerCase') || '소문자 포함',`

**行 32** - KOREAN
- 文本: `포함`
- 上下文: `label: t('auth.passwordCheck.hasLowerCase') || '소문자 포함',`

**行 37** - KOREAN
- 文本: `숫자`
- 上下文: `label: t('auth.passwordCheck.hasNumber') || '숫자 포함',`

**行 37** - KOREAN
- 文本: `포함`
- 上下文: `label: t('auth.passwordCheck.hasNumber') || '숫자 포함',`

**行 42** - KOREAN
- 文本: `특수문자`
- 上下文: `label: t('auth.passwordCheck.hasSpecialChar') || '특수문자 포함',`

**行 42** - KOREAN
- 文本: `포함`
- 上下文: `label: t('auth.passwordCheck.hasSpecialChar') || '특수문자 포함',`

... 还有 3 处问题

---

## 修复建议

### 优先级说明

- **P1 - 高**: 中文 fallback 和组件硬编码，影响用户体验，应尽快修复
- **P2 - 中**: 枚举和常量硬编码，可以逐步优化
- **P3 - 低**: 工具函数中的硬编码，可以保持现状或后续优化

### 修复步骤

#### 2. 修复硬编码文本（手动）

1. 在 `ko.json` 和 `zh.json` 中添加对应的翻译键
2. 使用 `t('key', '한국어 fallback')` 替换硬编码文本
3. 测试韩语和中文两种语言的显示
4. 运行检查工具验证修复结果

### 重新检查

```bash
# 修复后重新检查
uv run python .agent/skills/dev-i18n_check/scripts/i18n_check.py frontend/src
```
