/**
 * Statistics Module - 统计报告模块
 *
 * 功能:
 * - 企业数据多维度筛选
 * - 统计结果展示
 * - Excel 导出
 */

// 视图
export { StatisticsReportView as StatisticsReport } from "./views/StatisticsReportView";

// 组件 (按需导出)
export { FilterPanel } from "./components/Filter/FilterPanel";
export { StatisticsTable } from "./components/Report/StatisticsTable";

// Hooks
export { useStatistics } from "./hooks/useStatistics";
export { useStatisticsFilters } from "./hooks/useStatisticsFilters";

// 服务
export { default as statisticsService } from "./services/statistics.service";

// 枚举和常量
export * from "./enum";
