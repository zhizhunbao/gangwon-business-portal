/**
 * Notification List Component - Member Portal
 * 通知列表组件 - 表格布局，与咨询历史保持一致
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDateTime } from '@shared/utils/format';
import Card, { CardBody } from '@shared/components/Card';
import { Badge, Pagination, Modal } from '@shared/components';
import Button from '@shared/components/Button';
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@shared/components/Table';
import { messagesService } from '@shared/services';
import { SearchIcon, BellIcon, EnvelopeIcon, EnvelopeOpenIcon } from '@shared/components/Icons';

export default function NotificationList() {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedNotificationId, setSelectedNotificationId] = useState(null);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  
  // 搜索和过滤状态
  const [searchKeyword, setSearchKeyword] = useState('');
  const [readFilter, setReadFilter] = useState('');
  
  // 分页状态
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0
  });

  const loadNotifications = useCallback(async (page = 1) => {
    setLoading(true);
    const response = await messagesService.getMemberMessages({
      page,
      pageSize: pagination.pageSize
    });
    setNotifications(response.items || []);
    setPagination(prev => ({
      ...prev,
      page: response.page || page,
      total: response.total || 0,
      totalPages: response.totalPages || Math.ceil((response.total || 0) / prev.pageSize)
    }));
    setLoading(false);
  }, [pagination.pageSize]);

  useEffect(() => {
    loadNotifications(1);
  }, [loadNotifications]);

  const handlePageChange = (newPage) => {
    loadNotifications(newPage);
  };

  // 过滤后的通知列表（客户端搜索和筛选）
  const filteredNotifications = useMemo(() => {
    return notifications.filter(notification => {
      // 关键词搜索（标题和内容）
      if (searchKeyword) {
        const keyword = searchKeyword.toLowerCase();
        const subject = (notification.subject || '').toLowerCase();
        const content = (notification.content || '').toLowerCase();
        if (!subject.includes(keyword) && !content.includes(keyword)) {
          return false;
        }
      }
      // 已读/未读筛选
      if (readFilter !== '') {
        const isRead = readFilter === 'read';
        if (notification.isRead !== isRead) {
          return false;
        }
      }
      return true;
    });
  }, [notifications, searchKeyword, readFilter]);

  // 打开详情模态框
  const openDetailModal = async (notificationId) => {
    setSelectedNotificationId(notificationId);
    setLoadingDetail(true);
    try {
      const response = await messagesService.getMemberMessage(notificationId);
      if (response) {
        setSelectedNotification(response);
        // 如果未读，自动标记为已读
        if (!response.isRead) {
          await messagesService.updateMemberMessage(notificationId, { isRead: true });
          // 更新列表中的状态
          setNotifications(prev => prev.map(n => 
            n.id === notificationId ? { ...n, isRead: true } : n
          ));
        }
      }
    } catch (err) {
      console.error('Failed to load notification detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  // 关闭详情模态框
  const closeDetailModal = () => {
    setSelectedNotificationId(null);
    setSelectedNotification(null);
  };

  // 标记为已读
  const handleMarkAsRead = async (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await messagesService.updateMemberMessage(id, { isRead: true });
      setNotifications(prev => prev.map(n => 
        n.id === id ? { ...n, isRead: true } : n
      ));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  // 筛选选项
  const readFilterOptions = [
    { value: '', label: t('common.all') },
    { value: 'unread', label: t('notifications.unread') },
    { value: 'read', label: t('notifications.read') }
  ];

  return (
    <div className="w-full">
      <div className="mb-6 sm:mb-8 lg:mb-10 min-h-[48px] flex items-center">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 m-0">
          {t('notifications.title')}
        </h1>
      </div>

      {/* 搜索和筛选 */}
      <Card className="p-4 sm:p-5 lg:p-6 mb-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px] max-w-md">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder={t('notifications.searchPlaceholder')}
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
              />
            </div>
          </div>
          <div className="w-full sm:w-48 sm:flex-shrink-0">
            <select
              value={readFilter}
              onChange={(e) => setReadFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            >
              {readFilterOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* 列表 */}
      <Card>
        <CardBody>
          {loading ? (
            <div className="text-center py-12 px-4">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-base text-gray-500 m-0">{t('common.loading')}</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-12 px-4">
              <p className="text-base text-gray-500 m-0 mb-4">
                {notifications.length === 0 
                  ? t('notifications.empty') 
                  : t('notifications.noMatching')}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>{t('notifications.subject')}</TableHeader>
                    <TableHeader>{t('notifications.status')}</TableHeader>
                    <TableHeader>{t('notifications.important')}</TableHeader>
                    <TableHeader>{t('notifications.time')}</TableHeader>
                    <TableHeader>{t('notifications.from')}</TableHeader>
                    <TableHeader>{t('common.actions')}</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredNotifications.map((notification) => (
                    <TableRow 
                      key={notification.id}
                      className={!notification.isRead ? 'bg-blue-50/50' : ''}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {notification.isRead ? (
                            <EnvelopeOpenIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          ) : (
                            <EnvelopeIcon className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          )}
                          <span className={`font-medium ${!notification.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                            {notification.subject}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {notification.isRead ? (
                          <Badge variant="secondary" size="sm">
                            {t('notifications.read')}
                          </Badge>
                        ) : (
                          <Badge variant="success" size="sm">
                            {t('notifications.unread')}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {notification.isImportant ? (
                          <Badge variant="error" size="sm">
                            {t('notifications.important')}
                          </Badge>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-600 text-sm">
                        {notification.createdAt ? formatDateTime(notification.createdAt) : '-'}
                      </TableCell>
                      <TableCell className="text-gray-600 text-sm">
                        {notification.senderName || t('notifications.system')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openDetailModal(notification.id)}
                            className="text-primary-600 hover:text-primary-900 font-medium text-sm"
                          >
                            {t('common.view')}
                          </button>
                          {!notification.isRead && (
                            <button
                              onClick={(e) => handleMarkAsRead(notification.id, e)}
                              className="text-xs text-gray-500 hover:text-gray-700"
                            >
                              {t('notifications.markAsRead')}
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* 分页 */}
              {pagination.totalPages > 1 && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="text-sm text-gray-600">
                      {t('common.total')} {pagination.total} {t('common.items')}
                    </div>
                    <Pagination
                      currentPage={pagination.page}
                      totalPages={pagination.totalPages}
                      onPageChange={handlePageChange}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </CardBody>
      </Card>

      {/* 详情模态框 */}
      <Modal
        isOpen={selectedNotificationId !== null}
        onClose={closeDetailModal}
        title={selectedNotification?.subject || t('notifications.detail')}
        size="lg"
      >
        {loadingDetail ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm text-gray-500">{t('common.loading')}</p>
          </div>
        ) : selectedNotification ? (
          <div className="max-h-[70vh] overflow-y-auto">
            <div className="space-y-4">
              {/* 元信息 */}
              <div className="flex flex-wrap gap-4 pb-4 border-b border-gray-200 text-sm text-gray-600">
                <span>
                  {t('notifications.from')}: <strong className="text-gray-900">
                    {selectedNotification.senderName || t('notifications.system')}
                  </strong>
                </span>
                <span>
                  {t('notifications.time')}: <strong className="text-gray-900">
                    {selectedNotification.createdAt ? formatDateTime(selectedNotification.createdAt) : '-'}
                  </strong>
                </span>
                {selectedNotification.isImportant && (
                  <Badge variant="error" size="sm">
                    {t('notifications.important')}
                  </Badge>
                )}
              </div>

              {/* 内容 */}
              <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                {selectedNotification.content}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
