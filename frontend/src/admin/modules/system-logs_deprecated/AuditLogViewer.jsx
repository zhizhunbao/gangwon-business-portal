/**
 * Audit Log Viewer Component
 * 审计日志查看器 - 用于合规性和安全追踪
 * 
 * 使用共享的 hooks 和组件，只保留特有配置
 */

import { useTranslation, adminService, createTranslator } from './adapter';
import { useLogViewer } from './hooks';
import { LogTable, LogRow, LogFilters } from './components';
import { copyLatestLogs, formatLogForCopy } from './utils';

// 操作类型配置
const getActionOptions = (tl) => [
  { value: '', label: tl('filters.allActions') },
  { value: 'LOGIN', label: tl('audit.actionLogin') },
  { value: 'LOGOUT', label: tl('audit.actionLogout') },
  { value: 'CREATE', label: tl('audit.actionCreate') },
  { value: 'UPDATE', label: tl('audit.actionUpdate') },
  { value: 'DELETE', label: tl('audit.actionDelete') },
  { value: 'APPROVE', label: tl('audit.actionApprove') },
  { value: 'REJECT', label: tl('audit.actionReject') },
  { value: 'UPLOAD', label: tl('audit.actionUpload') },
  { value: 'DOWNLOAD', label: tl('audit.actionDownload') },
];

// 资源类型配置
const getResourceOptions = (tl) => [
  { value: '', label: tl('filters.allResources') },
  { value: 'member', label: tl('audit.resourceMember') },
  { value: 'performance', label: tl('audit.resourcePerformance') },
  { value: 'project', label: tl('audit.resourceProject') },
  { value: 'content', label: tl('audit.resourceContent') },
  { value: 'support', label: tl('audit.resourceSupport') },
  { value: 'user', label: tl('audit.resourceUser') },
];

export default function AuditLogViewer({ initialFilter = null }) {
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
    fetchLogs: (params) => adminService.listAuditLogs({
      ...params,
      action: params.action || undefined,
      resourceType: params.resourceType || undefined,
    }),
    initialFilters: {
      action: initialFilter?.action || '',
      resourceType: initialFilter?.resourceType || '',
    },
    searchFilter: (log, keyword) =>
      log.userEmail?.toLowerCase().includes(keyword) ||
      log.userCompanyName?.toLowerCase().includes(keyword) ||
      log.action?.toLowerCase().includes(keyword) ||
      log.resourceType?.toLowerCase().includes(keyword) ||
      log.resourceId?.toLowerCase().includes(keyword),
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
        searchPlaceholder={tl('filters.searchAudit') || '搜索用户、操作、资源...'}
        filterConfigs={[
          { key: 'action', value: filters.action, options: getActionOptions(tl) },
          { key: 'resourceType', value: filters.resourceType, options: getResourceOptions(tl) },
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
        emptyTitle={tl('audit.noLogs')}
        emptySubtitle={totalCount === 0 ? tl('audit.emptyLogs') : tl('audit.noMatchingLogs')}
        tl={tl}
        t={t}
        renderRow={(log) => (
          <LogRow
            key={log.id}
            log={{
              ...log,
              layer: log.layer || 'Auth',
              message: log.message || `${log.action}: ${log.resourceType || ''}`,
            }}
            expanded={expandedLog === log.id}
            onToggle={() => handleToggleExpand(log.id)}
            onReload={loadAllLogs}
            tl={tl}
            formatCopyData={formatLogForCopy}
            deleteLog={adminService.deleteAuditLog}
            deleteByMessage={() => adminService.deleteAuditLogsByAction(log.action)}
            cleanConfirmMessage={tl('actions.confirmCleanAudit').replace('{{action}}', log.action)}
          />
        )}
      />
    </div>
  );
}
