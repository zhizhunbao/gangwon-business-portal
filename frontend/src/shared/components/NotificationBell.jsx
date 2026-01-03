/**
 * Notification Bell Component
 * 右上角通知图标组件 - 下拉框形式
 * 
 * 会员：只显示管理员回复的thread消息，点击弹出modal
 * 管理员：只显示会员发送的thread消息，点击跳转页面
 */

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Badge } from '@shared/components';
import { messagesService } from '@shared/services';
import { formatDateTime } from '@shared/utils/format';
import { EnvelopeIcon, EnvelopeOpenIcon } from '@shared/components/Icons';
import ThreadDetailModal from './ThreadDetailModal';

export default function NotificationBell({ userType = 'member', variant = 'light' }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const intervalRef = useRef(null);
  const dropdownRef = useRef(null);
  
  // Modal 状态（会员端使用）
  const [selectedThreadId, setSelectedThreadId] = useState(null);

  const viewAllPath = userType === 'admin' ? '/admin/messages' : '/member/support/inquiry-history';
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
      // 401 错误表示用户未登录，静默处理
      const status = error?.status || error?.response?.status;
      if (status === 401) {
        setUnreadCount(0);
        return;
      }
      console.error('Failed to load unread count:', error);
    }
  };

  const loadNotifications = async () => {
    setLoading(true);
    
    try {
      if (userType === 'admin') {
        const threadsResponse = await messagesService.getAdminThreads({ page: 1, pageSize: 10, hasUnread: true });
        const threadNotifications = (threadsResponse.items || [])
          .filter(thread => thread.adminUnreadCount > 0)
          .map(thread => ({
            id: thread.id,
            subject: thread.subject,
            content: t('notifications.fromMember', { name: thread.memberName || t('admin.messages.thread.member') }),
            isRead: false,
            isImportant: false,
            createdAt: thread.lastMessageAt || thread.createdAt,
            isThread: true
          }));
        setNotifications(threadNotifications);
      } else {
        const threadsResponse = await messagesService.getMemberThreads({ page: 1, pageSize: 10 });
        const threadNotifications = (threadsResponse.items || [])
          .filter(thread => thread.unreadCount > 0)
          .map(thread => ({
            id: thread.id,
            subject: thread.subject,
            content: t('notifications.adminReplied'),
            isRead: false,
            isImportant: false,
            createdAt: thread.lastMessageAt || thread.createdAt,
            isThread: true
          }));
        setNotifications(threadNotifications);
      }
    } catch (error) {
      // 401 错误表示用户未登录，静默处理
      const status = error?.status || error?.response?.status;
      if (status === 401) {
        setNotifications([]);
        setLoading(false);
        return;
      }
      console.error('Failed to load notifications:', error);
    }
    
    setLoading(false);
  };

  // 点击打开时才加载未读数和通知列表
  useEffect(() => {
    if (isOpen) {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setUnreadCount(0);
        return;
      }
      loadUnreadCount();
      loadNotifications();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleNotificationClick = (notification) => {
    setIsOpen(false);
    
    if (userType === 'admin') {
      navigate(`/admin/messages?threadId=${notification.id}`);
    } else {
      // 会员：打开 modal
      setSelectedThreadId(notification.id);
    }
  };

  const handleModalClose = () => {
    setSelectedThreadId(null);
    loadUnreadCount();
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`relative p-2 ${iconColorClass} transition-colors cursor-pointer border-none bg-transparent outline-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md`}
          aria-label={t('common.notifications')}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {unreadCount > 0 && (
            <Badge variant="error" className="absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center text-xs px-1 animate-pulse">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-[500px] flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">{t('common.notifications')}</h3>
              {unreadCount > 0 && (
                <Badge variant="error" size="sm">{unreadCount} {t('notifications.unread')}</Badge>
              )}
            </div>

            <div className="overflow-y-auto flex-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {loading ? (
                <div className="py-8 text-center">
                  <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-sm text-gray-500">{t('common.loading')}</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-gray-500">{t('notifications.empty')}</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${!notification.isRead ? 'bg-blue-50/50' : ''}`}
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
                            <h4 className={`text-sm truncate ${!notification.isRead ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                              {notification.subject}
                            </h4>
                            {notification.isImportant && <Badge variant="error" size="sm">{t('notifications.important')}</Badge>}
                            {!notification.isRead && <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></span>}
                          </div>
                          {notification.content && (
                            <p className="text-xs text-gray-500 truncate mb-1">
                              {notification.content.length > 80 ? `${notification.content.substring(0, 80)}...` : notification.content}
                            </p>
                          )}
                          <span className="text-xs text-gray-400">{formatDateTime(notification.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-4 py-3 border-t border-gray-200">
              <button 
                onClick={() => {
                  setIsOpen(false);
                  navigate(viewAllPath);
                }} 
                className="block w-full text-center text-sm text-primary-600 hover:text-primary-800 font-medium bg-transparent border-none cursor-pointer"
              >
                {t('notifications.viewAll')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 会员端消息详情 Modal */}
      {userType === 'member' && (
        <ThreadDetailModal
          threadId={selectedThreadId}
          isOpen={selectedThreadId !== null}
          onClose={handleModalClose}
          onMessageSent={loadUnreadCount}
        />
      )}
    </>
  );
}
