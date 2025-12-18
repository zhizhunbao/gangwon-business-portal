/**
 * Notification Bell Component
 * 右上角通知图标组件 - 下拉框形式
 */

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Badge } from '@shared/components';
import { messagesService, loggerService } from '@shared/services';
import { formatDateTime } from '@shared/utils/format';
import { EnvelopeIcon, EnvelopeOpenIcon } from '@shared/components/Icons';

export default function NotificationBell({ userType = 'member', variant = 'light' }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const intervalRef = useRef(null);
  const dropdownRef = useRef(null);

  // 根据用户类型确定查看全部通知的路径
  const viewAllPath = userType === 'admin' ? '/admin/messages' : '/member/support/notifications';
  
  // 根据 variant 确定图标颜色类
  const iconColorClass = variant === 'dark' 
    ? 'text-white hover:text-white/80' 
    : 'text-gray-600 hover:text-gray-900';

  const loadUnreadCount = async () => {
    try {
      const count = userType === 'admin' 
        ? await messagesService.getUnreadCount()
        : await messagesService.getMemberUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      loggerService.error('Failed to load unread count', {
        module: 'NotificationBell',
        function: 'loadUnreadCount',
        error_message: error.message
      });
    }
  };

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = userType === 'admin'
        ? await messagesService.getMessages({ page: 1, pageSize: 10 })
        : await messagesService.getMemberMessages({ page: 1, pageSize: 10 });
      setNotifications(response.items || []);
    } catch (error) {
      loggerService.error('Failed to load notifications', {
        module: 'NotificationBell',
        function: 'loadNotifications',
        error_message: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load immediately
    loadUnreadCount();
    
    // Poll every 30 seconds
    intervalRef.current = setInterval(() => {
      loadUnreadCount();
    }, 30000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [userType]);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleMarkAsRead = async (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if (userType === 'admin') {
        await messagesService.updateMessage(id, { isRead: true });
      } else {
        await messagesService.updateMemberMessage(id, { isRead: true });
      }
      loadNotifications();
      loadUnreadCount();
    } catch (error) {
      loggerService.error('Failed to mark as read', {
        module: 'NotificationBell',
        function: 'handleMarkAsRead',
        error_message: error.message
      });
    }
  };

  const handleNotificationClick = async (notification) => {
    // 如果未读，标记为已读
    if (!notification.isRead) {
      try {
        if (userType === 'admin') {
          await messagesService.updateMessage(notification.id, { isRead: true });
        } else {
          await messagesService.updateMemberMessage(notification.id, { isRead: true });
        }
        loadNotifications();
        loadUnreadCount();
      } catch (error) {
        loggerService.error('Failed to mark as read', {
          module: 'NotificationBell',
          function: 'handleNotificationClick',
          error_message: error.message
        });
      }
    }
    // 关闭下拉框并跳转到消息详情或列表页，带上消息ID参数
    setIsOpen(false);
    if (userType === 'admin') {
      navigate(`${viewAllPath}?messageId=${notification.id}`);
    } else {
      navigate(viewAllPath);
    }
  };


  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleToggle}
        className={`relative p-2 ${iconColorClass} transition-colors cursor-pointer border-none bg-transparent outline-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md`}
        aria-label={t('common.notifications', '通知')}
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <Badge
            variant="error"
            className="absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center text-xs px-1 animate-pulse"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </button>

      {/* 下拉框 */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-[500px] flex flex-col">
          {/* 头部 */}
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              {t('common.notifications', '通知')}
            </h3>
            {unreadCount > 0 && (
              <Badge variant="error" size="sm">
                {unreadCount} {t('notifications.unread', '未读')}
              </Badge>
            )}
          </div>

          {/* 通知列表 */}
          <div className="overflow-y-auto flex-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {loading ? (
              <div className="py-8 text-center">
                <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-sm text-gray-500">{t('common.loading', '加载中...')}</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-gray-500">{t('notifications.empty', '暂无通知')}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                      !notification.isRead ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {notification.isRead ? (
                          <EnvelopeOpenIcon className="w-4 h-4 text-gray-400" />
                        ) : (
                          <EnvelopeIcon className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={`text-sm truncate ${
                            !notification.isRead ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'
                          }`}>
                            {notification.subject}
                          </h4>
                          {notification.isImportant && (
                            <Badge variant="error" size="sm">
                              {t('notifications.important', '重要')}
                            </Badge>
                          )}
                          {!notification.isRead && (
                            <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></span>
                          )}
                        </div>
                        {notification.content && (
                          <p className="text-xs text-gray-500 truncate mb-1">
                            {notification.content.length > 80 
                              ? `${notification.content.substring(0, 80)}...` 
                              : notification.content}
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">
                            {formatDateTime(notification.createdAt)}
                          </span>
                          {!notification.isRead && (
                            <button
                              onClick={(e) => handleMarkAsRead(notification.id, e)}
                              className="text-xs text-blue-600 hover:text-blue-800"
                            >
                              {t('notifications.markAsRead', '标记已读')}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 底部 - 查看全部 */}
          <div className="px-4 py-3 border-t border-gray-200">
            <Link
              to={viewAllPath}
              onClick={() => setIsOpen(false)}
              className="block text-center text-sm text-primary-600 hover:text-primary-800 font-medium"
            >
              {t('notifications.viewAll', '查看全部通知')}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

