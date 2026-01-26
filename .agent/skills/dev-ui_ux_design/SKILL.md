---
name: dev-ui_ux_design
description: 江原道企业门户 UI/UX 设计系统专家。专注于政务管理系统的专业性、高级感及交互体验。
---

# UI/UX 设计系统 (江原道企业门户专项)

## 1. 核心设计原则 (Design Principles)

1. **行政专业感 (Administrative Professionalism)**: 使用深蓝 (#1e40af) 和灰色系为主色调，强调稳重、可信。
2. **高密度信息展示 (High Density)**: 管理端页面应在不拥挤的前提下尽可能多地展示常用筛选和数据项，减少滚动。
3. **视觉层级 (Visual Hierarchy)**:
   - 使用卡片 (`Card`) 隔离不同功能块。
   - 使用 `FormRow` 保持标签对齐。
   - 重要的统计数据使用大号粗体和品牌色强调。
4. **细节精致 (Refinement)**:
   - 边框: 使用 `border-gray-200` 或 `ring-gray-100`。
   - 阴影: 使用 `shadow-sm` 保持轻盈，避免过度阴影。
   - 圆角: 统一使用 `rounded-lg` 或 `rounded-xl`。

## 2. 布局模式 (Layout Patterns)

### 筛选面板 (Filter Panel)

- **容器**: 使用单一 `Card` 容器或多个紧凑排列的子卡片。
- **网格**: 建议使用 `grid-cols-1 lg:grid-cols-2` 布局，保持左右平衡。
- **间距**: `gap-x-12` (水平) 和 `gap-y-4` (垂直)。
- **标签**: 统一 `labelWidth` (默认为 `w-32`)。

### 数据展示 (Data Display)

- **表格**:
  - 表头背景色: `bg-gray-50`。
  - 行悬停效果: `hover:bg-blue-50/30`。
  - 重点字段（如企业名）: `font-medium text-gray-900`。
- **摘要栏 (Summary Bar)**: 在表格上方显示“总计”、“当前筛选”等摘要，使用淡蓝色背景或细边框。

## 3. 颜色与组件标准 (Component Standards)

### 品牌色 (Brand Colors)

- **Primary**: `blue-600` (#2563eb) -> 用于主按钮、激活状态。
- **Dark Primary**: `blue-800` (#1e40af) -> 用于标题、导航。
- **Success**: `emerald-600` -> 用于“已批准”、“盈利”等。
- **Warning**: `amber-500` -> 用于“待审批”、“风险”等。

### 表单元素 (Form Elements)

- **Input/Select**: 统一高度 `h-9`。
- **Placeholder**: 字体颜色 `text-gray-400`。
- **Checkbox/Radio**: 增加 `py-1.5` 垂直间距，便于点击。

## 4. 统计报表专项 (Statistics Portal Features)

- **联动组件**: 大类与小类联动时，左右排列，中间无多余修饰。
- **数值区间**: 使用 `Min ~ Max` 模式，Input 宽度固定 (如 `w-24`)。
- **标签组**: 多选筛选使用 `Checkbox` 水平铺开，超出时自动换行。

---

_本规范旨在确保江原道企业门户所有模块在视觉和交互上达成 100% 一致。_
