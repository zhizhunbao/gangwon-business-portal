/**
 * Log Viewer Component
 * 日志查看器 - 支持筛选、搜索
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation, Loading, Select, logsService, createTranslator } from './adapter';
import { SearchInput, Pagination, ConfirmModal, Button } from '@shared/components';
import { formatEST, parseModulePath, parseFilename } from '@shared/utils/format';

// 级别颜色
const levelColors = {
  DEBUG: 'bg-gray-100 text-gray-600',
  INFO: 'bg-blue-100 text-blue-700',
  WARNING: 'bg-yellow-100 text-yellow-700',
  ERROR: 'bg-red-100 text-red-700',
  CRITICAL: 'bg-red-200 text-red-800',
};

export default function LogViewer({ initialFilter = null }) {
  const { t } = useTranslation();
  const tl = createTranslator(t);
  const [allLogs, setAllLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [expandedLog, setExpandedLog] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);
  
  // 筛选条件
  const [filters, setFilters] = useState({
    level: initialFilter?.level || '',
    layer: initialFilter?.layer || '',
    source: initialFilter?.source || '',
  });

  // 日志级别配置
  const LOG_LEVELS = [
    { value: '', label: tl('filters.allLevels') },
    { value: 'DEBUG', label: 'DEBUG' },
    { value: 'INFO', label: 'INFO' },
    { value: 'WARNING', label: 'WARNING' },
    { value: 'ERROR', label: 'ERROR' },
    { value: 'CRITICAL', label: 'CRITICAL' },
  ];

  // 日志层级配置
  const LOG_LAYERS = [
    { value: '', label: tl('filters.allLayers') },
    { value: 'Router', label: 'Router' },
    { value: 'Service', label: 'Service' },
    { value: 'Database', label: 'Database' },
    { value: 'Auth', label: 'Auth' },
    { value: 'Store', label: 'Store' },
    { value: 'Component', label: 'Component' },
  ];

  // 来源配置
  const LOG_SOURCES = [
    { value: '', label: tl('filters.allSources') },
    { value: 'backend', label: 'Backend' },
    { value: 'frontend', label: 'Frontend' },
  ];

  // 一次性加载日志
  const loadAllLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: 1,
        pageSize: 100,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v !== '')
        ),
      };
      const response = await logsService.listLogs(params);
      setAllLogs(response.items || []);
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadAllLogs();
  }, [loadAllLogs]);

  useEffect(() => {
    if (initialFilter) {
      setFilters(prev => ({ ...prev, ...initialFilter }));
      setCurrentPage(1);
    }
  }, [initialFilter]);

  // 前端模糊搜索过滤
  const filteredLogs = useMemo(() => {
    if (!searchKeyword) return allLogs;
    const keyword = searchKeyword.toLowerCase();
    return allLogs.filter(log =>
      log.message?.toLowerCase().includes(keyword) ||
      log.traceId?.toLowerCase().includes(keyword) ||
      log.module?.toLowerCase().includes(keyword)
    );
  }, [allLogs, searchKeyword]);

  // 分页后的数据
  const logs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  const totalCount = filteredLogs.length;

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  // 复制最新5条日志
  const handleCopyLatest = async () => {
    const latest5 = filteredLogs.slice(0, 5).map(log => ({
      time: formatEST(log.createdAt),
      level: log.level,
      source: log.source || 'backend',
      layer: log.layer || '-',
      module: parseModulePath(log.module),
      file: parseFilename(log.module, log.source, log.filePath),
      message: log.message,
      traceId: log.traceId,
    }));
    try {
      await navigator.clipboard.writeText(JSON.stringify(latest5, null, 2));
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      const textarea = document.createElement('textarea');
      textarea.value = JSON.stringify(latest5, null, 2);
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  return (
    <div>
      {/* 筛选栏 */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px] max-w-md">
            <SearchInput
              value={searchKeyword}
              onChange={(value) => {
                setSearchKeyword(value);
                setCurrentPage(1);
              }}
              placeholder={tl('filters.search') || '搜索消息、traceId、模块...'}
            />
          </div>
          <Select
            value={filters.level}
            onChange={(e) => handleFilterChange('level', e.target.value)}
            options={LOG_LEVELS}
            className="w-32"
          />
          <Select
            value={filters.layer}
            onChange={(e) => handleFilterChange('layer', e.target.value)}
            options={LOG_LAYERS}
            className="w-32"
          />
          <Select
            value={filters.source}
            onChange={(e) => handleFilterChange('source', e.target.value)}
            options={LOG_SOURCES}
            className="w-32"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopyLatest}
            disabled={filteredLogs.length === 0}
          >
            {copySuccess ? `✓ ${tl('actions.copied')}` : tl('actions.copyLatest5')}
          </Button>
        </div>
      </div>

      {/* 日志列表 */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase">
          <div className="col-span-2">{tl('table.timestamp')}</div>
          <div className="col-span-1">{tl('table.level')}</div>
          <div className="col-span-1">{tl('table.source')}</div>
          <div className="col-span-1">{tl('table.layer')}</div>
          <div className="col-span-2">{tl('table.module')}</div>
          <div className="col-span-1">{tl('table.filename')}</div>
          <div className="col-span-3">{tl('table.message')}</div>
          <div className="col-span-1 text-center">{t('common.actions', '操作')}</div>
        </div>

        {loading ? (
          <div className="p-12 text-center"><Loading /></div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p className="text-lg mb-2">{tl('table.noLogs')}</p>
            <p className="text-sm text-gray-400">
              {totalCount === 0 ? '暂无日志' : '当前搜索条件下没有匹配的日志'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {logs.map((log) => (
              <LogRow 
                key={log.id} 
                log={log} 
                expanded={expandedLog === log.id}
                onToggle={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                tl={tl}
                onReload={loadAllLogs}
              />
            ))}
          </div>
        )}

        {totalCount > pageSize && (
          <div className="px-6 py-4 border-t border-gray-200 flex flex-wrap items-center justify-between gap-4">
            <div className="text-sm text-gray-700">
              显示 {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalCount)} 共 {totalCount} 条
            </div>
            <Pagination
              current={currentPage}
              total={totalCount}
              pageSize={pageSize}
              onChange={setCurrentPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function LogRow({ log, expanded, onToggle, tl, onReload }) {
  const [copied, setCopied] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ open: false, type: null });
  const [loading, setLoading] = useState(false);

  const handleCopy = async (e) => {
    e.stopPropagation();
    const logData = {
      id: log.id,
      timestamp: formatEST(log.createdAt),
      level: log.level,
      message: log.message,
      layer: log.layer,
      module: log.module,
      traceId: log.traceId,
      extraData: log.extraData,
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(logData, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      const textarea = document.createElement('textarea');
      textarea.value = JSON.stringify(logData, null, 2);
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    setConfirmModal({ open: true, type: 'delete' });
  };

  const handleDeleteSimilar = (e) => {
    e.stopPropagation();
    setConfirmModal({ open: true, type: 'clean' });
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      if (confirmModal.type === 'delete') {
        await logsService.deleteLog(log.id);
      } else {
        await logsService.deleteLogsByMessage(log.message);
      }
      setConfirmModal({ open: false, type: null });
      if (onReload) onReload();
    } catch (err) {
      alert(`${tl('actions.operationFailed')}: ${err.message || tl('actions.unknownError')}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="hover:bg-gray-50">
      <div className="grid grid-cols-12 gap-2 px-4 py-3 cursor-pointer items-center" onClick={onToggle}>
        <div className="col-span-2 text-xs text-gray-500 font-mono">
          {formatEST(log.createdAt)}
        </div>
        <div className="col-span-1">
          <span className={`px-2 py-0.5 text-xs rounded-full ${levelColors[log.level] || levelColors.INFO}`}>
            {log.level}
          </span>
        </div>
        <div className="col-span-1 text-xs text-gray-500">
          {log.source || '-'}
        </div>
        <div className="col-span-1 text-xs text-gray-600">
          {log.layer || '-'}
        </div>
        <div className="col-span-2 text-xs text-gray-500 truncate" title={log.module}>
          {parseModulePath(log.module)}
        </div>
        <div className="col-span-1 text-xs text-gray-500 truncate" title={log.filePath || parseFilename(log.module, log.source, log.filePath)}>
          {parseFilename(log.module, log.source, log.filePath)}
        </div>
        <div className="col-span-3 text-sm text-gray-900 truncate" title={log.message}>
          {log.message}
        </div>
        <div className="col-span-1 flex justify-center items-center space-x-1 text-xs">
          <button onClick={handleCopy} className="text-blue-600 hover:text-blue-900">
            {copied ? '✓' : tl('actions.copy')}
          </button>
          <span className="text-gray-300">|</span>
          <button onClick={handleDelete} className="text-gray-600 hover:text-gray-900">
            {tl('actions.delete')}
          </button>
          <span className="text-gray-300">|</span>
          <button onClick={handleDeleteSimilar} className="text-red-600 hover:text-red-900">
            {tl('actions.clean')}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
          {(log.traceId || log.requestId || log.userId) && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-500 mb-2">
              {log.traceId && <div><span className="font-medium">Trace ID:</span> <span className="font-mono">{log.traceId}</span></div>}
              {log.requestId && <div><span className="font-medium">Request ID:</span> <span className="font-mono">{log.requestId}</span></div>}
              {log.userId && <div><span className="font-medium">User ID:</span> <span className="font-mono">{log.userId}</span></div>}
            </div>
          )}
          {log.extraData && Object.keys(log.extraData).length > 0 && (
            <>
              <p className="text-xs font-medium text-gray-500 mb-1">{tl('table.extraData')}:</p>
              <pre className="text-xs bg-gray-800 text-green-400 p-3 rounded overflow-x-auto">
                {JSON.stringify(log.extraData, null, 2)}
              </pre>
            </>
          )}
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, type: null })}
        onConfirm={handleConfirm}
        title={confirmModal.type === 'delete' ? tl('actions.deleteLog') : tl('actions.cleanLog')}
        message={confirmModal.type === 'delete' 
          ? tl('actions.confirmDelete')
          : tl('actions.confirmCleanLogs').replace('{{message}}', log.message?.substring(0, 50))}
        confirmText={confirmModal.type === 'delete' ? tl('actions.delete') : tl('actions.clean')}
        loading={loading}
      />
    </div>
  );
}

function DetailItem({ label, value, mono = false }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-sm text-gray-900 ${mono ? 'font-mono' : ''} truncate`}>{value || '-'}</p>
    </div>
  );
}
