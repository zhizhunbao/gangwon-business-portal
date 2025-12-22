/**
 * Inquiry Detail Component - Member Portal
 * 咨询详情页面 - 精简版，满足PRD要求
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Banner, Submenu, Badge } from '@shared/components';
import { formatDateTime } from '@shared/utils/format';
import { BANNER_TYPES } from '@shared/utils/constants';
import { PageContainer } from '@member/layouts';
import Card from '@shared/components/Card';
import Button from '@shared/components/Button';
import { DocumentIcon, DownloadIcon } from '@shared/components/Icons';
import { messagesService } from '@shared/services';

// 用户头像组件
function UserAvatar({ name, isAdmin = false, size = 'md' }) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base'
  };
  
  const initials = name ? name.charAt(0).toUpperCase() : '?';
  const bgColor = isAdmin ? 'bg-primary-500' : 'bg-gray-400';
  
  return (
    <div className={`${sizeClasses[size]} ${bgColor} rounded-full flex items-center justify-center text-white font-medium flex-shrink-0`}>
      {initials}
    </div>
  );
}

export default function InquiryDetail() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const [thread, setThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadThread = async () => {
      if (!id) {
        setError(t('support.inquiryIdMissing'));
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const response = await messagesService.getMemberThread(id);
        if (response) {
          setThread(response.thread);
          setMessages(response.messages || []);
        } else {
          setError(t('support.notFound'));
        }
      } catch (err) {
        // AOP 系统会自动记录错误
        setError(t('support.loadFailed'));
      } finally {
        setLoading(false);
      }
    };

    loadThread();
  }, [id, t]);

  // 滚动到底部
  useEffect(() => {
    if (messages.length > 0 && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleDownload = (attachment) => {
    const link = document.createElement('a');
    link.href = attachment.file_path || attachment.fileUrl;
    link.download = attachment.file_name || attachment.fileName || 'attachment';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReply = async () => {
    if (!replyContent.trim()) {
      return;
    }

    setSubmitting(true);
    try {
      const newMessage = await messagesService.createMemberThreadMessage(id, {
        content: replyContent,
        isImportant: false,
        attachments: []
      });
      setMessages(prev => [...prev, newMessage]);
      setReplyContent('');
    } catch (err) {
      // AOP 系统会自动记录错误
      alert(t('support.replyFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  // 格式化日期时间
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffInMs = now - date;
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const locale = i18n.language === 'zh' ? 'zh-CN' : 'ko-KR';
    
    if (diffInHours < 1) {
      return t('common.justNow');
    } else if (diffInHours < 24) {
      return t('common.hoursAgo', '{{hours}}小时前', { hours: diffInHours });
    } else if (diffInDays === 1) {
      return t('common.yesterday');
    } else if (diffInDays < 7) {
      return t('common.daysAgo', '{{days}}天前', { days: diffInDays });
    } else {
      return date.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  // 获取分类标签
  const getCategoryBadge = (category) => {
    if (!category) return null;
    const categoryMap = {
      support: { variant: 'info', label: t('support.category.support') },
      performance: { variant: 'warning', label: t('support.category.performance') },
      general: { variant: 'secondary', label: t('support.category.general') }
    };
    const config = categoryMap[category] || categoryMap.general;
    return <Badge variant={config.variant} size="sm">{config.label}</Badge>;
  };

  // 获取状态标签
  const getStatusBadge = (status) => {
    const statusMap = {
      open: { variant: 'success', label: t('support.status.open') },
      resolved: { variant: 'info', label: t('support.status.resolved') },
      closed: { variant: 'secondary', label: t('support.status.closed') }
    };
    const config = statusMap[status] || statusMap.open;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="support w-full max-w-full flex flex-col p-0 m-0 overflow-x-hidden relative">
      <Banner
        bannerType={BANNER_TYPES.SUPPORT}
        sectionClassName="member-banner-section"
      />
      <Submenu
        items={[
          {
            key: 'support-faq',
            path: '/member/support/faq',
            exact: true,
            label: t('support.faq')
          },
          {
            key: 'support-inquiry',
            path: '/member/support/inquiry',
            exact: true,
            label: t('support.inquiry')
          },
          {
            key: 'support-inquiry-history',
            path: '/member/support/inquiry-history',
            exact: true,
            label: t('support.inquiryHistory')
          }
        ]}
        className="support-submenu bg-white/95 shadow-md border-b border-gray-200/50 sticky top-0 z-10 backdrop-blur-md"
        headerSelector=".member-header"
      />
      <PageContainer>
        {loading ? (
          <Card>
            <div className="text-center py-12 px-4">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-base text-gray-500 m-0">{t('common.loading')}</p>
            </div>
          </Card>
        ) : error || !thread ? (
          <Card>
            <div className="text-center py-12 px-4">
              <p className="text-base text-gray-500 m-0">{error || t('support.notFound')}</p>
              <Button 
                variant="primary"
                onClick={() => navigate('/member/support/inquiry-history')}
                className="mt-4"
              >
                {t('common.back')}
              </Button>
            </div>
          </Card>
        ) : (
          <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
            {/* 头部信息 */}
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6 pb-3 border-b border-gray-200">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 m-0">
                  {thread.subject}
                </h1>
                <div className="flex items-center gap-2">
                  {getCategoryBadge(thread.category)}
                  {getStatusBadge(thread.status)}
                </div>
              </div>
            </div>

            {/* 消息展示 */}
            <div className="space-y-4 mb-6">
              {messages.length === 0 ? (
                <Card>
                  <div className="text-center py-12 px-4">
                    <p className="text-base text-gray-500 m-0">{t('support.noMessages')}</p>
                  </div>
                </Card>
              ) : (
                messages.map((msg, index) => {
                  const isMember = msg.senderType === 'member';
                  const senderName = isMember 
                    ? t('support.user')
                    : (msg.senderName || t('support.admin'));
                  
                  return (
                    <Card key={msg.id} className="border border-gray-200">
                      <div className="flex gap-4 p-4 sm:p-5 lg:p-6">
                        <div className="flex-shrink-0">
                          <UserAvatar 
                            name={senderName} 
                            isAdmin={!isMember}
                            size="md"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-semibold text-gray-900">
                              {senderName}
                            </span>
                            {!isMember && (
                              <span className="text-xs text-gray-500">
                                ({t('support.admin')})
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mb-2">
                            {msg.content}
                          </div>
                          <time className="text-xs text-gray-500">
                            {msg.createdAt ? formatDateTime(msg.createdAt) : ''}
                          </time>
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <div className="space-y-2">
                                {msg.attachments.map((attachment, attIndex) => (
                                  <div
                                    key={attIndex}
                                    className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200"
                                  >
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      <DocumentIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                      <span className="text-sm text-gray-900 truncate">
                                        {attachment.file_name || attachment.fileName || t('support.attachmentNumber', { number: attIndex + 1 })}
                                      </span>
                                    </div>
                                    <button
                                      onClick={() => handleDownload(attachment)}
                                      className="ml-2 flex items-center gap-1 px-2 py-1 text-xs text-primary-600 hover:text-primary-800 hover:bg-primary-50 rounded"
                                    >
                                      <DownloadIcon className="w-3.5 h-3.5" />
                                      {t('common.download')}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* 回复表单 */}
            {thread.status === 'open' && (
              <Card className="mb-6">
                <div className="space-y-4 p-4 sm:p-5 lg:p-6">
                  <h3 className="text-base font-semibold text-gray-900">
                    {t('support.reply')}
                  </h3>
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder={t('support.replyPlaceholder')}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm text-gray-900 placeholder-gray-400"
                    rows={6}
                  />
                  <div className="flex items-center justify-end gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setReplyContent('');
                      }}
                      disabled={submitting}
                    >
                      {t('common.cancel')}
                    </Button>
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
              </Card>
            )}
          </div>
        )}
      </PageContainer>
    </div>
  );
}

