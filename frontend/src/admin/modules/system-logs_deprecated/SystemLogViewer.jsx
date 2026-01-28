/**
 * System Log Viewer Component
 * 系统日志查看器 - 查看 system.log 内容
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

export default function SystemLogViewer({ initialFilter = null }) {
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
    fetchLogs: (params) => logsService.listSystemLogs(params),
    initialFilters: { level: initialFilter?.level || '' },
    searchFilter: (log, keyword) =>
      log.message?.toLowerCase().includes(keyword) ||
      log.module?.toLowerCase().includes(keyword) ||
      log.function?.toLowerCase().includes(keyword),
    fetchPageSize: 500,
    initialFilter,
  });

  const handleCopyLatest = async () => {
    await copyLatestLogs(filteredLogs, formatLogForCopy);
    showCopySuccess();
  };

  return (
    <div>
      <LogFilters
        searchKeyword={searchKeyword}
        onSearchChange={handleSearchChange}
        searchPlaceholder={tl('systemLog.searchPlaceholder') || '搜索消息、模块...'}
        filterConfigs={[
          { key: 'level', value: filters.level, options: getLogLevels(tl) },
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
        emptyTitle={tl('systemLog.noLogs') || '暂无系统日志'}
        emptySubtitle={totalCount === 0 ? tl('systemLog.emptyLogs') : tl('systemLog.noMatchingLogs')}
        tl={tl}
        t={t}
        renderRow={(log) => (
          <LogRow
            key={log.id}
            log={{ ...log, layer: log.layer || 'System' }}
            expanded={expandedLog === log.id}
            onToggle={() => handleToggleExpand(log.id)}
            onReload={loadAllLogs}
            tl={tl}
            formatCopyData={formatLogForCopy}
            deleteLog={logsService.deleteSystemLog}
            deleteByMessage={logsService.deleteSystemLogsByMessage}
          />
        )}
      />
    </div>
  );
}
