/**
 * 统计报告模块 - 枚举和常量定义
 * Statistics Report Module - Enums and Constants
 *
 * 基于术语表: docs/terminology/statistics_report_terminology.md
 * 命名规范:
 * - 常量: UPPER_SNAKE_CASE
 * - 枚举对象: UPPER_SNAKE_CASE
 * - 枚举值: snake_case（与后端保持一致）
 */

// ==================== API 配置 ====================

/**
 * API 前缀
 */
export const API_PREFIX = "/api";

/**
 * 统计报告 API 端点
 */
export const STATISTICS_API = {
  /** 查询统计数据 - GET */
  REPORT: `${API_PREFIX}/admin/statistics/report`,
  /** 导出 Excel - GET */
  EXPORT: `${API_PREFIX}/admin/statistics/export`,
};

// ==================== 时间维度 ====================

/**
 * 时间维度
 * Time Dimensions
 *
 * @enum {string}
 */
export const TIME_DIMENSION = {
  /** 年度 (연도별) */
  YEAR: "year",
  /** 季度 (분기별) */
  QUARTER: "quarter",
  /** 月份 (월별) */
  MONTH: "month",
};

/**
 * 季度选项 (1-4)
 */
export const QUARTER_OPTIONS = [
  { value: 1, label: "1분기" },
  { value: 2, label: "2분기" },
  { value: 3, label: "3분기" },
  { value: 4, label: "4분기" },
];

/**
 * 月份选项 (1-12)
 */
export const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: `${i + 1}`,
}));

// ==================== 创业阶段 ====================

/**
 * 创业阶段
 * Startup Stages
 *
 * @enum {string}
 */
export const STARTUP_STAGE = {
  /** 预备创业 (예비창업) */
  PRE_STARTUP: "pre_startup",
  /** 初创期 (초기) */
  INITIAL: "initial",
  /** 成长期 (성장) */
  GROWTH: "growth",
  /** 跳跃期 (도약) */
  LEAP: "leap",
  /** 再创业 (재창업) */
  RE_STARTUP: "re_startup",
};

/**
 * 创业阶段选项列表
 */
export const STARTUP_STAGE_OPTIONS = [
  {
    value: STARTUP_STAGE.PRE_STARTUP,
    labelKey: "statistics.filters.stage.preStartup",
  },
  {
    value: STARTUP_STAGE.INITIAL,
    labelKey: "statistics.filters.stage.initial",
  },
  { value: STARTUP_STAGE.GROWTH, labelKey: "statistics.filters.stage.growth" },
  { value: STARTUP_STAGE.LEAP, labelKey: "statistics.filters.stage.leap" },
  {
    value: STARTUP_STAGE.RE_STARTUP,
    labelKey: "statistics.filters.stage.reStartup",
  },
];

// ==================== 政策关联项目 ====================

/**
 * 政策关联标签 (Policy Tags)
 *
 * @enum {string}
 */
export const POLICY_TAGS = {
  /** 创业中心大学 (창업중심대학) */
  STARTUP_UNIVERSITY: "STARTUP_UNIVERSITY",
  /** 全球/成长事业 (글로벌·글로컬 사업) */
  GLOBAL_GLOCAL: "GLOBAL_GLOCAL",
  /** RISE 事业团 (RISE 사업단) */
  RISE: "RISE",
};

/**
 * 江原道重点产业
 * Gangwon Province Key Industries
 */
export const GANGWON_INDUSTRIES = {
  NATURAL_BIO: "natural_bio",
  CERAMIC: "ceramic",
  DIGITAL_HEALTH: "digital_health",
};

/**
 * 江原道重点产业选项
 * 从统一数据源导入: MAIN_INDUSTRY_KSIC_MAJOR_KEYS
 */
import { MAIN_INDUSTRY_KSIC_MAJOR_KEYS } from '@/shared/data/industryClassification';
export const GANGWON_INDUSTRY_OPTIONS = MAIN_INDUSTRY_KSIC_MAJOR_KEYS;

/**
 * 创业类型选项 (与会员模块同步)
 * 从统一数据源导入: STARTUP_TYPE_KEYS
 */
import { STARTUP_TYPE_KEYS } from '@/shared/data/industryClassification';
export const STARTUP_TYPE_OPTIONS = STARTUP_TYPE_KEYS;

