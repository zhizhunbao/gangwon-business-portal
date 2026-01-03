/**
 * useLogViewer Hook
 * 日志查看器通用逻辑 - 状态管理、数据加载、过滤、分页
 * 
 * 所有日志查看器共享此 hook，只需传入配置即可
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

/**
 * @param {Object} config
 * @param {Function} config.fetchLogs - 获取日志的 API 函数，接收 params 返回 { items: [] } 或 { logs: [] }
 * @param {Object} config.initialFilters - 初始筛选条件
 * @param {Function} config.searchFilter - 搜索过滤函数 (log, keyword) => boolean
 * @param {Function} config.extraFilter - 额外过滤函数 (logs, filters) => logs（可选）
 * @param {number} config.fetchPageSize - API 请求的 pageSize，默认 100
 * @param {number} config.displayPageSize - 前端分页的 pageSize，默认 20
 * @param {Object} config.initialFilter - 外部传入的初始筛选（来自 props）
 */
export function useLogViewer({
  fetchLogs,
  initialFilters = {},
  searchFilter,
  extraFilter,
  fetchPageSize = 100,
  displayPageSize = 20,
  initialFilter = null,
}) {
  // 用 ref 保存 fetchLogs，避免依赖变化导致无限循环
  const fetchLogsRef = useRef(fetchLogs);
  fetchLogsRef.current = fetchLogs;

  // 核心状态
  const [allLogs, setAllLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(displayPageSize);
  const [expandedLog, setExpandedLog] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [filters, setFilters] = useState(initialFilters);

  // 加载日志
  const loadAllLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: 1,
        pageSize: fetchPageSize,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v !== '' && v !== undefined)
        ),
      };
      const response = await fetchLogsRef.current(params);
      // 兼容 items 和 logs 两种返回格式
      setAllLogs(response.items || response.logs || []);
    } catch (error) {
      console.error('Failed to load logs:', error);
      setAllLogs([]);
    } finally {
      setLoading(false);
    }
  }, [filters, fetchPageSize]);

  // 初始加载
  useEffect(() => {
    loadAllLogs();
  }, [loadAllLogs]);

  // 外部筛选条件变化
  useEffect(() => {
    if (initialFilter) {
      setFilters(prev => ({ ...prev, ...initialFilter }));
      setCurrentPage(1);
    }
  }, [initialFilter]);

  // 前端过滤：搜索 + 额外过滤
  const filteredLogs = useMemo(() => {
    let result = allLogs;

    // 额外过滤（如时长过滤、级别过滤等）
    if (extraFilter) {
      result = extraFilter(result, filters);
    }

    // 搜索过滤
    if (searchKeyword && searchFilter) {
      const keyword = searchKeyword.toLowerCase();
      result = result.filter(log => searchFilter(log, keyword));
    }

    return result;
  }, [allLogs, searchKeyword, searchFilter, extraFilter, filters]);

  // 分页后的数据
  const logs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  const totalCount = filteredLogs.length;

  // 筛选条件变更
  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  }, []);

  // 搜索变更
  const handleSearchChange = useCallback((value) => {
    setSearchKeyword(value);
    setCurrentPage(1);
  }, []);

  // 展开/收起
  const handleToggleExpand = useCallback((logId) => {
    setExpandedLog(prev => prev === logId ? null : logId);
  }, []);

  // 复制成功提示
  const showCopySuccess = useCallback(() => {
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  }, []);

  return {
    // 状态
    allLogs,
    logs,
    filteredLogs,
    loading,
    searchKeyword,
    currentPage,
    pageSize,
    totalCount,
    expandedLog,
    copySuccess,
    filters,
    // 方法
    loadAllLogs,
    setFilters,
    handleFilterChange,
    handleSearchChange,
    setCurrentPage,
    handleToggleExpand,
    showCopySuccess,
  };
}

export default useLogViewer;
