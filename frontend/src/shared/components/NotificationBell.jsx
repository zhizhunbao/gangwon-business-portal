/**
 * Notification Bell Component
 * 右上角通知图标组件
 */

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@shared/components';
import { messageService, loggerService } from '@shared/services';

export default function NotificationBell({ userType = 'member' }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef(null);

  const loadUnreadCount = async () => {
    try {
      setLoading(true);
      const count = userType === 'admin' 
        ? await messageService.getUnreadCount()
        : await messageService.getMemberUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      loggerService.error('Failed to load unread count', {
        module: 'NotificationBell',
        function: 'loadUnreadCount',
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

  const handleClick = () => {
    if (userType === 'admin') {
      navigate('/admin/messages');
    } else {
      navigate('/member/messages');
    }
  };

  return (
    <button
      onClick={handleClick}
      className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors cursor-pointer border-none bg-transparent outline-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md"
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
  );
}

