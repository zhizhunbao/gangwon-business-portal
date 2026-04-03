# Bug Fix 实施计划 — 统计报告筛选功能修复

**来源:** 管理者页面 Bug 反馈 (2026-03-14)
**创建日期:** 2026-03-14
**状态:** ✅ 实施完成

---

## 修改事项总结

总计 **4 个** 修改事项，涉及管理者统计报告页面的筛选功能。

---

## Issue 1: "성장기(7년 이상)" 按钮重复（存在 2 个）

**现象:** 统计报告筛选面板中，"성장기(7년 이상)"按钮出现了 2 个
**优先级:** 🔴 高

### 原因分析

`frontend/src/admin/modules/statistics/enum.js` 的 `STARTUP_STAGE_OPTIONS` 数组中，
`GROWTH` 和 `LEAP` 两个选项使用了相同的翻译键：

```javascript
// 修改前: GROWTH 和 LEAP 使用相同的 labelKey → 渲染出 2 个按钮
{ value: "growth", labelKey: "enums.industry.startupStage.growthOver7Years" },
{ value: "leap",   labelKey: "enums.industry.startupStage.growthOver7Years" }, // 重复！
```

### 修改内容

**文件:** `frontend/src/admin/modules/statistics/enum.js`

从 `STARTUP_STAGE_OPTIONS` 中移除 `LEAP` 项，只保留 4 个创业阶段按钮。

---

## Issue 2: 创业阶段筛选完全无法命中数据（根本原因）

**现象:** 选择任何创业阶段筛选后，表格数据为空或未正确筛选
**优先级:** 🔴 严重

### 原因分析

通过直接查询数据库（Supabase PostgreSQL），发现前端枚举值与数据库实际存储值**完全不匹配**：

**数据库实际数据分布（`members.startup_stage` 字段）：**

| 数据库值 | 数量 |
|---|---|
| `NULL` | 3 条 |
| `growth_over_7years` | 3 条 |
| `preliminary` | 1 条 |
| `startup_under_3years` | 1 条 |

**修改前的枚举值对比：**

| 前端发送的值 | 数据库中存储的值 | 匹配？ |
|---|---|---|
| `pre_startup` | `preliminary` | ❌ 不匹配 |
| `initial` | `startup_under_3years` | ❌ 不匹配 |
| `growth` | `growth_over_7years` | ❌ 不匹配 |
| `re_startup` | `restart` | ❌ 不匹配 |

后端代码（`statistics/service.py` 第 272 行）直接执行：
```python
sb_query = sb_query.in_("startup_stage", query.startup_stages)
```
前端发送 `["growth"]`，但数据库中存的是 `"growth_over_7years"`，`IN` 查询自然无法命中。

### 修改内容

**文件:** `frontend/src/admin/modules/statistics/enum.js`

```diff
 export const STARTUP_STAGE = {
-  PRE_STARTUP: "pre_startup",
-  INITIAL: "initial",
-  GROWTH: "growth",
+  PRE_STARTUP: "preliminary",
+  INITIAL: "startup_under_3years",
+  GROWTH: "growth_over_7years",
   LEAP: "leap",
-  RE_STARTUP: "re_startup",
+  RE_STARTUP: "restart",
 };
```

---

## Issue 3: 筛选摘要胶囊的 stageKeyMap 同步更新

**优先级:** 🟡 中（依赖 Issue 2）

### 修改内容

**文件:** `frontend/src/admin/modules/statistics/hooks/useStatisticsFilters.js`

```diff
 const stageKeyMap = {
-  pre_startup: "preliminary",
-  initial: "startupUnder3Years",
-  growth: "growthOver7Years",
+  preliminary: "preliminary",
+  startup_under_3years: "startupUnder3Years",
+  growth_over_7years: "growthOver7Years",
-  re_startup: "restart",
+  restart: "restart",
 };
```

---

## Issue 4: 江原道未来产业枚举遗漏 `new_materials`

**现象:** 数据库中存在 `gangwon_industry = "new_materials"` 的记录（1条），但前端 `GANGWON_FUTURE_INDUSTRIES` 枚举中缺失该选项，导致无法通过筛选面板选中
**优先级:** 🟡 中

