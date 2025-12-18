/**
 * Notification Detail Component - Member Portal
 * 通知详情组件
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Card from '@shared/components/Card';
import Button from '@shared/components/Button';
import { Badge } from '@shared/components';
import { formatDateTime } from '@shared/utils/format';
import { messagesService } from '@shared/services';
import { ArrowLeftIcon, BellIcon } from '@shared/components/Icons';

export default function NotificationDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotification();
  }, [id]);

  const loadNotification = async () => {
    if (!id) return;
    setLoading(true);
    const response = await messagesService.getMemberMessage(id);
    setNotification(response);
    // 自动标记为已读
    if (response && !response.isRead) {
      await messagesService.updateMemberMessage(id, { isRead: true });
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="w-full">
        <Card>
          <div className="py-16 text-center">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-gray-600">{t('common.loading')}</p>
          </div>
        </Card>
      </div>
    );
  }

  if (!notification) {
    return (
      <div className="w-full">
        <Card>
          <div className="py-16 text-center">
            <BellIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">{t('notifications.notFound')}</p>
            <Button
              variant="primary"
              onClick={() => navigate('/member/support/notifications')}
              className="mt-4"
            >
              {t('common.back')}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="mb-6">
        <Button
          variant="text"
          onClick={() => navigate('/member/support/notifications')}
          className="flex items-center gap-2 text-gray-600 hover:text-blue-600"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          {t('notifications.backToList')}
        </Button>
      </div>

      <Card>
        <div className="p-6">
          {/* 标题和标签 */}
          <div className="flex items-start justify-between gap-4 mb-6 pb-6 border-b border-gray-200">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              {notification.subject}
            </h1>
            {notification.isImportant && (
              <Badge variant="error">
                {t('notifications.important')}
              </Badge>
            )}
          </div>

          {/* 元信息 */}
          <div className="flex flex-wrap gap-4 mb-6 text-sm text-gray-500">
            <span>
              {t('notifications.from')}: {notification.senderName || t('notifications.system')}
            </span>
            <span>
              {t('notifications.time')}: {formatDateTime(notification.createdAt)}
            </span>
          </div>

          {/* 内容 */}
          <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
            {notification.content}
          </div>
        </div>
      </Card>
    </div>
  );
}
