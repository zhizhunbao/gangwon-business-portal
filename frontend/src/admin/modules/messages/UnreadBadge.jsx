/**
 * Unread Badge Component - Admin Portal
 * 未读消息徽章 - 显示未读消息数量
 */

import { useState, useEffect } from 'react';
import { Badge } from '@shared/components';
import { messagesService } from '@shared/services';

export default function UnreadBadge({ className = '', size = 'sm' }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadUnreadCount = async () => {
    setLoading(true);
    const count = await messagesService.getUnreadCount();
    setUnreadCount(count);
    setLoading(false);
  };

  useEffect(() => {
    loadUnreadCount();
    
    // Poll for updates every 30 seconds
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading || unreadCount === 0) {
    return null;
  }

  return (
    <Badge 
      variant="error" 
      size={size}
      className={`animate-pulse ${className}`}
    >
      {unreadCount > 99 ? '99+' : unreadCount}
    </Badge>
  );
}