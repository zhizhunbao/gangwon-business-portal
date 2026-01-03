/**
 * Performance Viewer Component
 * 性能日志查看器 - 慢请求、响应时间分析
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation, Loading, Select, logsService, createTranslator } from './adapter';
import { SearchInput, Pagination, ConfirmModal, Button } from '@shared/components';
import { formatEST, parseModulePath, parseFilename } from '@shared/utils/format';

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

export default function PerformanceViewer({ initialFilter = null }) {
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
    minDuration: initialFilter?.minDuration || '',
    source: initialFilter?.source || '',
  });

  // 一次性加载性能日志
  const loadAllLogs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await logsService.listPerformanceLogs({
        page: 1,
        pageSize: 100,
        source: filters.source || undefined,
      });
      setAllLogs(response.items || []);
    } catch (error) {
      console.error('Failed to load performance logs:', error);
    } finally {
      setLoading(false);
    }
  }, [filters.source]);

  useEffect(() => {
    loadAllLogs();
  }, [loadAllLogs]);

  useEffect(() => {
    if (initialFilter) {
      setFilters(prev => ({ ...prev, ...initialFilter }));
      setCurrentPage(1);
    }
  }, [initialFilter]);

  // 前端过滤
  const filteredLogs = useMemo(() => {
    let result = allLogs;
    
    // 时长过滤
    if (filters.minDuration) {
      const minMs = parseInt(filters.minDuration);
      result = result.filter(log => (log.durationMs || 0) >= minMs);
    }
    
    // 搜索过滤
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      result = result.filter(log =>
        log.message?.toLowerCase().includes(keyword) ||
        log.extraData?.component_name?.toLowerCase().includes(keyword) ||
        log.extraData?.request_path?.toLowerCase().includes(keyword)
      );
    }
    
    return result;
  }, [allLogs, filters.minDuration, searchKeyword]);

  // 分页后的数据
  const logs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  // 统计数据
  const stats = useMemo(() => {
    if (filteredLogs.length === 0) return { avgDuration: 0, maxDuration: 0, slowCount: 0, totalCount: 0 };
    const durations = filteredLogs.map(l => l.durationMs || 0).filter(d => d > 0);
    return {
      avgDuration: durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0,
      maxDuration: durations.length > 0 ? Math.max(...durations) : 0,
      slowCount: filteredLogs.filter(l => (l.durationMs || 0) > 500).length,
      totalCount: filteredLogs.length,
    };
  }, [filteredLogs]);

  const totalCount = filteredLogs.length;

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  // 复制最新5条性能日志
  const handleCopyLatest = async () => {
    const latest5 = filteredLogs.slice(0, 5).map(log => ({
      time: formatEST(log.createdAt),
      duration: (log.durationMs || log.extraData?.metric_value || 0) + 'ms',
      type: log.extraData?.metric_name || 'request',
      target: log.extraData?.component_name || log.extraData?.request_path || log.message,
      source: log.source,
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

  // 获取时长颜色
  const getDurationColor = (ms) => {
    if (!ms) return 'text-gray-400';
    if (ms > 3000) return 'text-red-600 font-bold';
    if (ms > 1000) return 'text-orange-600 font-semibold';
    if (ms > 500) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div>
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">{tl('performance.avgDuration')}</p>
          <p className={`text-2xl font-bold ${getDurationColor(stats.avgDuration)}`}>{stats.avgDuration}ms</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">{tl('performance.maxDuration')}</p>
          <p className={`text-2xl font-bold ${getDurationColor(stats.maxDuration)}`}>{stats.maxDuration}ms</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">{tl('performance.slowCount')}</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.slowCount}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">{tl('performance.totalCount')}</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalCount}</p>
        </div>
      </div>

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
              placeholder={tl('filters.searchPerformance') || '搜索组件、路径...'}
            />
          </div>
          <Select
            value={filters.minDuration}
            onChange={(e) => handleFilterChange('minDuration', e.target.value)}
            options={getThresholdOptions(tl)}
            className="w-32"
          />
          <Select
            value={filters.source}
            onChange={(e) => handleFilterChange('source', e.target.value)}
            options={getSourceOptions(tl)}
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

      {/* 性能日志列表 */}
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
            <p className="text-lg mb-2">{tl('performance.noLogs')}</p>
            <p className="text-sm text-gray-400">
              {totalCount === 0 ? '暂无性能日志' : '当前搜索条件下没有匹配的日志'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {logs.map((log) => (
              <PerformanceRow 
                key={log.id} 
                log={log} 
                expanded={expandedLog === log.id}
                onToggle={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                getDurationColor={getDurationColor}
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

function PerformanceRow({ log, expanded, onToggle, getDurationColor, tl, onReload }) {
  const [copied, setCopied] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ open: false, type: null });
  const [loading, setLoading] = useState(false);
  const metricName = log.extraData?.metric_name || 'request';
  const target = log.extraData?.component_name || log.extraData?.request_path || log.message || '-';
  const duration = log.durationMs || log.extraData?.metric_value || 0;
  const isSlow = log.extraData?.is_slow || duration > 500;

  const handleCopy = async (e) => {
    e.stopPropagation();
    const logData = {
      id: log.id,
      timestamp: formatEST(log.createdAt),
      duration: duration,
      metricName: metricName,
      target: target,
      source: log.source,
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
        await logsService.deletePerformanceLog(log.id);
      } else {
        const msg = log.message || target;
        await logsService.deletePerformanceLogsByMessage(msg);
      }
      setConfirmModal({ open: false, type: null });
      if (onReload) onReload();
    } catch (err) {
      alert(`${tl('actions.operationFailed')}: ${err.message || tl('actions.unknownError')}`);
    } finally {
      setLoading(false);
    }
  };

  const cleanMessage = (log.message || target)?.substring(0, 50);

  return (
    <div className={`hover:bg-gray-50 ${duration > 1000 ? 'bg-orange-50' : duration > 500 ? 'bg-yellow-50' : ''}`}>
      <div className="grid grid-cols-12 gap-2 px-4 py-3 cursor-pointer items-center" onClick={onToggle}>
        <div className="col-span-2 text-xs text-gray-500 font-mono">
          {formatEST(log.createdAt)}
        </div>
        <div className="col-span-1">
          <span className={`px-2 py-0.5 text-xs rounded-full ${isSlow ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
            {log.level || 'INFO'}
          </span>
        </div>
        <div className="col-span-1 text-xs text-gray-500">
          {log.source}
        </div>
        <div className="col-span-1 text-xs text-gray-600">
          {log.layer || 'Performance'}
        </div>
        <div className="col-span-2 text-xs text-gray-500 truncate">
          {parseModulePath(log.module)}
        </div>
        <div className="col-span-1 text-xs text-gray-500 truncate">
          {parseFilename(log.module)}
        </div>
        <div className="col-span-3 text-sm text-gray-900 truncate" title={log.message || `${metricName}: ${duration}ms`}>
          {log.message || `${metricName}: ${duration}ms`}
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
          {(log.traceId || log.userId) && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-500 mb-2">
              {log.traceId && <div><span className="font-medium">Trace ID:</span> <span className="font-mono">{log.traceId}</span></div>}
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
          : tl('actions.confirmCleanLogs').replace('{{message}}', cleanMessage)}
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
