# i18n 自动修复快速开始

## 🎯 你有 448 处中文 fallback 需要修复？使用这个！

### 一键批量修复（推荐）

```bash
# 从项目根目录运行

# 1. 先预览要修复什么（安全检查）
uv run python .agent/skills/dev-i18n_check/scripts/auto_fix_fallbacks.py frontend/src

# 2. 确认后应用修复（自动修复 ~90% 的问题）
uv run python .agent/skills/dev-i18n_check/scripts/auto_fix_fallbacks.py frontend/src --apply

# 3. 查看哪些需要手动处理
cat .agent/skills/dev-i18n_check/MANUAL_FIX_NEEDED.md

# 4. 重新检查
uv run python .agent/skills/dev-i18n_check/scripts/i18n_check.py frontend/src
```

## 📊 预期效果

### 修复前
```
❌ 发现 63 个文件，共 448 处中文 fallback
```

### 运行自动修复后
```
✅ 成功修复: 393 处 (87.7%)
⚠️  无法自动修复: 49 处 (需要手动添加翻译键)
📁 修改的文件数: 57
```

## 🔍 什么会被修复？

### 自动修复的情况
```javascript
// Before
t('admin.content.banners.actions.save', '保存')

// After
t('admin.content.banners.actions.save', '저장')
```

### 需要手动处理的情况

#### 情况 1: 键不存在于 ko.json
```javascript
// 无法自动修复
t('admin.menu.statistics', '统计报告')

// 需要先添加翻译到 ko.json
{
  "admin": {
    "menu": {
      "statistics": "통계 보고서"  // 添加这个
    }
  }
}

// 然后重新运行自动修复
```

#### 情况 2: ko.json 中的值也是中文
```javascript
// ko.json 错误示例
{
  "common": {
    "language": {
      "chinese": "中文"  // ❌ 应该是韩语
    }
  }
}

// 修正为
{
  "common": {
    "language": {
      "chinese": "중국어"  // ✅ 正确的韩语
    }
  }
}
```

## 🛠️ 完整修复流程

### 第一次运行

```bash
# 1️⃣ 检查问题
uv run python .agent/skills/dev-i18n_check/scripts/i18n_check.py frontend/src
# 输出: 发现 448 处中文 fallback

# 2️⃣ 批量自动修复
uv run python .agent/skills/dev-i18n_check/scripts/auto_fix_fallbacks.py frontend/src --apply
# 输出: 成功修复 393 处，无法修复 49 处

# 3️⃣ 查看需要手动处理的
cat .agent/skills/dev-i18n_check/MANUAL_FIX_NEEDED.md
```

### 手动添加翻译键

根据 `MANUAL_FIX_NEEDED.md` 中的提示，在对应的模块中添加翻译：

```bash
# 例如: 缺少 admin.menu.statistics
# 编辑 frontend/src/admin/layouts/locales/ko.json
{
  "admin": {
    "menu": {
      "statistics": "통계 보고서"  // 添加韩语翻译
    }
  }
}

# 同时编辑 frontend/src/admin/layouts/locales/zh.json
{
  "admin": {
    "menu": {
      "statistics": "统计报告"  // 添加中文翻译
    }
  }
}
```

### 第二次运行

```bash
# 4️⃣ 重新运行自动修复（修复剩余问题）
uv run python .agent/skills/dev-i18n_check/scripts/auto_fix_fallbacks.py frontend/src --apply
# 输出: 成功修复 49 处

# 5️⃣ 最终检查
uv run python .agent/skills/dev-i18n_check/scripts/i18n_check.py frontend/src
# 输出: ✅ 未发现中文 fallback
```

## 💡 常见问题

### Q: 修复安全吗？
A: 非常安全！
- 支持预览模式，先查看要修改什么
- 只替换真正的韩语翻译，避免错误替换
- 智能检测韩语/中文字符

### Q: 为什么不是 100% 自动修复？
A: 因为有些翻译键在 ko.json 中不存在，或者 ko.json 中的值也是中文。这些需要手动添加正确的韩语翻译。

### Q: 需要多久？
A:
- 检查: 5-10 秒
- 自动修复: 10-20 秒
- 手动添加翻译键: 10-30 分钟（取决于熟练度）

### Q: 会破坏代码吗？
A: 不会！脚本只替换 `t()` 函数的第二个参数（fallback），不会改变任何逻辑。

## 📖 更多帮助

- 详细文档: [scripts/README.md](.agent/skills/dev-i18n_check/scripts/README.md)
- Skill 说明: [SKILL.md](.agent/skills/dev-i18n_check/SKILL.md)
- 检查报告: [I18N_ISSUES.md](.agent/skills/dev-i18n_check/I18N_ISSUES.md)
- 手动修复列表: [MANUAL_FIX_NEEDED.md](.agent/skills/dev-i18n_check/MANUAL_FIX_NEEDED.md)

## 🎉 成功标志

当你看到这个输出时，说明修复完成：

```bash
🔍 检查中文 fallback...
✅ 未发现中文 fallback

🔍 检查硬编码文本...
✅ 未发现硬编码文本

✅ 所有翻译文件已同步
```

恭喜！你的项目现在有了正确的 i18n 实现！🎊
