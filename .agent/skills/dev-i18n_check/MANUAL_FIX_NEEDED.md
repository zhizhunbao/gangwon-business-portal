# 需要手动处理的 i18n 问题
生成时间: d:\BaiduSyncdisk\workspace\python_workspace_2025\gangwon-business-portal\.agent\skills\dev-i18n_check

## 概览
- 无法自动修复的问题总数: **4**

### ko.json 中的值也是中文或相同 (4 处)

#### 📄 `frontend\src\admin\modules\content\NoticeManagement.jsx`

**行 260**
- 键: `admin.content.notices.form.fields.contentHtml`
- 中文 fallback: `内容`
- ko.json 当前值: `내容`


#### 📄 `frontend\src\member\modules\projects\components\ApplicationModal\index.jsx`

**行 151**
- 键: `projects.application.validationError`
- 中文 fallback: `필수 항목을 확인한 뒤 다시 시度해주세요.`
- ko.json 当前值: `필수 항목을 확인한 뒤 다시 시度해주세요.`


**行 140**
- 键: `projects.application.validationError`
- 中文 fallback: `필수 항목을 확인한 뒤 다시 시度해주세요.`
- ko.json 当前值: `필수 항목을 확인한 뒤 다시 시度해주세요.`


**行 129**
- 键: `projects.application.validationError`
- 中文 fallback: `필수 항목을 확인한 뒤 다시 시度해주세요.`
- ko.json 当前值: `필수 항목을 확인한 뒤 다시 시度해주세요.`


## 修复建议

### 1. 键不存在的情况
需要在对应的 locales/ko.json 和 locales/zh.json 中添加翻译:
```json
{
  "keyName": "한국어 번역"
}
```

### 2. ko.json 中的值也是中文
需要修改 ko.json 中的值为正确的韩语翻译