/**
 * 业务领域选项 (Business Field)
 * 从统一数据源导入: BUSINESS_FIELD_KEYS
 */
import { BUSINESS_FIELD_KEYS } from '@/shared/data/industryClassification';
export const BUSINESS_FIELD_OPTIONS = BUSINESS_FIELD_KEYS;

/**
 * 标准产业分类 (KSIC-大分类)
 * 从统一数据源导入: KSIC_MAJOR_CATEGORY_KEYS
 */
import { KSIC_MAJOR_CATEGORY_KEYS } from '@/shared/data/industryClassification';
export const MAJOR_INDUSTRY_OPTIONS = KSIC_MAJOR_CATEGORY_KEYS;

/**
 * 政策关联选项列表
 */
export const POLICY_TAGS_OPTIONS = [
  {
    value: POLICY_TAGS.STARTUP_UNIVERSITY,
    labelKey: "statistics.filters.programs.university", // 匹配韩国语原文：창업중심대학
  },
  {
    value: POLICY_TAGS.GLOBAL_GLOCAL,
    labelKey: "statistics.filters.programs.global", // 匹配韩国语原文：글로벌사업
  },
  {
    value: POLICY_TAGS.RISE,
    labelKey: "statistics.filters.programs.rise", // 匹配韩国语原文：RISE 사업단
  },
];

// ==================== 投资情况 ====================

/**
 * 投资引进与否
 * Investment Status
 *
 * @enum {string}
 */
export const INVESTMENT_STATUS = {
  /** 是 (예) */
  YES: "yes",
  /** 否 (아니오) */
  NO: "no",
  /** 全部 (전체) */
  ALL: "all",
};

/**
 * 投资状态选项列表
 */
export const INVESTMENT_STATUS_OPTIONS = [
  {
    value: INVESTMENT_STATUS.ALL,
    labelKey: "statistics.filters.investment.all",
  },
  {
    value: INVESTMENT_STATUS.YES,
    labelKey: "statistics.filters.investment.yes",
  },
  { value: INVESTMENT_STATUS.NO, labelKey: "statistics.filters.investment.no" },
];

/**
 * 投资引进额预设范围
 * Investment Amount Ranges
 *
 * 单位：万元（韩元万位）
 * null 表示无上限
 */
export const INVESTMENT_RANGES = {
  /** 1000万以上 (1천만원 이상) */
  RANGE_1000: {
    min: 1000,
    max: null,
    labelKey: "statistics.filters.investment.range1000",
  },
  /** 5000万以上 (5천만원 이상) */
  RANGE_5000: {
    min: 5000,
    max: null,
    labelKey: "statistics.filters.investment.range5000",
  },
  /** 1亿以上 (1억원 이상) */
  RANGE_10000: {
    min: 10000,
    max: null,
    labelKey: "statistics.filters.investment.range10000",
  },
  /** 自定义 (사용자 정의) */
  CUSTOM: {
    min: null,
    max: null,
    labelKey: "statistics.filters.investment.custom",
  },
};

/**
 * 投资范围选项列表
 */
export const INVESTMENT_RANGES_OPTIONS = [
  { value: "RANGE_1000", ...INVESTMENT_RANGES.RANGE_1000 },
  { value: "RANGE_5000", ...INVESTMENT_RANGES.RANGE_5000 },
  { value: "RANGE_10000", ...INVESTMENT_RANGES.RANGE_10000 },
  { value: "CUSTOM", ...INVESTMENT_RANGES.CUSTOM },
];

// ==================== 专利持有数量 ====================

/**
 * 专利持有数量预设范围
 * Patent Count Ranges
 *
 * null 表示无上限
 */
export const PATENT_RANGES = {
  /** 1个以上 (1개 이상) */
  RANGE_1: { min: 1, max: null, labelKey: "statistics.filters.patent.range1" },
  /** 3个以上 (3개 이상) */
  RANGE_3: { min: 3, max: null, labelKey: "statistics.filters.patent.range3" },
  /** 5个以上 (5개 이상) */
  RANGE_5: { min: 5, max: null, labelKey: "statistics.filters.patent.range5" },
  /** 10个以上 (10개 이상) */
  RANGE_10: {
    min: 10,
    max: null,
    labelKey: "statistics.filters.patent.range10",
  },
  /** 自定义区间 (사용자 정의) */
  CUSTOM: {
    min: null,
    max: null,
    labelKey: "statistics.filters.patent.custom",
  },
};

