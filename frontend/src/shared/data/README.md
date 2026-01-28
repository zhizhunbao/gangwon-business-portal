# 行业分类数据管理指南

## 概述

`industryClassification.js` 是所有行业分类数据的**唯一数据源** (Single Source of Truth)。

## 数据结构

### 1. 创业类型 (STARTUP_TYPE_KEYS)
```javascript
import { STARTUP_TYPE_KEYS } from '@/shared/data/industryClassification';
```
- 学生创业、教员创业、女性企业等 12 种类型
- 用于：注册页面、会员信息、统计筛选

### 2. 业务领域 (BUSINESS_FIELD_KEYS)
```javascript
import { BUSINESS_FIELD_KEYS } from '@/shared/data/industryClassification';
```
- 制造业重点分类 (13-31)
- 用于：注册页面、会员信息、统计筛选

### 3. KSIC 标准产业分类

#### 大分类 (KSIC_MAJOR_CATEGORY_KEYS)
```javascript
import { KSIC_MAJOR_CATEGORY_KEYS } from '@/shared/data/industryClassification';
```
- A-U 共 21 个大分类
- 用于：注册页面、会员信息、统计筛选

#### 中分类 (KSIC_SUB_CATEGORY_KEYS)
```javascript
import { 
  KSIC_SUB_CATEGORY_KEYS,
  getSubCategoryKeysByMajor 
} from '@/shared/data/industryClassification';

// 获取 C 类的中分类
const subCategories = getSubCategoryKeysByMajor('C');
```
- 按大分类分组的中分类
- 用于：级联选择器

### 4. 主力产业 KSIC 代码

#### 大分类 (MAIN_INDUSTRY_KSIC_MAJOR_KEYS)
```javascript
import { MAIN_INDUSTRY_KSIC_MAJOR_KEYS } from '@/shared/data/industryClassification';
```
- natural_bio (天然物生物)
- ceramic (陶瓷)
- digital_health (数字医疗)

#### 详细代码 (MAIN_INDUSTRY_KSIC_CODES)
```javascript
import { 
  MAIN_INDUSTRY_KSIC_CODES,
  getMainIndustryKsicCodesByMajor 
} from '@/shared/data/industryClassification';

// 获取天然物生物的详细代码
const codes = getMainIndustryKsicCodesByMajor('natural_bio');
```

## 使用示例

### 在组件中使用

```javascript
import { useTranslation } from 'react-i18next';
import { 
  STARTUP_TYPE_KEYS,
  KSIC_MAJOR_CATEGORY_KEYS,
  translateOptions 
} from '@/shared/data/industryClassification';

function MyComponent() {
  const { t } = useTranslation();
  
  // 翻译选项
  const startupTypeOptions = translateOptions(STARTUP_TYPE_KEYS, t);
  const majorCategoryOptions = translateOptions(KSIC_MAJOR_CATEGORY_KEYS, t);
  
  return (
    <select>
      {startupTypeOptions.map(opt => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
```

### 级联选择器

```javascript
import { useState } from 'react';
import { 
  KSIC_MAJOR_CATEGORY_KEYS,
  getSubCategoryKeysByMajor,
  translateOptions 
} from '@/shared/data/industryClassification';

function CascadeSelector() {
  const { t } = useTranslation();
  const [majorCategory, setMajorCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  
  const majorOptions = translateOptions(KSIC_MAJOR_CATEGORY_KEYS, t);
  const subOptions = majorCategory 
    ? translateOptions(getSubCategoryKeysByMajor(majorCategory), t)
    : [];
  
  return (
    <>
      <select 
        value={majorCategory} 
        onChange={(e) => {
          setMajorCategory(e.target.value);
          setSubCategory(''); // 重置子分类
        }}
      >
        <option value="">选择大分类</option>
        {majorOptions.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      
      <select 
        value={subCategory} 
        onChange={(e) => setSubCategory(e.target.value)}
        disabled={!majorCategory}
      >
        <option value="">选择中分类</option>
        {subOptions.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </>
  );
}
```

## 工具函数

### translateOptions(options, t)
将选项数组翻译为带 label 的格式
```javascript
const translated = translateOptions(STARTUP_TYPE_KEYS, t);
// [{ value: 'student_startup', label: '学生创业' }, ...]
```

### getLabelKeyByValue(options, value)
根据 value 查找 labelKey
```javascript
const labelKey = getLabelKeyByValue(STARTUP_TYPE_KEYS, 'student_startup');
// 'industryClassification.startupType.student_startup'
```

### isValidOption(options, value)
验证值是否在选项中
```javascript
const isValid = isValidOption(STARTUP_TYPE_KEYS, 'student_startup');
// true
```

## 迁移指南

### 从旧文件迁移

如果你的代码从以下文件导入：
- `frontend/src/member/modules/performance/enum.js`
- `frontend/src/admin/modules/statistics/enum.js`

请更新为：
```javascript
// ❌ 旧方式
import { STARTUP_TYPE_KEYS } from '@/member/modules/performance/enum';

// ✅ 新方式
import { STARTUP_TYPE_KEYS } from '@/shared/data/industryClassification';
```

旧文件已更新为重新导出，保持向后兼容，但建议尽快迁移。

## 添加新数据

### 1. 添加新的创业类型
```javascript
// 在 STARTUP_TYPE_KEYS 数组中添加
{ value: 'new_type', labelKey: 'industryClassification.startupType.new_type' }
```

### 2. 添加新的 KSIC 分类
```javascript
// 在 KSIC_MAJOR_CATEGORY_KEYS 中添加大分类
{ value: 'V', labelKey: 'industryClassification.ksicMajor.V' }

// 在 KSIC_SUB_CATEGORY_KEYS 中添加对应的中分类
V: [
  { value: '100', labelKey: 'industryClassification.ksicSub.100' }
]
```

### 3. 添加翻译
在 i18n 文件中添加对应的翻译键：
```json
{
  "industryClassification": {
    "startupType": {
      "new_type": "新类型"
    }
  }
}
```

## 注意事项

1. **不要重复定义数据** - 所有数据应从此文件导入
2. **保持数据格式一致** - 使用 `{ value, labelKey }` 格式
3. **使用 labelKey 而非硬编码文本** - 支持国际化
4. **添加新数据时同步更新翻译** - 确保所有语言都有对应翻译
5. **使用工具函数** - 避免重复实现相同逻辑

## 相关文件

- 数据源: `frontend/src/shared/data/industryClassification.js`
- 翻译文件: `frontend/src/locales/*/industryClassification.json`
- 使用示例: 
  - `frontend/src/member/modules/auth/components/RegisterStep4Business.jsx`
  - `frontend/src/member/modules/performance/components/CompanyInfo/CompanyBusinessInfo.jsx`
  - `frontend/src/admin/modules/statistics/components/Filter/IndustryFilters.jsx