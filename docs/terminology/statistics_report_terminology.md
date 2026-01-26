# 统计报告功能 - 术语表 (Statistics Report Terminology)

## 文档说明

本文档定义统计报告功能中所有字段、枚举值、API 参数的统一命名规范，确保前端、后端、数据库三端一致性。

---

## 1. 时间维度 (Time Dimensions)

| 中文名称 | 韩语名称 | Database | Backend API | Frontend Enum          | i18n Key                        |
| -------- | -------- | -------- | ----------- | ---------------------- | ------------------------------- |
| 年度     | 연도별   | year     | year        | TIME_DIMENSION.YEAR    | statistics.filters.time.year    |
| 季度     | 분기별   | quarter  | quarter     | TIME_DIMENSION.QUARTER | statistics.filters.time.quarter |
| 月份     | 월별     | month    | month       | TIME_DIMENSION.MONTH   | statistics.filters.time.month   |

**说明**：

- 前端枚举值: `'year'`, `'quarter'`, `'month'`
- 季度值范围: 1-4
- 月份值范围: 1-12

---

## 2. 创业阶段 (Startup Stages)

| 中文名称 | 韩语名称 | Database    | Backend API | Frontend Enum             | i18n Key                             |
| -------- | -------- | ----------- | ----------- | ------------------------- | ------------------------------------ |
| 预备创业 | 예비창업 | pre_startup | pre_startup | STARTUP_STAGE.PRE_STARTUP | statistics.filters.stage.pre_startup |
| 初创期   | 초기     | initial     | initial     | STARTUP_STAGE.INITIAL     | statistics.filters.stage.initial     |
| 成长期   | 성장     | growth      | growth      | STARTUP_STAGE.GROWTH      | statistics.filters.stage.growth      |
| 跳跃期   | 도약     | leap        | leap        | STARTUP_STAGE.LEAP        | statistics.filters.stage.leap        |
| 再创业   | 재창업   | re_startup  | re_startup  | STARTUP_STAGE.RE_STARTUP  | statistics.filters.stage.re_startup  |

---

## 3. 政策关联项目 (Policy Tags)

| 中文名称     | 韩语名称     | Database           | Backend API | Frontend Enum                  | i18n Key                                      |
| ------------ | ------------ | ------------------ | ----------- | ------------------------------ | --------------------------------------------- |
| 创业中心大学 | 창업중심대학 | STARTUP_UNIVERSITY | policy_tags | POLICY_TAGS.STARTUP_UNIVERSITY | statistics.filters.programs.startupUniversity |
| 全球事业     | 글로벌사업   | GLOBAL_GLOCAL      | policy_tags | POLICY_TAGS.GLOBAL_GLOCAL      | statistics.filters.programs.globalGlocal      |
| RISE 事业团  | RISE 사업단  | RISE               | policy_tags | POLICY_TAGS.RISE               | statistics.filters.programs.rise              |

---

## 4. 投资情况 (Investment)

### 4.1 投资引进与否 (Investment Status)

| 中文名称 | 韩语名称 | Database | Backend API | Frontend Enum         | i18n Key                  |
| -------- | -------- | -------- | ----------- | --------------------- | ------------------------- |
| 是       | 예       | true     | true        | INVESTMENT_STATUS.YES | statistics.investment.yes |
| 否       | 아니오   | false    | false       | INVESTMENT_STATUS.NO  | statistics.investment.no  |
| 全部     | 전체     | -        | null        | INVESTMENT_STATUS.ALL | statistics.investment.all |

### 4.2 投资引进额范围 (Investment Amount Ranges)

| 中文名称   | 韩语名称     | 最小值(韩元) | 最大值(韩元) | Enum Key                      |
| ---------- | ------------ | ------------ | ------------ | ----------------------------- |
| 1000万以上 | 1천만원 이상 | 10,000,000   | null         | INVESTMENT_RANGES.RANGE_1000  |
| 5000万以上 | 5천만원 이상 | 50,000,000   | null         | INVESTMENT_RANGES.RANGE_5000  |
| 1亿以上    | 1억원 이상   | 100,000,000  | null         | INVESTMENT_RANGES.RANGE_10000 |
| 自定义区间 | 사용자 정의  | custom       | custom       | INVESTMENT_RANGES.CUSTOM      |

**字段映射**：

- Database: `investment_status`, `investment_amount`
- Backend API: `min_investment`, `max_investment` (float)
- Frontend: `minInvestment`, `maxInvestment` (number)

---

## 5. 专利持有数量 (Patent Count)

### 5.1 专利数量范围 (Patent Ranges)

| 中文名称   | 韩语名称    | 最小值 | 最大值 | Enum Key               |
| ---------- | ----------- | ------ | ------ | ---------------------- |
| 1个以上    | 1개 이상    | 1      | null   | PATENT_RANGES.RANGE_1  |
| 3个以上    | 3개 이상    | 3      | null   | PATENT_RANGES.RANGE_3  |
| 5个以上    | 5개 이상    | 5      | null   | PATENT_RANGES.RANGE_5  |
| 10个以上   | 10개 이상   | 10     | null   | PATENT_RANGES.RANGE_10 |
| 自定义区间 | 사용자 정의 | custom | custom | PATENT_RANGES.CUSTOM   |

**字段映射**：

- Database: `patent_count`
- Backend API: `min_patents`, `max_patents` (integer)
- Frontend: `minPatents`, `maxPatents` (number)

---

## 6. 企业基础信息字段 (Enterprise Basic Fields)

