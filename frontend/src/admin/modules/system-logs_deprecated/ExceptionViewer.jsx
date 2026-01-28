/**
 * Exception Viewer Component
 * 异常日志查看器 - 快速定位 Bug
 * 
 * 使用共享的 hooks 和组件，只保留特有配置
 */

import { useTranslation, logsService, createTranslator } from './adapter';
import { useLogViewer } from './hooks';
import { LogTable, LogRow, LogFilters } from './components';
import { copyLatestLogs, formatLogForCopy } from './utils';

// 异常级别配置
const getExceptionLevels = (tl) => [
  { value: '', label: tl('filters.allLevels') },
  { value: 'ERROR', label: 'ERROR' },
  { value: 'CRITICAL', label: 'CRITICAL' },
];

export default function ExceptionViewer() {
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
    fetchLogs: (params) => logsService.listErrorLogs({ ...params, level: 'ERROR,CRITICAL' }),
    initialFilters: { level: '' },
    searchFilter: (log, keyword) =>
      log.message?.toLowerCase().includes(keyword) ||
      log.extraData?.error_type?.toLowerCase().includes(keyword) ||
      log.module?.toLowerCase().includes(keyword),
    extraFilter: (logs, filters) => {
      if (!filters.level) return logs;
      return logs.filter(log => log.level === filters.level);
    },
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
        searchPlaceholder={tl('filters.searchException') || '搜索异常信息、类型、模块...'}
        filterConfigs={[
          { key: 'level', value: filters.level, options: getExceptionLevels(tl) },
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
        emptyTitle={tl('exception.noExceptions')}
        emptySubtitle={totalCount === 0 ? tl('exception.emptyLogs') : tl('exception.noMatchingLogs')}
        tl={tl}
        t={t}
        renderRow={(log) => (
          <LogRow
            key={log.id}
            log={{ ...log, layer: log.layer || 'Error' }}
            expanded={expandedLog === log.id}
            onToggle={() => handleToggleExpand(log.id)}
            onReload={loadAllLogs}
            tl={tl}
            formatCopyData={formatLogForCopy}
            deleteLog={logsService.deleteErrorLog}
            deleteByMessage={logsService.deleteErrorLogsByMessage}
          />
        )}
      />
    </div>
  );
}