/**
 * 专利范围选项列表
 */
export const PATENT_RANGES_OPTIONS = [
  { value: "RANGE_1", ...PATENT_RANGES.RANGE_1 },
  { value: "RANGE_3", ...PATENT_RANGES.RANGE_3 },
  { value: "RANGE_5", ...PATENT_RANGES.RANGE_5 },
  { value: "RANGE_10", ...PATENT_RANGES.RANGE_10 },
  { value: "CUSTOM", ...PATENT_RANGES.CUSTOM },
];

// ==================== 性别 ====================

/**
 * 性别
 * Gender
 *
 * @enum {string}
 */
export const GENDER = {
  /** 男 (남성) */
  MALE: "MALE",
  /** 女 (여성) */
  FEMALE: "FEMALE",
};

/**
 * 性别选项列表
 */
export const GENDER_OPTIONS = [
  { value: GENDER.MALE, labelKey: "statistics.filters.representative.male" },
  { value: GENDER.FEMALE, labelKey: "statistics.filters.representative.female" },
];

// ==================== 工龄范围 ====================

/**
 * 企业工龄范围
 * Work Years Ranges
 *
 * null 表示无上限
 */
export const WORK_YEARS = {
  /** 3年以下 (3년 이하) */
  UNDER_3: { min: 0, max: 3, labelKey: "statistics.filters.workYears.under3" },
  /** 3-7年 (3-7년) */
  RANGE_3_7: {
    min: 3,
    max: 7,
    labelKey: "statistics.filters.workYears.range37",
  },
  /** 7年以上 (7년 이상) */
  OVER_7: { min: 7, max: null, labelKey: "statistics.filters.workYears.over7" },
};

/**
 * 江原道地区选项
 */
export const LOCATION_OPTIONS = [
  { value: "chuncheon", labelKey: "statistics.filters.location.chuncheon" },
  { value: "wonju", labelKey: "statistics.filters.location.wonju" },
  { value: "gangneung", labelKey: "statistics.filters.location.gangneung" },
  { value: "hongcheon", labelKey: "statistics.filters.location.hongcheon" },
  { value: "hoengseong", labelKey: "statistics.filters.location.hoengseong" },
];

/**
 * 工龄范围选项列表
 */
export const WORK_YEARS_OPTIONS = [
  { value: "UNDER_3", ...WORK_YEARS.UNDER_3 },
  { value: "RANGE_3_7", ...WORK_YEARS.RANGE_3_7 },
  { value: "OVER_7", ...WORK_YEARS.OVER_7 },
];

// ==================== 排序字段 ====================

/**
 * 排序字段
 * Sort Fields
 *
 * @enum {string}
 */
export const SORT_FIELD = {
  /** 企业名称 */
  ENTERPRISE_NAME: "enterprise_name",
  /** 投资金额 */
  TOTAL_INVESTMENT: "total_investment",
  /** 专利数量 */
  PATENT_COUNT: "patent_count",
  /** 营收 */
  ANNUAL_REVENUE: "annual_revenue",
};

/**
 * 排序方向
 * Sort Order
 *
 * @enum {string}
 */
export const SORT_ORDER = {
  /** 升序 */
  ASC: "asc",
  /** 降序 */
  DESC: "desc",
};

/**
 * 排序选项列表
 */
export const SORT_FIELD_OPTIONS = [
  {
    value: SORT_FIELD.ENTERPRISE_NAME,
    labelKey: "statistics.sort.companyName",
  },
  {
    value: SORT_FIELD.TOTAL_INVESTMENT,
    labelKey: "statistics.sort.investment",
  },
  { value: SORT_FIELD.PATENT_COUNT, labelKey: "statistics.sort.patentCount" },
  { value: SORT_FIELD.ANNUAL_REVENUE, labelKey: "statistics.sort.revenue" },
];

// ==================== 分页配置 ====================

/**
 * 分页默认配置
 */
export const PAGINATION_CONFIG = {
  /** 默认页码 */
  DEFAULT_PAGE: 1,
  /** 默认每页数量 */
  DEFAULT_LIMIT: 20,
  /** 最大每页数量 */
  MAX_LIMIT: 100,
  /** 每页数量选项 */
  LIMIT_OPTIONS: [10, 20, 50, 100],
};

