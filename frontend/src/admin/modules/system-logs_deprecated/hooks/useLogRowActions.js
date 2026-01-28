/**
 * useLogRowActions Hook
 * 日志行操作逻辑 - 复制、删除、清理
 * 
 * 所有日志行组件共享此 hook
 */

import { useState, useCallback } from 'react';
import { formatEST } from '@shared/utils';

/**
 * @param {Object} config
 * @param {Object} config.log - 日志对象
 * @param {Function} config.formatCopyData - 格式化复制数据的函数 (log) => object
 * @param {Function} config.deleteLog - 删除单条日志的 API 函数 (id) => Promise
 * @param {Function} config.deleteByMessage - 批量删除日志的 API 函数 (message) => Promise
 * @param {Function} config.onReload - 重新加载日志的回调
 * @param {Function} config.tl - 翻译函数
 */
export function useLogRowActions({
  log,
  formatCopyData,
  deleteLog,
  deleteByMessage,
  onReload,
  tl,
}) {
  const [copied, setCopied] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ open: false, type: null });
  const [loading, setLoading] = useState(false);

  // 复制到剪贴板
  const copyToClipboard = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      // 降级方案
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    }
  }, []);

  // 复制日志
  const handleCopy = useCallback(async (e) => {
    e?.stopPropagation();
    const data = formatCopyData ? formatCopyData(log) : {
      id: log.id,
      timestamp: formatEST(log.createdAt),
      level: log.level,
      message: log.message,
      extraData: log.extraData,
    };
    await copyToClipboard(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [log, formatCopyData, copyToClipboard]);

  // 打开删除确认
  const handleDelete = useCallback((e) => {
    e?.stopPropagation();
    setConfirmModal({ open: true, type: 'delete' });
  }, []);

  // 打开清理确认
  const handleDeleteSimilar = useCallback((e) => {
    e?.stopPropagation();
    setConfirmModal({ open: true, type: 'clean' });
  }, []);

  // 关闭确认框
  const handleCloseModal = useCallback(() => {
    setConfirmModal({ open: false, type: null });
  }, []);

  // 确认操作
  const handleConfirm = useCallback(async () => {
    setLoading(true);
    try {
      if (confirmModal.type === 'delete') {
        await deleteLog(log.id);
      } else {
        await deleteByMessage(log.message);
      }
      handleCloseModal();
      if (onReload) onReload();
    } catch (err) {
      alert(`${tl('actions.operationFailed')}: ${err.message || tl('actions.unknownError')}`);
    } finally {
      setLoading(false);
    }
  }, [confirmModal.type, log, deleteLog, deleteByMessage, onReload, tl, handleCloseModal]);

  return {
    copied,
    confirmModal,
    loading,
    handleCopy,
    handleDelete,
    handleDeleteSimilar,
    handleCloseModal,
    handleConfirm,
    copyToClipboard,
  };
}

export default useLogRowActions;
