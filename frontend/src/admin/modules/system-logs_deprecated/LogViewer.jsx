/**
 * Log Viewer Component
 * 应用日志查看器 - 支持筛选、搜索
 * 
 * 使用共享的 hooks 和组件，只保留特有配置
 */

import { useTranslation, logsService, createTranslator } from './adapter';
import { useLogViewer } from './hooks';
import { LogTable, LogRow, LogFilters } from './components';
import { copyLatestLogs, formatLogForCopy } from './utils';

// 日志级别配置
const getLogLevels = (tl) => [
  { value: '', label: tl('filters.allLevels') },
  { value: 'DEBUG', label: 'DEBUG' },
  { value: 'INFO', label: 'INFO' },
  { value: 'WARNING', label: 'WARNING' },
  { value: 'ERROR', label: 'ERROR' },
  { value: 'CRITICAL', label: 'CRITICAL' },
];

// 日志层级配置
const getLogLayers = (tl) => [
  { value: '', label: tl('filters.allLayers') },
  { value: 'Router', label: 'Router' },
  { value: 'Service', label: 'Service' },
  { value: 'Database', label: 'Database' },
  { value: 'Auth', label: 'Auth' },
  { value: 'Store', label: 'Store' },
  { value: 'Component', label: 'Component' },
];

// 来源配置
const getLogSources = (tl) => [
  { value: '', label: tl('filters.allSources') },
  { value: 'backend', label: 'Backend' },
  { value: 'frontend', label: 'Frontend' },
];

export default function LogViewer({ initialFilter = null }) {
  const { t } = useTranslation();
  const tl = createTranslator(t);

  // 使用共享 hook
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
    fetchLogs: (params) => logsService.listLogs(params),
    initialFilters: {
      level: initialFilter?.level || '',
      layer: initialFilter?.layer || '',
      source: initialFilter?.source || '',
    },
    searchFilter: (log, keyword) =>
      log.message?.toLowerCase().includes(keyword) ||
      log.traceId?.toLowerCase().includes(keyword) ||
      log.module?.toLowerCase().includes(keyword),
    initialFilter,
  });

  // 复制最新5条
  const handleCopyLatest = async () => {
    await copyLatestLogs(filteredLogs, formatLogForCopy);
    showCopySuccess();
  };

  return (
    <div>
      {/* 筛选栏 */}
      <LogFilters
        searchKeyword={searchKeyword}
        onSearchChange={handleSearchChange}
        searchPlaceholder={tl('filters.search') || '搜索消息、traceId、模块...'}
        filterConfigs={[
          { key: 'level', value: filters.level, options: getLogLevels(tl) },
          { key: 'layer', value: filters.layer, options: getLogLayers(tl) },
          { key: 'source', value: filters.source, options: getLogSources(tl) },
        ]}
        onFilterChange={handleFilterChange}
        copySuccess={copySuccess}
        onCopyLatest={handleCopyLatest}
        copyDisabled={filteredLogs.length === 0}
        tl={tl}
      />

      {/* 日志表格 */}
      <LogTable
        logs={logs}
        loading={loading}
        totalCount={totalCount}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        emptyTitle={tl('table.noLogs')}
        emptySubtitle={totalCount === 0 ? tl('table.emptyLogs') : tl('table.noMatchingLogs')}
        tl={tl}
        t={t}
        renderRow={(log) => (
          <LogRow
            key={log.id}
            log={log}
            expanded={expandedLog === log.id}
            onToggle={() => handleToggleExpand(log.id)}
            onReload={loadAllLogs}
            tl={tl}
            formatCopyData={formatLogForCopy}
            deleteLog={logsService.deleteLog}
            deleteByMessage={logsService.deleteLogsByMessage}
          />
        )}
      />
    </div>
  );
}