| 中文名称     | 韩语名称       | Database         | Backend API      | Frontend        | i18n Key                         |
| ------------ | -------------- | ---------------- | ---------------- | --------------- | -------------------------------- |
| 事业者注册号 | 사업자등록번호 | business_reg_no  | business_reg_no  | businessRegNo   | statistics.table.businessRegNo   |
| 企业名称     | 기업명         | enterprise_name  | enterprise_name  | enterpriseName  | statistics.table.enterpriseName  |
| 行业类型     | 업종           | industry_type    | industry_type    | industryType    | statistics.table.industryType    |
| 创业阶段     | 창업단계       | startup_stage    | startup_stage    | startupStage    | statistics.table.startupStage    |
| 政策标签     | 정책 태그      | policy_tags      | policy_tags      | policyTags      | statistics.table.policyTags      |
| 投资总额     | 총 투자금액    | total_investment | total_investment | totalInvestment | statistics.table.totalInvestment |
| 专利数       | 특허 수        | patent_count     | patent_count     | patentCount     | statistics.table.patentCount     |
| 年营收       | 연매출         | annual_revenue   | annual_revenue   | annualRevenue   | statistics.table.annualRevenue   |
| 出口额       | 수출액         | export_amount    | export_amount    | exportAmount    | statistics.table.exportAmount    |

**命名约定说明**：

- **Database**: `snake_case`
- **Backend API (Request)**: `snake_case` (由 api.service 自动转换)
- **Backend API (Response)**: `snake_case` (由 api.service 自动转换为 camelCase)
- **Frontend**: `camelCase`

---

## 7. 代表者特征 (Representative Characteristics)

### 7.1 性别 (Gender)

| 中文名称 | 韩语名称 | Database | Backend API | Frontend Enum | i18n Key             |
| -------- | -------- | -------- | ----------- | ------------- | -------------------- |
| 男       | 남성     | MALE     | MALE        | GENDER.MALE   | common.gender.male   |
| 女       | 여성     | FEMALE   | FEMALE      | GENDER.FEMALE | common.gender.female |

### 7.2 年龄 (Age)

- Backend API: `min_age`, `max_age` (integer)
- Frontend: `minAge`, `maxAge` (number)

---

## 8. 工龄范围 (Work Years)

| 中文名称 | 韩语名称 | 最小值 | 最大值 | Enum Key             | Backend API                        |
| -------- | -------- | ------ | ------ | -------------------- | ---------------------------------- |
| 3年以下  | 3년 이하 | 0      | 3      | WORK_YEARS.UNDER_3   | min_work_years=0, max_work_years=3 |
| 3-7年    | 3-7년    | 3      | 7      | WORK_YEARS.RANGE_3_7 | min_work_years=3, max_work_years=7 |
| 7年以上  | 7년 이상 | 7      | null   | WORK_YEARS.OVER_7    | min_work_years=7                   |

---

## 9. 排序字段 (Sort Fields)

| 中文名称 | Backend API      | Frontend Enum               | i18n Key                    |
| -------- | ---------------- | --------------------------- | --------------------------- |
| 企业名称 | enterprise_name  | SORT_FIELD.ENTERPRISE_NAME  | statistics.sort.companyName |
| 投资金额 | total_investment | SORT_FIELD.TOTAL_INVESTMENT | statistics.sort.investment  |
| 专利数量 | patent_count     | SORT_FIELD.PATENT_COUNT     | statistics.sort.patentCount |
| 年营收   | annual_revenue   | SORT_FIELD.ANNUAL_REVENUE   | statistics.sort.revenue     |

**排序方向**：

- 升序：`asc`
- 降序：`desc`

---

## 10. 分页参数 (Pagination)

| 中文名称 | Backend API | Frontend | 默认值 |
| -------- | ----------- | -------- | ------ |
| 页码     | page        | page     | 1      |
| 每页数量 | page_size   | pageSize | 20     |
| 总记录数 | total       | total    | -      |

---

## 11. API 端点 (API Endpoints)

| 功能         | Method | 路径                           |
| ------------ | ------ | ------------------------------ |
| 查询统计数据 | GET    | `/api/admin/statistics/report` |
| 导出 Excel   | GET    | `/api/admin/statistics/export` |

---

## 12. API 请求示例 (API Request Example)

### 前端发送参数 (Frontend Search Params)

```javascript
const params = {
  year: 2024,
  startupStages: ["initial", "growth"],
  policyTags: ["RISE", "GLOBAL_GLOCAL"],
  minInvestment: 50000000,
  minWorkYears: 3,
  maxWorkYears: 7,
  page: 1,
  pageSize: 20,
};
```

### api.service 自动转换后的请求 (Final HTTP Request)

```
GET /api/admin/statistics/report?year=2024&startup_stages=initial&startup_stages=growth&policy_tags=RISE&policy_tags=GLOBAL_GLOCAL&min_investment=50000000&min_work_years=3&max_work_years=7&page=1&page_size=20
```

---

## 13. 命名规范总结

### 前端 (JavaScript/React)

- 变量/属性: `camelCase`
- 常量/枚举类型: `UPPER_SNAKE_CASE`
- 枚举值: `camelCase` (由 `api.service` 处理) 或 `UPPER_SNAKE_CASE` (直接透传)

### 后端 (Python/FastAPI)

- 变量/参数: `snake_case`
- 类名: `PascalCase`
- 常量: `UPPER_SNAKE_CASE`

### 数据库

- 表名/字段名: `snake_case`

---

**最后更新**: 2026-01-25
**版本**: v1.1 (同步最新实现)
