---
name: dev-frontend_patterns
description: 前端开发模式专家。专注于江原道企业门户项目，采用 VUE-like 的结构拆分（Views/Modules/Shared）和严格的开发顺序。
---

# 前端开发模式 (江原道企业门户专项)

**技术栈**: React 18, Vite, Zustand, Tailwind CSS, i18next

## 1. 核心架构 (Architecture)

### 目录结构

```
frontend/src/
├── admin/              # 管理员端门户 (Portal)
│   ├── layouts/
│   └── modules/        # 管理端功能模块 (Members, Statistics)
├── member/             # 企业端门户 (Portal)
│   ├── layouts/
│   └── modules/        # 企业端功能模块 (Home, Performance)
├── shared/             # 全局共享 (Infrastructure)
│   ├── components/     # UI 基础组件 (Button, Table, Pagination)
│   ├── services/       # 全局基础 API 服务
│   ├── i18n/           # 国际化配置
│   └── stores/         # Zustand 状态
└── App.jsx             # 路由分发
```

### 模块化原则 (Modularity)

- **物理隔离**: 业务逻辑必须放在角色对应的 `modules/{module_name}` 下。
- **防止交叉**: 严格禁止 `admin/modules` 直接引用 `member/modules` 的私有组件。
- **共享提取**: 只有真正通用的逻辑才提取到 `shared/`。

---

## 2. 模块开发强制流程 (Mandatory Workflow)

所有新模块开发必须**严格遵循**以下顺序。严禁跳过步骤或随意定义文件位置。

### Step 1: 初始化

在 `admin/modules` 或 `member/modules` 下创建模块文件夹。

### Step 2: 内部编码顺序 (Coding Sequence)

#### ① `enum.js` (必须第一步)

- **强制要求**:
  - 必须先创建此文件。
  - **所有** API 路径、常量、状态枚举必须定义在此。
  - **严禁**使用 `constants.js` 或散落在文件顶部的 `const`。
  - **严禁**在 UI 组件中出现魔法字符串（Magic Strings）。

#### ② `locales/` (必须第二步)

- **强制要求**:
  - 定义 `zh.json` 和 `ko.json`。
  - 界面上**所有**显示的文字必须提取到这里。
  - **严禁**在组件中直接写中文/韩文。

#### ③ `services/` (必须第三步)

- **职责**:
  - 封装 API 请求。
  - 只能引用 `enum.js` 中的 API_PATH，禁止硬编码 URL。
  - 负责后端数据结构 (snake_case) 与前端 (camelCase) 的转换。

#### ④ `hooks/` (必须第四步 - 逻辑中心)

- **强制要求**:
  - **所有** 业务逻辑（状态管理、API 调用、表单处理）必须封装在 `hooks/` 下。
  - View 组件**只允许**调用 Hook 获取数据和方法。
  - View 组件**严禁**包含复杂的 `useEffect` 或 API 直接调用。

#### ⑤ `components/` (必须第五步)

- **职责**:
  - 开发模块私有的“哑组件” (Dumb Components)。
  - **重要**: Shared 组件（如 Button, Table）必须在此层被封装。
  - 只通过 Props 接收数据，不包含业务逻辑。
- **目录组织原则 (Logical Classification)**:
  - 当组件超过 5 个时，必须按页面布局的逻辑区域进行二级目录分类：
    - `Header/`: 包含页面标题、操作按钮、面包屑等。
    - `Filter/`: 包含筛选面板、子过滤器、筛选摘要项等。
    - `Report/` 或 `Content/`: 包含主数据表格、图表、列表项等。
    - `Status/` 或 `Feedback/`: 包含错误提示、加载占位、空状态等。
  - **禁止使用 `index.js`**: 严禁在任何目录下使用 `index.js` 作为导出入口。必须显式引用具体文件（例如：引入 `Header` 下的 `ReportHeader` 必须写完整路径 `../Header/ReportHeader`）。

#### ⑥ `views/` (必须第六步)

- **职责**:
  - 页面拼装者。
  - **严禁**: 直接引入或使用 `@shared/components`。必须通过模块内的 `components/` 进行封装或组合。
  - 职责仅限：调用 Hooks 获取数据 -> 传递给 Components 渲染。

