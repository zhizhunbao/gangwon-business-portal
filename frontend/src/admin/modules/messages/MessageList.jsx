/**
 * Message List Component - Admin Portal
 * 站内信列表
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Button, Badge, Alert, Pagination } from '@shared/components';
import { messageService, loggerService, exceptionService } from '@shared/services';

export default function MessageList() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [filter, setFilter] = useState('all'); // all, unread, read, important
  const [message, setMessage] = useState(null);
  const [messageVariant, setMessageVariant] = useState('success');
  const [selectedMessage, setSelectedMessage] = useState(null);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      loggerService.info('Loading messages', {
        module: 'MessageList',
        function: 'loadMessages',
        page: currentPage,
        filter: filter
      });
      
      const params = {
        page: currentPage,
        pageSize: pageSize,
        isRead: filter === 'read' ? true : filter === 'unread' ? false : undefined,
        isImportant: filter === 'important' ? true : undefined,
      };
      
      const response = await messageService.getMessages(params);
      setMessages(response.items || []);
      setTotalCount(response.total || 0);
      setUnreadCount(response.unreadCount || 0);
      
      loggerService.info('Messages loaded successfully', {
        module: 'MessageList',
        function: 'loadMessages',
        count: response.items?.length || 0
      });
    } catch (error) {
      loggerService.error('Failed to load messages', {
        module: 'MessageList',
        function: 'loadMessages',
        error_message: error.message,
        error_code: error.code
      });
      exceptionService.recordException(error, {
        request_path: window.location.pathname,
        error_code: 'LOAD_MESSAGES_ERROR'
      });
      setMessageVariant('error');
      setMessage(error?.response?.data?.detail || error?.message || t('admin.messages.loadFailed', '加载消息失败'));
    } finally {
      setLoading(false);
    }
  }, [currentPage, filter, pageSize, t]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const handleMessageClick = (msg) => {
    setSelectedMessage(msg);
    // Mark as read if unread
    if (!msg.isRead) {
      handleMarkAsRead(msg.id);
    }
  };

  const handleMarkAsRead = async (messageId) => {
    try {
      await messageService.updateMessage(messageId, { isRead: true });
      await loadMessages();
      setMessageVariant('success');
      setMessage(t('admin.messages.markedAsRead', '已标记为已读'));
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      loggerService.error('Failed to mark message as read', {
        module: 'MessageList',
        function: 'handleMarkAsRead',
        error_message: error.message
      });
    }
  };

  const handleDelete = async (messageId) => {
    if (!window.confirm(t('admin.messages.confirmDelete', '确定要删除这条消息吗？'))) {
      return;
    }
    
    try {
      await messageService.deleteMessage(messageId);
      await loadMessages();
      if (selectedMessage?.id === messageId) {
        setSelectedMessage(null);
      }
      setMessageVariant('success');
      setMessage(t('admin.messages.deleted', '删除成功'));
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      loggerService.error('Failed to delete message', {
        module: 'MessageList',
        function: 'handleDelete',
        error_message: error.message
      });
      exceptionService.recordException(error, {
        request_path: window.location.pathname,
        error_code: 'DELETE_MESSAGE_ERROR'
      });
      setMessageVariant('error');
      setMessage(error?.response?.data?.detail || error?.message || t('admin.messages.deleteFailed', '删除失败'));
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="w-full">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold text-gray-900">
            {t('admin.messages.title', '站内信')}
          </h1>
          <div className="flex items-center gap-4">
            {unreadCount > 0 && (
              <Badge variant="error" className="text-sm">
                {t('admin.messages.unreadCount', '未读')}: {unreadCount}
              </Badge>
            )}
          </div>
        </div>

        {message && (
          <Alert variant={messageVariant} className="mb-4">
            {message}
          </Alert>
        )}

        {/* Filter buttons */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={filter === 'all' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            {t('admin.messages.filters.all', '全部')}
          </Button>
          <Button
            variant={filter === 'unread' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter('unread')}
          >
            {t('admin.messages.filters.unread', '未读')}
          </Button>
          <Button
            variant={filter === 'read' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter('read')}
          >
            {t('admin.messages.filters.read', '已读')}
          </Button>
          <Button
            variant={filter === 'important' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter('important')}
          >
            {t('admin.messages.filters.important', '重要')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Message list */}
        <div className="lg:col-span-1">
          <Card className="h-[600px] flex flex-col">
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-gray-500">{t('common.loading', '加载中...')}</div>
              ) : messages.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  {t('admin.messages.empty', '暂无消息')}
                </div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {messages.map((msg) => (
                    <li
                      key={msg.id}
                      className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedMessage?.id === msg.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                      } ${!msg.isRead ? 'bg-blue-50/50' : ''}`}
                      onClick={() => handleMessageClick(msg)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`font-medium text-sm truncate ${!msg.isRead ? 'font-semibold' : ''}`}>
                              {msg.subject}
                            </span>
                            {msg.isImportant && (
                              <Badge variant="error" size="sm">重要</Badge>
                            )}
                            {!msg.isRead && (
                              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 truncate">
                            {msg.recipientName || t('admin.messages.recipient', '收件人')}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatDate(msg.createdAt)}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {totalCount > 0 && (
              <div className="border-t border-gray-200 p-4">
                <Pagination
                  current={currentPage}
                  total={totalCount}
                  pageSize={pageSize}
                  onChange={setCurrentPage}
                />
              </div>
            )}
          </Card>
        </div>

        {/* Message detail */}
        <div className="lg:col-span-2">
          <Card className="h-[600px] flex flex-col">
            {selectedMessage ? (
              <>
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="flex items-start justify-between mb-4 pb-4 border-b border-gray-200">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h2 className="text-xl font-semibold text-gray-900">
                          {selectedMessage.subject}
                        </h2>
                        {selectedMessage.isImportant && (
                          <Badge variant="error">重要</Badge>
                        )}
                        {!selectedMessage.isRead && (
                          <Badge variant="info">未读</Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>
                          <span className="font-medium">{t('admin.messages.from', '发件人')}:</span>{' '}
                          {selectedMessage.senderName || t('admin.messages.system', '系统')}
                        </p>
                        <p>
                          <span className="font-medium">{t('admin.messages.to', '收件人')}:</span>{' '}
                          {selectedMessage.recipientName || '-'}
                        </p>
                        <p>
                          <span className="font-medium">{t('admin.messages.date', '时间')}:</span>{' '}
                          {formatDate(selectedMessage.createdAt)}
                        </p>
                        {selectedMessage.readAt && (
                          <p>
                            <span className="font-medium">{t('admin.messages.readAt', '已读时间')}:</span>{' '}
                            {formatDate(selectedMessage.readAt)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="prose max-w-none">
                    <div className="whitespace-pre-wrap text-gray-700">
                      {selectedMessage.content}
                    </div>
                  </div>
                </div>
                <div className="border-t border-gray-200 p-4 flex justify-end gap-2">
                  {!selectedMessage.isRead && (
                    <Button
                      variant="outline"
                      onClick={() => handleMarkAsRead(selectedMessage.id)}
                    >
                      {t('admin.messages.markAsRead', '标记为已读')}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => handleDelete(selectedMessage.id)}
                  >
                    {t('common.delete', '删除')}
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                {t('admin.messages.selectMessage', '请选择一条消息查看详情')}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

