/**
 * useStatisticsFilters Hook - 统计报告筛选条件管理
 *
 * 功能:
 * - 管理筛选条件 UI 状态
 * - 处理预设范围选择
 * - 验证筛选条件
 */

import { useState, useCallback } from "react";
import {
  FULL_FILTER_PARAMS,
  INVESTMENT_RANGES,
  PATENT_RANGES,
  WORK_YEARS,
} from "../enum";

export const useStatisticsFilters = (initialFilters = {}) => {
  // 筛选条件状态 (使用完整的 UI 筛选参数，包含后端参数 + UI 扩展参数)
  const [filters, setFilters] = useState({
    ...FULL_FILTER_PARAMS,
    ...initialFilters,
  });

  // 投资范围选择状态
  const [investmentRangeType, setInvestmentRangeType] = useState("RANGE_1000");

  // 专利范围选择状态
  const [patentRangeType, setPatentRangeType] = useState("RANGE_1");

  // 工龄范围选择状态
  const [workYearsType, setWorkYearsType] = useState("UNDER_3");

  /**
   * 更新单个筛选字段
   */
  const updateFilter = useCallback((field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  /**
   * 批量更新筛选条件
   */
  const updateFilters = useCallback((newFilters) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
    }));
  }, []);

  /**
   * 重置筛选条件
   */
  const resetFilters = useCallback(() => {
    setFilters({ ...FULL_FILTER_PARAMS });
    setInvestmentRangeType("RANGE_1000");
    setPatentRangeType("RANGE_1");
    setWorkYearsType("UNDER_3");
  }, []);

  /**
   * 选择投资范围
   */
  const selectInvestmentRange = useCallback((rangeType) => {
    setInvestmentRangeType(rangeType);

    if (rangeType === "CUSTOM") {
      setFilters((prev) => ({ ...prev }));
    } else {
      const range = INVESTMENT_RANGES[rangeType];
      setFilters((prev) => ({
        ...prev,
        minInvestment: range.min,
        maxInvestment: range.max,
      }));
    }
  }, []);

  /**
   * 选择专利范围
   */
  const selectPatentRange = useCallback((rangeType) => {
    setPatentRangeType(rangeType);

    if (rangeType === "CUSTOM") {
      setFilters((prev) => ({ ...prev }));
    } else {
      const range = PATENT_RANGES[rangeType];
      setFilters((prev) => ({
        ...prev,
        minPatents: range.min,
        maxPatents: range.max,
      }));
    }
  }, []);

  /**
   * 切换政策关联标签
   */
  const togglePolicyTag = useCallback((tag) => {
    setFilters((prev) => {
      const tags = prev.policyTags || [];
      const exists = tags.includes(tag);

      return {
        ...prev,
        policyTags: exists ? tags.filter((t) => t !== tag) : [...tags, tag],
      };
    });
  }, []);

  /**
   * 切换创业阶段
   */
  const toggleStage = useCallback((stage) => {
    setFilters((prev) => {
      const stages = prev.startupStages || [];
      const exists = stages.includes(stage);

      return {
        ...prev,
        startupStages: exists
          ? stages.filter((s) => s !== stage)
          : [...stages, stage],
      };
    });
  }, []);

  /**
   * 设置时间维度
   */
  const setTimeDimension = useCallback((year, quarter = null, month = null) => {
    setFilters((prev) => ({
      ...prev,
      year,
      quarter,
      month,
    }));
  }, []);

  /**
   * 设置投资筛选
   */
  const setInvestmentFilters = useCallback((status, min = null, max = null) => {
    setFilters((prev) => ({
      ...prev,
      investmentReceived: status,
      investmentMin: min,
      investmentMax: max,
    }));
  }, []);

  /**
   * 设置专利筛选
   */
  const setPatentFilters = useCallback((min = null, max = null) => {
    setFilters((prev) => ({
      ...prev,
      minPatents: min,
      maxPatents: max,
    }));
  }, []);

  /**
   * 选择工龄范围
   */
  const selectWorkYears = useCallback((type) => {
    setWorkYearsType(type);
    const range = WORK_YEARS[type];
    setFilters((prev) => ({
      ...prev,
      minWorkYears: range.min,
      maxWorkYears: range.max,
    }));
  }, []);

  /**
   * 获取当前激活的筛选条件数量
   */
  const getActiveFiltersCount = useCallback(() => {
    let count = 0;

    if (filters.quarter !== null) count++;
    if (filters.month !== null) count++;
    if (filters.majorIndustryCodes?.length > 0) count++;
    if (filters.gangwonIndustryCodes?.length > 0) count++;
    if (filters.policyTags?.length > 0) count++;
    if (filters.hasInvestment !== null) count++;
    if (filters.minInvestment !== null || filters.maxInvestment !== null)
      count++;
    if (filters.minPatents !== null || filters.maxPatents !== null) count++;
    if (filters.gender !== null) count++;
    if (filters.minAge !== null || filters.maxAge !== null) count++;
    if (filters.searchQuery) count++;
    if (filters.minRevenue !== null || filters.maxRevenue !== null) count++;
    if (filters.minEmployees !== null || filters.maxEmployees !== null) count++;

    return count;
  }, [filters]);

  /**
   * 检查是否有激活的筛选条件
   */
  const hasActiveFilters = useCallback(() => {
    return getActiveFiltersCount() > 0;
  }, [getActiveFiltersCount]);

  /**
   * 获取筛选条件摘要 (用于显示)
   */
  const getFiltersSummary = useCallback(() => {
    const summary = [];

    if (filters.year) {
      let timeSummary = `${filters.year}년`;
      if (filters.quarter) timeSummary += ` Q${filters.quarter}`;
      if (filters.month) timeSummary += ` ${filters.month}월`;
      summary.push(timeSummary);
    }

    if (filters.policyTags?.length > 0) {
      summary.push(`정책 태그: ${filters.policyTags.length}개`);
    }

    if (filters.hasInvestment) {
      summary.push("투자 유치 기업");
    }

    if (filters.minPatents !== null) {
      summary.push(`특허 ${filters.minPatents}개 이상`);
    }

    return summary;
  }, [filters]);

  return {
    // 筛选条件
    filters,

    // 范围选择类型
    investmentRangeType,
    patentRangeType,
    workYearsType,

    // 基础操作
    updateFilter,
    updateFilters,
    resetFilters,

    // 范围选择
    selectInvestmentRange,
    selectPatentRange,
    selectWorkYears,

    // 特殊操作
    togglePolicyTag,
    setTimeDimension,
    setInvestmentFilters: (hasInv, min = null, max = null) => {
      setFilters((prev) => ({
        ...prev,
        hasInvestment: hasInv,
        minInvestment: min,
        maxInvestment: max,
      }));
    },
    setPatentFilters: (min = null, max = null) => {
      setFilters((prev) => ({
        ...prev,
        minPatents: min,
        maxPatents: max,
      }));
    },

    // 辅助方法
    getActiveFiltersCount,
    hasActiveFilters,
    getFiltersSummary,
  };
};