#### ⑦ `index.js` (最后一步)

- **职责**:
  - 模块出口。仅导出外部需要的 View 或常量，隐藏内部细节。

### Step 3: 系统注册

1. **i18n**: 在 `shared/i18n/index.js` 中引入模块 locales。
2. **Router**: 在 `router.jsx` 中懒加载并配置路由。
3. **Menu**: 在 `Sidebar.jsx` (Admin) 或 `Submenu` (Member) 中添加导航。

---

## 3. 关键代码规范 (Guidelines)

### Service 职责

- 负责 API 请求与字段映射。
- 不捕获错误，抛出给 UI 层（Hook）处理。

### 国际化 (i18n)

- **Fallback 必须有中文备选**：`t('key', '中文默认值')`。
- 业务文本必须定义在模块内部 `locales/`。

### 视觉风格

- **专业行政风**：偏向政府办公系统的稳重感。
- **配色**：以深蓝/灰为主，强调列表清晰度。

### Tailwind CSS 规范 (Styling Rules)

**强制要求**: 本项目使用 **Tailwind CSS**，**严禁**创建自定义 CSS 文件（`*.css`）。

#### ① 类名优先原则
```jsx
// ✅ 正确: 使用 Tailwind 类名
<div className="bg-white shadow-sm rounded-lg border border-gray-200 p-4">
  <h2 className="text-lg font-semibold text-gray-900">标题</h2>
</div>

// ❌ 错误: 创建自定义 CSS 文件
import "./statistics.css"
<div className="statistics-panel">...</div>
```

#### ② 项目配色 (tailwind.config.js)
```javascript
// 主色 primary (深蓝)
primary-500: '#0052a4'  // 主按钮、链接
primary-700: '#003777'  // 悬停状态

// 辅助色 secondary (绿色)
secondary-500: '#22c55e'  // 成功状态

// 强调色 accent (红色)
accent: '#d32f2f'  // 警告、错误

// 表面色
surface: '#ffffff'  // 卡片背景
background: '#f5f6f7'  // 页面背景
```

#### ③ 常用布局模式
```jsx
// 页面容器
<div className="w-full">
  <main className="w-full space-y-5">...</main>
</div>

// 卡片容器
<div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
  ...
</div>

// 筛选行
<div className="flex items-center gap-3">...</div>

// 表格容器
<div className="overflow-x-auto">
  <table className="min-w-full divide-y divide-gray-200">...</table>
</div>
```

#### ④ 响应式断点
```jsx
// sm: 640px, md: 768px, lg: 1024px, xl: 1280px
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  ...
</div>
```

#### ⑤ 动态类名
```jsx
// 使用模板字符串处理条件类名
<button className={`px-4 py-2 rounded ${
  isActive ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-700'
}`}>
```

---

## 4. 前后端字段一致性检查 (Frontend-Backend Field Consistency)

**强制要求**: 前端参数必须与后端 Schema 严格对齐，防止 `400 ValidationError`。

### ① 字段映射规则

```
前端 (camelCase)  →  后端 (snake_case)
─────────────────────────────────────────
majorIndustryCodes  →  major_industry_codes
pageSize            →  page_size
searchQuery         →  search_query
```

`api.service.js` 自动处理 `camelCase → snake_case` 转换。

### ② enum.js 中的参数分离

```javascript
// ✅ 正确: 明确区分后端参数和 UI-only 参数

/**
 * 后端支持的查询参数 (与 backend/schemas.py 对齐)
 */
export const DEFAULT_QUERY_PARAMS = {
  year: 2025,
  majorIndustryCodes: [],  // 后端支持
  policyTags: [],          // 后端支持
  page: 1,
  pageSize: 20,
};

/**
 * UI 扩展参数 (仅前端使用，不发送到后端)
 */
export const UI_EXTENDED_PARAMS = {
  subIndustryCodes: [],    // 后端暂不支持
  location: null,          // 后端暂不支持
};

/**
 * 完整的 UI 筛选参数 (用于初始化 FilterPanel)
 */
export const FULL_FILTER_PARAMS = {
  ...DEFAULT_QUERY_PARAMS,
  ...UI_EXTENDED_PARAMS,
};
```