// ==================== 表格列字段 ====================

/**
 * 表格列字段映射
 */
export const TABLE_COLUMNS = {
  BUSINESS_REG_NO: "businessRegNo",
  ENTERPRISE_NAME: "enterpriseName",
  INDUSTRY_TYPE: "industryType",
  STARTUP_STAGE: "startupStage",
  POLICY_TAGS: "policyTags",
  TOTAL_INVESTMENT: "totalInvestment",
  PATENT_COUNT: "patentCount",
  ANNUAL_REVENUE: "annualRevenue",
  EXPORT_AMOUNT: "exportAmount",
};

/**
 * 表格列配置
 */
export const TABLE_COLUMN_CONFIGS = [
  {
    key: TABLE_COLUMNS.BUSINESS_REG_NO,
    labelKey: "statistics.table.businessRegNo",
    width: 140,
  },

  {
    key: TABLE_COLUMNS.ENTERPRISE_NAME,
    labelKey: "statistics.table.enterpriseName",
    width: 220,
  },
  {
    key: TABLE_COLUMNS.INDUSTRY_TYPE,
    labelKey: "statistics.table.industryType",
    width: 180,
  },
  {
    key: TABLE_COLUMNS.STARTUP_STAGE,
    labelKey: "statistics.table.startupStage",
    width: 110,
  },
  {
    key: TABLE_COLUMNS.POLICY_TAGS,
    labelKey: "statistics.table.programs",
    width: 180,
  },
  {
    key: TABLE_COLUMNS.TOTAL_INVESTMENT,
    labelKey: "statistics.table.investmentAmount",
    width: 150,
    align: "right",
  },
  {
    key: TABLE_COLUMNS.PATENT_COUNT,
    labelKey: "statistics.table.patentCount",
    width: 100,
    align: "center",
  },
  {
    key: TABLE_COLUMNS.ANNUAL_REVENUE,
    labelKey: "statistics.table.revenue",
    width: 150,
    align: "right",
  },
  {
    key: TABLE_COLUMNS.EXPORT_AMOUNT,
    labelKey: "statistics.table.exportAmount",
    width: 150,
    align: "right",
  },
];

// ==================== 导出配置 ====================

/**
 * Excel 导出配置
 */
export const EXPORT_CONFIG = {
  /** 文件名前缀 */
  FILE_PREFIX: "statistics_report",
  /** 文件扩展名 */
  FILE_EXT: ".xlsx",
  /** 工作表名称 */
  SHEET_NAME: "Statistics Report",
};

// ==================== 默认查询参数 ====================

/**
 * 后端支持的查询参数 (与 backend/src/modules/statistics/schemas.py StatisticsQuery 对齐)
 *
 * 重要：此对象的字段必须与后端 StatisticsQuery 完全一致
 * 前端 camelCase -> 后端 snake_case 由 api.service.js 自动转换
 */
export const DEFAULT_QUERY_PARAMS = {
  // 时间维度
  year: 2025,
  quarter: null,
  month: null,

  // 产业筛选 (后端支持)
  majorIndustryCodes: [], // -> major_industry_codes
  gangwonIndustryCodes: [], // -> gangwon_industry_codes

  // 政策关联
  policyTags: [], // -> policy_tags

  // 投资筛选
  hasInvestment: null, // -> has_investment
  minInvestment: null, // -> min_investment
  maxInvestment: null, // -> max_investment

  // 专利筛选
  minPatents: null, // -> min_patents
  maxPatents: null, // -> max_patents

  // 代表者特征
  gender: null, // -> gender (MALE/FEMALE)
  minAge: null, // -> min_age
  maxAge: null, // -> max_age

  // 关键词搜索
  searchQuery: null, // -> search_query (null 而非空字符串)

  // 创业阶段
  startupStages: [], // -> startup_stages

  // 企业工龄
  minWorkYears: null, // -> min_work_years
  maxWorkYears: null, // -> max_work_years

  // 排序
  sortBy: SORT_FIELD.ENTERPRISE_NAME, // -> sort_by
  sortOrder: SORT_ORDER.ASC, // -> sort_order

  // 分页
  page: PAGINATION_CONFIG.DEFAULT_PAGE, // -> page
  pageSize: PAGINATION_CONFIG.DEFAULT_LIMIT, // -> page_size
};

