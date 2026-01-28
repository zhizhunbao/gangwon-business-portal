/**
 * Performance Viewer Component
 * 性能日志查看器 - 慢请求、响应时间分析
 * 
 * 使用共享的 hooks 和组件，只保留特有配置
 */

import { useMemo } from 'react';
import { useTranslation, logsService, createTranslator } from './adapter';
import { useLogViewer } from './hooks';
import { LogTable, LogRow, LogFilters } from './components';
import { copyLatestLogs, formatLogForCopy } from './utils';

// 阈值配置
const getThresholdOptions = (tl) => [
  { value: '', label: tl('filters.allDurations') },
  { value: '100', label: '> 100ms' },
  { value: '500', label: '> 500ms' },
  { value: '1000', label: '> 1000ms' },
  { value: '3000', label: '> 3000ms' },
];

// 来源配置
const getSourceOptions = (tl) => [
  { value: '', label: tl('filters.allSources') },
  { value: 'backend', label: 'Backend' },
  { value: 'frontend', label: 'Frontend' },
];

// 获取时长颜色
const getDurationColor = (ms) => {
  if (!ms) return 'text-gray-400';
  if (ms > 3000) return 'text-red-600 font-bold';
  if (ms > 1000) return 'text-orange-600 font-semibold';
  if (ms > 500) return 'text-yellow-600';
  return 'text-green-600';
};

export default function PerformanceViewer({ initialFilter = null }) {
  const { t } = useTranslation();
  const tl = createTranslator(t);

  const {
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
    loadAllLogs,
    handleFilterChange,
    handleSearchChange,
    setCurrentPage,
    handleToggleExpand,
    showCopySuccess,
  } = useLogViewer({
    fetchLogs: (params) => logsService.listPerformanceLogs({
      ...params,
      source: params.source || undefined,
    }),
    initialFilters: {
      minDuration: initialFilter?.minDuration || '',
      source: initialFilter?.source || '',
    },
    searchFilter: (log, keyword) =>
      log.message?.toLowerCase().includes(keyword) ||
      log.extraData?.component_name?.toLowerCase().includes(keyword) ||
      log.extraData?.request_path?.toLowerCase().includes(keyword),
    extraFilter: (logs, filters) => {
      if (!filters.minDuration) return logs;
      const minMs = parseInt(filters.minDuration);
      return logs.filter(log => (log.durationMs || 0) >= minMs);
    },
    initialFilter,
  });

  // 统计数据
  const stats = useMemo(() => {
    if (filteredLogs.length === 0) {
      return { avgDuration: 0, maxDuration: 0, slowCount: 0, totalCount: 0 };
    }
    const durations = filteredLogs.map(l => l.durationMs || 0).filter(d => d > 0);
    return {
      avgDuration: durations.length > 0 
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) 
        : 0,
      maxDuration: durations.length > 0 ? Math.max(...durations) : 0,
      slowCount: filteredLogs.filter(l => (l.durationMs || 0) > 500).length,
      totalCount: filteredLogs.length,
    };
  }, [filteredLogs]);

  const handleCopyLatest = async () => {
    await copyLatestLogs(filteredLogs, formatLogForCopy);
    showCopySuccess();
  };

  const getRowClassName = (log) => {
    const duration = log.durationMs || 0;
    if (duration > 1000) return 'bg-orange-50';
    if (duration > 500) return 'bg-yellow-50';
    return '';
  };

  return (
    <div>
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label={tl('performance.avgDuration')} value={stats.avgDuration} color={getDurationColor(stats.avgDuration)} unit="ms" />
        <StatCard label={tl('performance.maxDuration')} value={stats.maxDuration} color={getDurationColor(stats.maxDuration)} unit="ms" />
        <StatCard label={tl('performance.slowCount')} value={stats.slowCount} color="text-yellow-600" />
        <StatCard label={tl('performance.totalCount')} value={stats.totalCount} color="text-gray-900" />
      </div>

      <LogFilters
        searchKeyword={searchKeyword}
        onSearchChange={handleSearchChange}
        searchPlaceholder={tl('filters.searchPerformance') || '搜索组件、路径...'}
        filterConfigs={[
          { key: 'minDuration', value: filters.minDuration, options: getThresholdOptions(tl) },
          { key: 'source', value: filters.source, options: getSourceOptions(tl) },
        ]}
        onFilterChange={handleFilterChange}
        copySuccess={copySuccess}
        onCopyLatest={handleCopyLatest}
        copyDisabled={filteredLogs.length === 0}
        tl={tl}
      />

      <LogTable
        logs={logs}
        loading={loading}
        totalCount={totalCount}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        emptyTitle={tl('performance.noLogs')}
        emptySubtitle={totalCount === 0 ? tl('performance.emptyLogs') : tl('performance.noMatchingLogs')}
        tl={tl}
        t={t}
        renderRow={(log) => (
          <LogRow
            key={log.id}
            log={{
              ...log,
              layer: log.layer || 'Performance',
              message: log.message || `${log.extraData?.metric_name || 'request'}: ${log.durationMs || 0}ms`,
            }}
            expanded={expandedLog === log.id}
            onToggle={() => handleToggleExpand(log.id)}
            onReload={loadAllLogs}
            tl={tl}
            formatCopyData={formatLogForCopy}
            deleteLog={logsService.deletePerformanceLog}
            deleteByMessage={(msg) => logsService.deletePerformanceLogsByMessage(msg)}
            rowClassName={getRowClassName(log)}
          />
        )}
      />
    </div>
  );
}

function StatCard({ label, value, color, unit = '' }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}{unit}</p>
    </div>
  );
}