### ③ buildQueryParams 过滤 UI 参数

```javascript
// 在发送 API 请求前，必须过滤掉 UI-only 参数
const UI_EXTENDED_KEYS = new Set([
  "subIndustryCodes",
  "location",
  // ... 其他 UI-only 字段
]);

export const buildQueryParams = (params) => {
  const cleanParams = {};
  Object.entries(params).forEach(([key, value]) => {
    // 跳过 UI-only 参数
    if (UI_EXTENDED_KEYS.has(key)) return;
    // 跳过空值
    if (value === null || value === "" ||
        (Array.isArray(value) && value.length === 0)) return;
    cleanParams[key] = value;
  });
  return cleanParams;
};
```

### ④ 一致性检查清单

开发新模块前，必须完成以下对齐检查：

| 检查项 | 说明 |
|--------|------|
| 后端 Schema 分析 | 阅读 `backend/src/modules/{module}/schemas.py` |
| 字段映射表 | 列出所有字段的 camelCase ↔ snake_case 对应 |
| **字段类型一致性** | 确认前后端字段类型匹配（见下表） |
| 枚举值一致性 | 确认枚举值大小写（如 `MALE` vs `male`） |
| 可选字段处理 | 确认 `null` vs `""` vs `[]` 的处理方式 |
| UI 扩展字段标记 | 明确标记后端不支持的字段 |

#### 字段类型映射表 (Type Mapping)

| Python (Backend) | TypeScript/JS (Frontend) | 数据库可能格式 | 转换注意事项 |
|------------------|-------------------------|---------------|-------------|
| `List[str]` | `string[]` | `["A","B"]`, `"A,B"`, `"A"` | 使用 `ensure_list()` |
| `Optional[int]` | `number \| null` | `123`, `"123"`, `null` | 使用 `parseInt()` |
| `Optional[float]` | `number \| null` | `1.5`, `"1.5"`, `null` | 使用 `parseFloat()` |
| `Optional[bool]` | `boolean \| null` | `true`, `"true"`, `1` | 使用 `Boolean()` |
| `Enum` | `string` (常量) | `"MALE"`, `"male"` | 检查大小写一致 |
| `Optional[str]` | `string \| null` | `"text"`, `""`, `null` | 空字符串 vs null |

#### 后端类型安全辅助函数

```python
# backend/src/modules/{module}/service.py

import json
from typing import List

def ensure_list(value) -> List[str]:
    """确保返回值是列表格式 (处理数据库多种存储格式)"""
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        if value.startswith('['):
            try:
                parsed = json.loads(value)
                if isinstance(parsed, list):
                    return parsed
            except json.JSONDecodeError:
                pass
        if ',' in value:
            return [v.strip() for v in value.split(',') if v.strip()]
        return [value] if value.strip() else []
    return []

def ensure_float(value, default: float = 0.0) -> float:
    """确保返回值是 float 格式"""
    if value is None:
        return default
    try:
        return float(value)
    except (ValueError, TypeError):
        return default

def ensure_int(value, default: int = 0) -> int:
    """确保返回值是 int 格式"""
    if value is None:
        return default
    try:
        return int(value)
    except (ValueError, TypeError):
        return default
```

#### 使用示例

```python
# ❌ 错误: 直接使用数据库值 (可能类型不匹配)
items.append({
    "policy_tags": row.get("participation_programs") or [],  # 可能是字符串!
    "total_investment": row.get("total_investment") or 0,    # 可能是字符串!
})

# ✅ 正确: 使用类型安全辅助函数
items.append({
    "policy_tags": ensure_list(row.get("participation_programs")),
    "total_investment": ensure_float(row.get("total_investment")),
    "patent_count": ensure_int(row.get("patent_count")),
})
```

### ⑤ 常见错误与修复