/**
 * UI 扩展字段 (仅前端筛选器使用，不发送到后端)
 *
 * 这些字段在 FilterPanel 中显示，但后端尚未实现对应的查询逻辑
 * 保留以备将来后端扩展
 */
export const UI_EXTENDED_PARAMS = {
  // 二级分类 (后端暂不支持)
  subIndustryCodes: [],
  gangwonIndustrySubCodes: [],

  // 额外分类 (后端暂不支持)
  startupTypes: [],
  businessFields: [],
  cooperationFields: [],

  // 量化指标范围 (后端暂不支持)
  minRevenue: null,
  maxRevenue: null,
  minEmployees: null,
  maxEmployees: null,

  // 所在地 (后端暂不支持)
  location: null,
};

/**
 * 完整的 UI 筛选参数 (后端参数 + UI 扩展参数)
 * 用于初始化 FilterPanel 状态
 */
export const FULL_FILTER_PARAMS = {
  ...DEFAULT_QUERY_PARAMS,
  ...UI_EXTENDED_PARAMS,
};

// ==================== 验证规则 ====================

/**
 * 验证规则
 */
export const VALIDATION_RULES = {
  /** 投资金额最小值 */
  INVESTMENT_MIN: 0,
  /** 投资金额最大值 */
  INVESTMENT_MAX: 999999999,
  /** 专利数量最小值 */
  PATENT_MIN: 0,
  /** 专利数量最大值 */
  PATENT_MAX: 9999,
  /** 年份最小值 */
  YEAR_MIN: 2000,
  /** 年份最大值 */
  YEAR_MAX: new Date().getFullYear() + 10,
};

// ==================== 工具函数 ====================

/**
 * 获取枚举值对应的 i18n 键
 * @param {Object} enumObj - 枚举对象
 * @param {string} value - 枚举值
 * @returns {string|null} i18n 键
 */
export const getEnumLabelKey = (enumObj, value) => {
  const option = Object.values(enumObj).find((opt) => opt.value === value);
  return option?.labelKey || null;
};

/**
 * 验证投资金额范围
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @returns {boolean}
 */
export const validateInvestmentRange = (min, max) => {
  if (min !== null && min < VALIDATION_RULES.INVESTMENT_MIN) return false;
  if (max !== null && max > VALIDATION_RULES.INVESTMENT_MAX) return false;
  if (min !== null && max !== null && min > max) return false;
  return true;
};

/**
 * 验证专利数量范围
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @returns {boolean}
 */
export const validatePatentRange = (min, max) => {
  if (min !== null && min < VALIDATION_RULES.PATENT_MIN) return false;
  if (max !== null && max > VALIDATION_RULES.PATENT_MAX) return false;
  if (min !== null && max !== null && min > max) return false;
  return true;
};

/**
 * UI 扩展参数的 key 列表 (不发送到后端)
 */
const UI_EXTENDED_KEYS = new Set([
  "subIndustryCodes",
  "gangwonIndustrySubCodes",
  "startupTypes",
  "businessFields",
  "cooperationFields",
  "minRevenue",
  "maxRevenue",
  "minEmployees",
  "maxEmployees",
  "location",
]);

/**
 * 构建查询参数（移除空值和 UI-only 参数）
 *
 * 重要：此函数会过滤掉 UI_EXTENDED_KEYS 中的字段，这些字段仅用于前端显示
 * 后端 StatisticsQuery 不支持这些参数，发送会导致 400 ValidationError
 *
 * @param {Object} params - 原始参数 (可能包含 UI 扩展参数)
 * @returns {Object} 清理后的参数 (仅包含后端支持的字段)
 */
export const buildQueryParams = (params) => {
  const cleanParams = {};

  Object.entries(params).forEach(([key, value]) => {
    // 跳过 UI-only 参数
    if (UI_EXTENDED_KEYS.has(key)) {
      return;
    }

    // 跳过 null、undefined、空字符串、空数组
    if (
      value === null ||
      value === undefined ||
      value === "" ||
      (Array.isArray(value) && value.length === 0)
    ) {
      return;
    }

    // 直接保留原始 key，api.service.js 会自动转换 camelCase -> snake_case
    cleanParams[key] = value;
  });

  return cleanParams;
};
