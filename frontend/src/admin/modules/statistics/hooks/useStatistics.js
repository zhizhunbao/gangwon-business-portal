/**
 * useStatistics Hook - 统计报告业务逻辑
 *
 * 功能:
 * - 管理筛选条件状态
 * - 执行查询和分页
 * - 处理 Excel 导出
 * - 处理加载和错误状态
 */

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import statisticsService from "../services/statistics.service";
import { DEFAULT_QUERY_PARAMS, PAGINATION_CONFIG } from "../enum";

export const useStatistics = (initialParams = {}) => {
  const { t } = useTranslation();

  // 筛选参数状态
  const [params, setParams] = useState({
    ...DEFAULT_QUERY_PARAMS,
    ...initialParams,
  });

  // 查询结果状态
  const [data, setData] = useState({
    items: [],
    total: 0,
    page: 1,
    pageSize: PAGINATION_CONFIG.DEFAULT_LIMIT,
  });

  // 加载和错误状态
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 导出状态
  const [exporting, setExporting] = useState(false);

  /**
   * 执行查询
   */
  const fetchData = useCallback(
    async (queryParams = params) => {
      setLoading(true);
      setError(null);

      try {
        // 验证参数
        const validation = statisticsService.validateParams(queryParams);
        if (!validation.valid) {
          const errorMessages = validation.errors
            .map((key) => t(key))
            .join(", ");
          throw new Error(errorMessages);
        }

        // 执行查询
        const response = await statisticsService.queryCompanies(queryParams);

        setData({
          items: response.items || [],
          total: response.total || 0,
          page: response.page || 1,
          pageSize: response.pageSize || PAGINATION_CONFIG.DEFAULT_LIMIT,
        });

        return response;
      } catch (err) {
        const errorMessage = err.message || t("statistics.messages.queryError");
        setError(errorMessage);
        console.error("[useStatistics] fetchData error:", err);
      } finally {
        setLoading(false);
      }
    },
    [params, t],
  );

  /**
   * 更新筛选参数
   */
  const updateParams = useCallback((newParams) => {
    setParams((prev) => ({
      ...prev,
      ...newParams,
      // 更新筛选条件时重置到第一页
      page: newParams.page !== undefined ? newParams.page : 1,
    }));
  }, []);

  /**
   * 重置筛选条件
   */
  const resetParams = useCallback(() => {
    setParams({ ...DEFAULT_QUERY_PARAMS });
  }, []);

  /**
   * 应用筛选条件并查询
   */
  const applyFilters = useCallback(
    async (filters = {}) => {
      const newParams = {
        ...params,
        ...filters,
        page: 1, // 应用新筛选条件时重置到第一页
      };
      setParams(newParams);
      await fetchData(newParams);
    },
    [params, fetchData],
  );

  /**
   * 翻页
   */
  const changePage = useCallback(
    async (newPage) => {
      const newParams = { ...params, page: newPage };
      setParams(newParams);
      await fetchData(newParams);
    },
    [params, fetchData],
  );

  /**
   * 改变每页数量
   */
  const changePageSize = useCallback(
    async (newPageSize) => {
      const newParams = { ...params, pageSize: newPageSize, page: 1 };
      setParams(newParams);
      await fetchData(newParams);
    },
    [params, fetchData],
  );

  /**
   * 排序
   */
  const changeSort = useCallback(
    async (sortBy, sortOrder = "asc") => {
      const newParams = { ...params, sortBy, sortOrder };
      setParams(newParams);
      await fetchData(newParams);
    },
    [params, fetchData],
  );

  /**
   * 导出 Excel
   */
  const exportToExcel = useCallback(
    async (customFilename = null) => {
      setExporting(true);

      try {
        // 1. 验证参数
        const validation = statisticsService.validateParams(params);
        if (!validation.valid) {
          const errorMessages = validation.errors
            .map((key) => t(key))
            .join(", ");
          throw new Error(errorMessages);
        }

        // 2. 生成默认文件名 (如果未提供)
        let filename = customFilename;
        if (!filename) {
          const year = params.year || new Date().getFullYear();
          const timestamp = new Date()
            .toISOString()
            .slice(0, 10)
            .replace(/-/g, "");
          filename = `统计报告_${year}_${timestamp}`;
        }

        // 3. 执行导出
        const result = await statisticsService.exportToExcel(params, filename);

        return result;
      } catch (err) {
        const errorMessage =
          err.message || t("statistics.messages.exportError");
        setError(errorMessage);
        console.error("[useStatistics] exportToExcel error:", err);
      } finally {
        setExporting(false);
      }
    },
    [params, t],
  );

  /**
   * 初始化时自动查询
   */
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 只在组件挂载时执行一次

  return {
    // 数据
    data,
    params,
    loading,
    error,
    exporting,

    // 方法
    fetchData,
    updateParams,
    resetParams,
    applyFilters,
    changePage: async (newPage) => {
      await changePage(newPage);
      window.scrollTo({ top: 0, behavior: "auto" });
    },
    changePageSize,
    changeSort,
    exportToExcel,

    // 辅助信息
    hasData: data.items.length > 0,
    isEmpty: !loading && data.items.length === 0,
    totalItems: data.total,
    currentPage: data.page,
    totalPages: Math.ceil(data.total / data.pageSize),
  };
};