```javascript
// ❌ 错误: 发送后端不支持的字段
fetch('/api/statistics', {
  body: JSON.stringify({ location: 'seoul' })  // 400 Error!
});

// ✅ 正确: 使用 buildQueryParams 过滤
const params = buildQueryParams(filters);  // location 被过滤
fetch('/api/statistics', { body: JSON.stringify(params) });

// ❌ 错误: 枚举值大小写不一致
{ gender: 'male' }  // 后端期望 'MALE'

// ✅ 正确: 使用 enum.js 定义的常量
import { GENDER } from '../enum';
{ gender: GENDER.MALE }  // 'MALE'
```

### ⑥ 前端调试代码规范 (Frontend Debugging)

**强制要求**: 调试时必须使用 `JSON.stringify` 展开对象，禁止直接 `console.log` 对象引用。

```javascript
// ❌ 错误: 直接打印对象 (浏览器会显示 {…} 折叠形式)
console.log("[Debug] error:", error);
console.log("[Debug] response:", error.response?.data);

// ✅ 正确: 使用 JSON.stringify 强制展开
console.log("[Debug] error:", JSON.stringify(error, null, 2));
console.log("[Debug] response:", JSON.stringify(error.response?.data, null, 2));

// ✅ 推荐: 调试模板 (复制使用)
const debugLog = (label, data) => {
  console.log(`[DEBUG] ${label}:`, JSON.stringify(data, null, 2));
};

// 使用示例
debugLog("API Request params", cleanParams);
debugLog("API Response error", error.response?.data);
```

**Service 层调试模板**:
```javascript
async queryData(params) {
  try {
    const cleanParams = buildQueryParams(params);
    console.log("[Service] Input params:", JSON.stringify(params, null, 2));
    console.log("[Service] Cleaned params:", JSON.stringify(cleanParams, null, 2));

    const response = await apiService.get(API_ENDPOINT, cleanParams);
    console.log("[Service] Response:", JSON.stringify(response, null, 2));
    return response;
  } catch (error) {
    console.error("[Service] Error:", JSON.stringify(error, null, 2));
    console.error("[Service] Error response:", JSON.stringify(error.response?.data, null, 2));
    throw error;
  }
}
```

---

## 5. 自动化质量自检 (Automated Quality Checks)

在提交任何前端代码前，必须参考以下四个代码检查 Skill 进行自检。

### 1. 代码质量与复杂度 (基于 dev-code_quality_check)

- **目标**: 防止代码过于复杂和冗长。
- **检查命令**:
  ```bash
  # 检查特定文件
  uv run python .agent/skills/dev-code_quality_check/scripts/check_code_format.py [file_path]
  ```
- **核心标准**:
  - 单个文件 < 800 行
  - 单个函数 < 50 行
  - 嵌套深度 < 4 层

### 2. 目录结构与命名 (基于 dev-code_standards)

- **目标**: 确保目录结构和命名符合项目规范。
- **验证清单**:
  - [ ] 目录按 **Features/Modules** (功能) 而非 Type (类型) 组织。
  - [ ] 组件文件使用 `PascalCase.jsx`，非组件使用 `camelCase.js`。
  - [ ] 严禁出现 `utils.js` (必须明确意图，如 `dateUtils.js`)。

### 3. 代码风格与格式化 (基于 dev-code_style)

- **目标**: 统一代码外观，消除格式争论。
- **检查命令**:
  ```bash
  # 格式化
  npm run format
  # Lint 检查
  npm run lint
  ```
- **核心标准**:
  - 缩进: 2 空格
  - 引号: 双引号
  - 无 `console.log` (Linter 会报错)

### 4. 编码规范与原则 (基于 dev-coding_standards)

- **目标**: 遵循最佳编码实践。
- **核心原则**:
  - **不可变性 (Immutability)**: 严禁直接修改 State 或 Props (使用 `...spread` 或 `produce`)。
  - **魔法数字**: 严禁在 UI 中出现魔法数字或硬编码文本 (必须使用 `enums` 或 `i18n`)。
  - **错误处理**: Service 不吞没错误，Hook 统一处理错误。

---

_本规范由 dev-frontend_patterns skill 为江原道企业门户项目定制生成。_
