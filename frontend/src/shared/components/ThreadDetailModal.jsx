/**
 * Thread Detail Modal Component
 * 消息详情模态框 - 可复用组件（精简版）
 */

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@shared/components';
import Button from '@shared/components/Button';
import { messagesService } from '@shared/services';
import { formatDateTime } from '@shared/utils/format';

export default function ThreadDetailModal({ 
  threadId, 
  isOpen, 
  onClose, 
  onMessageSent 
}) {
  const { t } = useTranslation();
  const [threadData, setThreadData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen && threadId) {
      loadThreadDetail();
    }
  }, [isOpen, threadId]);

  const loadThreadDetail = async () => {
    setLoading(true);
    setReplyContent('');
    try {
      const response = await messagesService.getMemberThread(threadId);
      if (response) {
        setThreadData(response);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch (err) {
      // AOP 系统会自动记录错误
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setThreadData(null);
    setReplyContent('');
    onClose();
  };

  const handleReply = async () => {
    if (!threadId || !replyContent.trim()) return;

    setSubmitting(true);
    try {
      const newMessage = await messagesService.createMemberThreadMessage(threadId, {
        content: replyContent,
        isImportant: false,
        attachments: []
      });
      setThreadData(prev => ({
        ...prev,
        messages: [...(prev.messages || []), newMessage]
      }));
      setReplyContent('');
      onMessageSent?.();
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      // AOP 系统会自动记录错误
      alert(t('support.replyFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={threadData?.thread?.subject || t('support.inquiryDetail')}
      size="xl"
    >
      {loading ? (
        <div className="py-12 text-center">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">{t('common.loading')}</p>
        </div>
      ) : threadData ? (
        <div className="flex flex-col h-[75vh]">
          {/* 消息列表区域 */}
          <div className="flex-1 overflow-y-auto px-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {!threadData.messages || threadData.messages.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm">
                {t('support.noMessages')}
              </div>
            ) : (
              <div className="space-y-3 py-2">
                {threadData.messages.map((msg) => {
                  const isMember = msg.senderType === 'member';
                  const senderName = isMember ? t('support.user') : t('support.admin');
                  
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMember ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] rounded-lg px-3 py-2 ${
                        isMember ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-900'
                      }`}>
                        <div className={`flex items-center gap-2 mb-1 text-xs ${
                          isMember ? 'justify-end text-primary-100' : 'justify-start text-gray-500'
                        }`}>
                          <span className="font-medium">{senderName}</span>
                          <span>{msg.createdAt ? formatDateTime(msg.createdAt) : ''}</span>
                        </div>
                        <div className="text-sm leading-relaxed whitespace-pre-wrap">
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 回复输入区域 */}
          {threadData.thread.status === 'open' && (
            <div className="pt-3 border-t border-gray-200 mt-2">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder={t('support.replyPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                rows={3}
              />
              <div className="flex justify-end mt-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleReply}
                  disabled={!replyContent.trim() || submitting}
                >
                  {submitting ? t('common.sending') : t('support.sendReply')}
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </Modal>
  );
}
