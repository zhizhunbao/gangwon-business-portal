# API 设计 - 统计报告 (Statistics Report API)

本文档定义了管理端统计报告模块的接口规范。遵循 **`dev-api-design`** 规范及江原道项目术语约定。

## 1. 基础信息

- **Base URL**: `/api/admin/statistics`
- **认证方式**: JWT Bearer Token (需 `Admin` 权限)
- **数据格式**: JSON (Request & Response)

## 2. 接口列表

### 2.1 获取统计数据列表 (Get Statistics List)

用于在管理后台展示企业统计列表，支持多维度复合筛选。

- **URL**: `/report`
- **Method**: `GET`
- **Query Parameters**:
  - `year`: `integer` (可选) - 筛选年度
  - `quarter`: `integer` (可选, 1-4) - 筛选季度
  - `month`: `integer` (可选, 1-12) - 筛选月份
  - `major_industry_codes[]`: `array[string]` (可选) - 标准产业大类代码
  - `gangwon_industry_codes[]`: `array[string]` (可选) - **主导产业代码**
  - `policy_tags[]`: `array[string]` (可选) - 政策关联标签 (如 `RISE`, `GLOBAL_GLOCAL`)
  - `startup_stages[]`: `array[string]` (可选) - 创业阶段 (如 `pre_startup`, `initial`, `growth`)
  - `has_investment`: `boolean` (可选) - 是否有投资引进
  - `min_investment`: `float` (可选) - 最小投资额 (韩元)
  - `max_investment`: `float` (可选) - 最大投资额 (韩元)
  - `min_patents`: `integer` (可选) - 最小专利数
  - `max_patents`: `integer` (可选) - 最大专利数
  - `gender`: `string` (可选, `MALE`, `FEMALE`) - 代表人性别
  - `min_age`: `integer` (可选) - 代表人最小年龄
  - `max_age`: `integer` (可选) - 代表人最大年龄
  - `min_work_years`: `integer` (可选) - 最小工龄
  - `max_work_years`: `integer` (可选) - 最大工龄
  - `search_query`: `string` (可选) - 企业名或事业者注册号模糊搜索
  - `page`: `integer` (默认 1)
  - `page_size`: `integer` (默认 10)
  - `sort_by`: `string` (可选, `enterprise_name`, `total_investment`, `patent_count`, `annual_revenue`)
  - `sort_order`: `string` (可选, `asc`, `desc`)

- **Success Response (200 OK)**:
  ```json
  {
    "items": [
      {
        "business_reg_no": "123-45-67890",
        "enterprise_name": "A사",
        "industry_type": "반도체",
        "startup_stage": "growth",
        "policy_tags": ["STARTUP_UNIVERSITY", "RISE"],
        "total_investment": 1500000000.0,
        "patent_count": 5,
        "annual_revenue": 32500000000.0,
        "export_amount": 12000000000.0
      }
    ],
    "total": 125,
    "page": 1,
    "page_size": 10
  }
  ```

### 2.2 导出 Excel 报告 (Export to Excel)

根据当前筛选条件生成并下载 Excel 文件。

- **URL**: `/export`
- **Method**: `GET`
- **Query Parameters**: 与 `GET /report` 完全一致。
- **Success Response (200 OK)**:
  - **Content-Type**: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
  - **Content-Disposition**: `attachment; filename=gangwon_stats_20260125.xlsx`

## 3. 数据模型映射 (Schema Mapping)

| 业务名称      | 后端字段 (Snake)   | 前端字段 (Camel)  | 类型       |
| ------------- | ------------------ | ----------------- | ---------- |
| 事业者注册号  | `business_reg_no`  | `businessRegNo`   | `string`   |
| 企业名称      | `enterprise_name`  | `enterpriseName`  | `string`   |
| 营收 (韩元)   | `annual_revenue`   | `annualRevenue`   | `float`    |
| 投资额 (韩元) | `total_investment` | `totalInvestment` | `float`    |
| 专利数        | `patent_count`     | `patentCount`     | `integer`  |
| 政策标签      | `policy_tags`      | `policyTags`      | `string[]` |

## 4. 错误处理

| 状态码 | 错误码             | 描述                                     |
| ------ | ------------------ | ---------------------------------------- |
| 401    | `UNAUTHORIZED`     | 未携带有效 Token                         |
| 403    | `FORBIDDEN`        | 权限不足（非 Admin 角色）                |
| 400    | `VALIDATION_ERROR` | 查询参数格式错误（如月份不在 1-12 之间） |

---

_本设计由 dev-api-design skill 为江原道企业门户项目定制生成。_
