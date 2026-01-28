/**
 * Clipboard Utilities
 * 剪贴板工具函数
 */

import { formatEST } from '@shared/utils';

/**
 * 复制文本到剪贴板
 * @param {string} text - 要复制的文本
 * @returns {Promise<boolean>} - 是否成功
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    // 降级方案：使用 execCommand
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return true;
  }
}

/**
 * 复制日志数据到剪贴板
 * @param {Array} logs - 日志数组
 * @param {Function} formatFn - 格式化函数 (log) => object
 * @param {number} count - 复制条数，默认 5
 * @returns {Promise<boolean>}
 */
export async function copyLatestLogs(logs, formatFn, count = 5) {
  const latestLogs = logs.slice(0, count).map(formatFn);
  return copyToClipboard(JSON.stringify(latestLogs, null, 2));
}

/**
 * 统一的日志复制格式化函数
 * 按日志规范输出所有字段
 * @param {Object} log - 日志对象
 * @returns {Object} - 格式化后的日志对象
 */
export function formatLogForCopy(log) {
  return {
    timestamp: formatEST(log.createdAt),
    source: log.source || 'backend',
    level: log.level || 'INFO',
    message: log.message || '',
    layer: log.layer || '',
    module: log.module || '',
    function: log.function || '',
    line_number: log.lineNumber || 0,
    file_path: log.filePath || '',
    trace_id: log.traceId || '',
    request_id: log.requestId || '',
    user_id: log.userId || null,
    duration_ms: log.durationMs || null,
    extra_data: log.extraData || null,
  };
}
