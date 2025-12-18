/**
 * Message Thread Component - Admin Portal
 * 消息会话详情 - 支持会话式消息交流
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Badge, Alert, Loading } from '@shared/components';
import { messagesService } from '@shared/services';
import { formatDateTime } from '@shared/utils/format';
import MessageComposer from './MessageComposer';

export default function MessageThread() {
  const { t, i18n } = useTranslation();
  const { threadId } = useParams();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  
  const [loading, setLoading] = useState(false);
  const [thread, setThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [showComposer, setShowComposer] = useState(false);
  const [message, setMessage] = useState(null);
  const [messageVariant, setMessageVariant] = useState('success');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadThread = useCallback(async () => {
    if (!threadId) return;
    
    setLoading(true);
    const response = await messagesService.getThread(threadId);
    setThread(response.thread);
    setMessages(response.messages || []);
    
    // Mark unread messages as read
    const unreadMessages = response.messages?.filter(msg => !msg.isRead && msg.senderType !== 'admin') || [];
    if (unreadMessages.length > 0) {
      await Promise.all(
        unreadMessages.map(msg => messagesService.updateMessage(msg.id, { isRead: true }))
      );
    }
    setLoading(false);
  }, [threadId]);

  useEffect(() => {
    loadThread();
  }, [loadThread]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (messageData) => {
    const newMessage = await messagesService.createThreadMessage(threadId, messageData);
    setMessages(prev => [...prev, newMessage]);
    setShowComposer(false);
    setMessageVariant('success');
    setMessage(t('admin.messages.thread.messageSent'));
    setTimeout(() => setMessage(null), 3000);
  };

  const handleCloseThread = async () => {
    if (!window.confirm(t('admin.messages.thread.confirmClose'))) {
      return;
    }
    
    await messagesService.updateThread(threadId, { status: 'closed' });
    setThread(prev => ({ ...prev, status: 'closed' }));
    setMessageVariant('success');
    setMessage(t('admin.messages.thread.closed'));
  };

  const handleReopenThread = async () => {
    await messagesService.updateThread(threadId, { status: 'open' });
    setThread(prev => ({ ...prev, status: 'open' }));
    setMessageVariant('success');
    setMessage(t('admin.messages.thread.reopened'));
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      // 24小时内：显示时间 HH:mm
      return formatDateTime(date, 'HH:mm', i18n.language);
    } else if (diffInHours < 24 * 7) {
      // 7天内：显示日期+时间 MM-dd HH:mm
      return formatDateTime(date, 'MM-dd HH:mm', i18n.language);
    } else {
      // 超过7天：显示日期 yyyy-MM-dd
      return formatDateTime(date, 'yyyy-MM-dd', i18n.language);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      open: { variant: 'success', label: t('admin.messages.thread.status.open') },
      resolved: { variant: 'info', label: t('admin.messages.thread.status.resolved') },
      closed: { variant: 'secondary', label: t('admin.messages.thread.status.closed') }
    };
    
    const config = statusMap[status] || statusMap.open;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getCategoryBadge = (category) => {
    const categoryMap = {
      support: { variant: 'info', label: t('admin.messages.category.support') },
      performance: { variant: 'warning', label: t('admin.messages.category.performance') },
      general: { variant: 'secondary', label: t('admin.messages.category.general') }
    };
    
    const config = categoryMap[category] || categoryMap.general;
    return <Badge variant={config.variant} size="sm">{config.label}</Badge>;
  };

  if (loading) {
    return <Loading />;
  }

  if (!thread) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-500 mb-4">{t('admin.messages.thread.notFound')}</p>
          <Button onClick={() => navigate('/admin/messages')}>
            {t('admin.messages.thread.backToList')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/messages')}
            >
              ← {t('admin.messages.thread.back')}
            </Button>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 m-0 mb-1">
                {thread.subject}
              </h2>
              <p className="text-gray-600 text-sm m-0">
                {t('admin.messages.thread.description')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getCategoryBadge(thread.category)}
            {getStatusBadge(thread.status)}
          </div>
        </div>

        {/* Thread Info */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">
                {t('admin.messages.thread.member')}:
              </span>
              <span className="ml-2 text-gray-900">{thread.memberName}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">
                {t('admin.messages.thread.created')}:
              </span>
              <span className="ml-2 text-gray-900">{formatDate(thread.createdAt)}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">
                {t('admin.messages.thread.lastMessage')}:
              </span>
              <span className="ml-2 text-gray-900">{formatDate(thread.lastMessageAt)}</span>
            </div>
          </div>
        </div>

        {message && (
          <Alert variant={messageVariant} className="mb-4">
            {message}
          </Alert>
        )}
      </div>

      {/* Messages */}
      <Card className="mb-6">
        <div className="h-96 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              {t('admin.messages.thread.noMessages')}
            </div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={msg.id}
                className={`flex ${msg.senderType === 'admin' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                    msg.senderType === 'admin'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium">
                      {msg.senderType === 'admin' ? t('admin.messages.thread.admin') : thread.memberName}
                    </span>
                    <span className={`text-xs ${msg.senderType === 'admin' ? 'text-blue-100' : 'text-gray-500'}`}>
                      {formatDate(msg.createdAt)}
                    </span>
                  </div>
                  <div className="whitespace-pre-wrap text-sm">
                    {msg.content}
                  </div>
                      {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-opacity-20">
                      {msg.attachments.map((attachment, idx) => (
                        <div key={idx} className="text-xs">
                          {t('common.attachment')} {attachment.fileName}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {thread.status === 'open' ? (
            <>
              <Button
                variant="primary"
                onClick={() => setShowComposer(true)}
              >
                {t('admin.messages.thread.reply')}
              </Button>
              <Button
                variant="outline"
                onClick={handleCloseThread}
              >
                {t('admin.messages.thread.close')}
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              onClick={handleReopenThread}
            >
              {t('admin.messages.thread.reopen')}
            </Button>
          )}
        </div>
        
        <div className="text-sm text-gray-500">
          {t('admin.messages.thread.messageCount', { count: messages.length })}
        </div>
      </div>

      {/* Message Composer Modal */}
      {showComposer && (
        <MessageComposer
          threadId={threadId}
          recipientName={thread.memberName}
          onSend={handleSendMessage}
          onCancel={() => setShowComposer(false)}
        />
      )}
    </div>
  );
}