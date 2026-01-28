/**
 * LogRow Component
 * 日志行通用组件 - 行展示、展开详情、操作按钮
 * 
 * 所有日志查看器共享此组件，通过配置实现差异化
 */

import { ConfirmModal } from '@shared/components';
import { formatEST, parseFilename } from '@shared/utils';
import { useLogRowActions } from '../hooks';

// 级别颜色映射
const levelColors = {
  DEBUG: 'bg-gray-100 text-gray-600',
  INFO: 'bg-blue-100 text-blue-700',
  WARNING: 'bg-yellow-100 text-yellow-700',
  ERROR: 'bg-red-100 text-red-700',
  CRITICAL: 'bg-red-200 text-red-800',
};

/**
 * @param {Object} props
 * @param {Object} props.log - 日志对象
 * @param {boolean} props.expanded - 是否展开
 * @param {Function} props.onToggle - 展开/收起回调
 * @param {Function} props.onReload - 重新加载回调
 * @param {Object} props.tl - 翻译函数
 * @param {Function} props.formatCopyData - 格式化复制数据（可选）
 * @param {Function} props.deleteLog - 删除日志 API
 * @param {Function} props.deleteByMessage - 批量删除 API
 * @param {string} props.rowClassName - 行额外样式（可选）
 * @param {Function} props.renderExpandedContent - 自定义展开内容渲染（可选）
 * @param {string} props.cleanConfirmMessage - 清理确认消息（可选）
 */
export function LogRow({
  log,
  expanded,
  onToggle,
  onReload,
  tl,
  formatCopyData,
  deleteLog,
  deleteByMessage,
  rowClassName = '',
  renderExpandedContent,
  cleanConfirmMessage,
}) {
  const {
    copied,
    confirmModal,
    loading,
    handleCopy,
    handleDelete,
    handleDeleteSimilar,
    handleCloseModal,
    handleConfirm,
  } = useLogRowActions({
    log,
    formatCopyData,
    deleteLog,
    deleteByMessage,
    onReload,
    tl,
  });

  // 格式化字节数为可读格式
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 格式化 extraData
  const formatExtraData = (data) => {
    if (!data) return null;
    
    const formatted = { ...data };
    
    // 删除冗余的 timestamp（和日志 createdAt 重复）
    delete formatted.timestamp;
    
    // 格式化 stack_trace
    if (formatted.stack_trace && typeof formatted.stack_trace === 'string') {
      formatted.stack_trace = formatted.stack_trace.split('\n');
    }
    
    // 格式化字节相关字段
    const byteFields = ['used', 'limit', 'total', 'threshold_bytes', 'threshold_ms', 'metric_value', 'response_size'];
    const isMemoryLog = formatted.metric_unit === 'bytes' || formatted.metric_name === 'memory_usage';
    
    if (isMemoryLog) {
      byteFields.forEach(field => {
        if (typeof formatted[field] === 'number' && formatted[field] > 1024) {
          formatted[field] = formatBytes(formatted[field]);
        }
      });
      // 格式化百分比
      if (typeof formatted.usage_percentage === 'number') {
        formatted.usage_percentage = formatted.usage_percentage + '%';
      }
    }
    
    return formatted;
  };

  // 默认展开内容渲染
  const defaultExpandedContent = () => (
    <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
      {(log.traceId || log.userId || log.requestId) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-500 mb-2">
          {log.traceId && <div><span className="font-medium">Trace ID:</span> <span className="font-mono">{log.traceId}</span></div>}
          {log.requestId && <div><span className="font-medium">Request ID:</span> <span className="font-mono">{log.requestId}</span></div>}
          {log.userId && <div><span className="font-medium">User ID:</span> <span className="font-mono">{log.userId}</span></div>}
        </div>
      )}
      {log.extraData && Object.keys(log.extraData).length > 0 && 
       !(Object.keys(log.extraData).length === 1 && log.extraData.logger_name === log.module) && (
        <>
          <p className="text-xs font-medium text-gray-500 mb-1">{tl('table.extraData')}:</p>
          <pre className="text-xs bg-gray-800 text-green-400 p-3 rounded overflow-x-auto">
            {JSON.stringify(formatExtraData(log.extraData), null, 2)}
          </pre>
        </>
      )}
    </div>
  );

  const levelColor = levelColors[log.level] || levelColors.INFO;
  const message = log.message || '-';
  const cleanMsg = cleanConfirmMessage || tl('actions.confirmCleanLogs').replace('{{message}}', message?.substring(0, 50));
  
  // 直接使用数据库的值，不做转换（除了 file 字段）
  const displayModule = log.module || '-';
  const displayFilename = parseFilename(log.module, log.source, log.filePath);

  return (
    <div className={`hover:bg-gray-50 ${rowClassName}`}>
      {/* 行内容 */}
      <div 
        className="grid grid-cols-12 gap-2 px-4 py-3 cursor-pointer items-center" 
        onClick={onToggle}
      >
        <div className="col-span-2 text-xs text-gray-500 font-mono">
          {formatEST(log.createdAt)}
        </div>
        <div className="col-span-1">
          <span className={`px-2 py-0.5 text-xs rounded-full ${levelColor}`}>
            {log.level || 'INFO'}
          </span>
        </div>
        <div className="col-span-1 text-xs text-gray-500">
          {log.source || 'backend'}
        </div>
        <div className="col-span-1 text-xs text-gray-600">
          {log.layer || '-'}
        </div>
        <div className="col-span-2 text-xs text-gray-500 truncate" title={log.module}>
          {displayModule}
        </div>
        <div className="col-span-1 text-xs text-gray-500 truncate" title={log.filePath || '-'}>
          {displayFilename}
        </div>
        <div className="col-span-3 text-sm text-gray-900 truncate" title={message}>
          {message}
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

      {/* 展开详情 */}
      {expanded && (renderExpandedContent ? renderExpandedContent(log) : defaultExpandedContent())}

      {/* 确认弹窗 */}
      <ConfirmModal
        isOpen={confirmModal.open}
        onClose={handleCloseModal}
        onConfirm={handleConfirm}
        title={confirmModal.type === 'delete' ? tl('actions.deleteLog') : tl('actions.cleanLog')}
        message={confirmModal.type === 'delete' ? tl('actions.confirmDelete') : cleanMsg}
        confirmText={confirmModal.type === 'delete' ? tl('actions.delete') : tl('actions.clean')}
        loading={loading}
      />
    </div>
  );
}

export default LogRow;