### 原因分析

数据库 `members.gangwon_industry` 字段实际值分布：

| 数据库值 | 数量 |
|---|---|
| `bio_health` | 3 条 |
| `NULL` | 3 条 |
| `new_materials` | 1 条 |
| `semiconductor` | 1 条 |

翻译文件中已有 `new_materials` 的翻译（韩 `신소재` / 中 `新材料`），但共享枚举数组中遗漏了该值。

### 修改内容

**文件:** `frontend/src/shared/enums/index.js`

```diff
 export const GANGWON_FUTURE_INDUSTRIES = [
   "semiconductor",
   "bio_health",
   "future_energy",
   "future_mobility",
   "food_tech",
   "advanced_defense",
   "climate_tech",
+  "new_materials",
 ];
```

---

## 修复后创业阶段选项（4 个）

| 前端值（与数据库对齐） | 韩语显示 | 中文显示 |
|---|---|---|
| `preliminary` | 예비 창업 | 预备创业 |
| `startup_under_3years` | 창업 3년 이내 | 创业3年以内 |
| `growth_over_7years` | 성장기 (7년 이상) | 成长期（7年以上）|
| `restart` | 재창업 | 再创业 |

---

## 影响范围

| 文件 | 变更内容 |
|------|----------|
| `frontend/src/admin/modules/statistics/enum.js` | `STARTUP_STAGE` 枚举值对齐数据库 + `STARTUP_STAGE_OPTIONS` 移除 `LEAP` |
| `frontend/src/admin/modules/statistics/hooks/useStatisticsFilters.js` | `stageKeyMap` 键值同步更新 |
| `frontend/src/shared/enums/index.js` | `GANGWON_FUTURE_INDUSTRIES` 添加 `new_materials` |

### 未变更文件

| 文件 | 原因 |
|------|------|
| 翻译文件 (ko/zh enums.json) | 已包含所有需要的翻译 |
| `StageFilters.jsx` / `FilterPanel.jsx` | 无需变更（消费选项数组） |
| `useStatistics.js` / `statistics.service.js` | 无需变更 |
| 后端代码 | 无需变更 |

---

## 全量筛选字段对照检查

已验证 13 个筛选字段全部匹配，详见以下结果：

| 字段 | 筛选方式 | 状态 |
|------|---------|------|
| `startup_stage` | `IN(...)` | ✅ 已修复 |
| `startup_type` | `IN(...)` | ✅ 匹配 |
| `ksic_major` | `IN(...)` | ✅ 匹配 |
| `ksic_sub` | `IN(...)` | ✅ 匹配 |
| `business_field` | `IN(...)` | ✅ 匹配 |
| `main_industry_ksic_major` | `IN(...)` | ✅ 匹配 |
| `gangwon_industry` | `IN(...)` | ✅ 已修复（添加 `new_materials`） |
| `future_tech` | `IN(...)` | ✅ 匹配 |
| `region` | `eq(...)` | ✅ 匹配 |
| `representative_gender` | `eq(...)` | ✅ 匹配 |
| `participation_programs` | `like(...)` | ✅ 匹配 |
| `revenue` / `employee_count` | 数值范围 | ✅ 无枚举问题 |
| `founding_date` (工龄/时间) | 日期范围 | ✅ 无枚举问题 |

---

## 测试清单

- [x] `vite build` 构建成功
- [x] 数据库查询确认所有字段实际值分布
- [x] 创业阶段筛选：4 个按钮正确显示，筛选正常命中
  - "예비 창업" 筛选返回 1 条（세라믹소재 테크）✅
  - "성장기 (7년 이상)" 筛选返回 2 条 ✅
  - 筛选摘要胶囊正确显示 ✅
- [x] 江原道未来产业筛选：`신소재`(新材料) 选项出现且筛选正常
  - 下拉菜单共 9 个选项（1 全体 + 8 产业） ✅
  - "신소재" 出现在列表最后一项 ✅
- [x] 其他筛选字段回归测试正常（13 个字段全部匹配）

---

## 实施完成

2026-03-14 实现、构建验证及浏览器功能测试全部完成。
