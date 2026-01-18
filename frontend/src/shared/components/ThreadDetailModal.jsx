/**
 * Thread Detail Modal Component
 * 消息详情模态框 - 可复用组件（精简版）
 */

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, FileUploadButton } from '@shared/components';
import Button from '@shared/components/Button';
import { messagesService } from '@shared/services';
import { formatDateTime } from '@shared/utils';
import { useUpload } from '@shared/hooks';

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
  const [replyAttachments, setReplyAttachments] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const messagesEndRef = useRef(null);

  // 使用统一的上传 hook
  const { uploading, uploadAttachments } = useUpload();

  useEffect(() => {
    if (isOpen && threadId) {
      loadThreadDetail();
    }
  }, [isOpen, threadId]);

  const loadThreadDetail = async () => {
    setLoading(true);
    setReplyContent('');
    setReplyAttachments([]);
    try {
      const response = await messagesService.getMemberThread(threadId);
      
      if (response) {
        setThreadData(response);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch (err) {
      console.error('Failed to load thread detail:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setThreadData(null);
    setReplyContent('');
    setReplyAttachments([]);
    onClose();
  };

  const handleFileSelect = async (files) => {
    if (files.length === 0) return;
    
    const remainingSlots = 3 - replyAttachments.length;
    if (remainingSlots <= 0) return;
    
    const filesToUpload = files.slice(0, remainingSlots);
    try {
      const uploaded = await uploadAttachments(filesToUpload);
      if (uploaded) {
        setReplyAttachments(prev => [...prev, ...uploaded]);
      }
    } catch (err) {
      // 上传失败
    }
  };

  const handleRemoveAttachment = (index) => {
    setReplyAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleReply = async () => {
    if (!threadId || !replyContent.trim()) return;

    setSubmitting(true);
    try {
      // 转换附件格式 - 使用驼峰命名
      const attachments = replyAttachments.map(att => ({
        fileName: att.fileName || att.name || '',
        fileUrl: att.fileUrl || att.url || '',
        fileSize: att.fileSize || att.size || 0,
        mimeType: att.mimeType || att.type || 'application/octet-stream'
      }));

      const newMessage = await messagesService.createMemberThreadMessage(threadId, {
        content: replyContent,
        isImportant: false,
        attachments
      });
      setThreadData(prev => ({
        ...prev,
        messages: [...(prev.messages || []), newMessage]
      }));
      setReplyContent('');
      setReplyAttachments([]);
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
      size="lg"
    >
      {loading ? (
        <div className="py-12 text-center">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">{t('common.loading')}</p>
        </div>
      ) : threadData ? (
        <div className="flex flex-col h-[60vh]">
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
                        {msg.attachments?.length > 0 && (
                          <div className={`mt-2 pt-2 border-t ${isMember ? 'border-primary-400/50' : 'border-gray-200'} space-y-2`}>
                            {msg.attachments.map((att, idx) => {
                              // 处理文件 URL
                              const getFileUrl = (fileUrl) => {
                                if (!fileUrl) return '';
                                if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
                                  return fileUrl;
                                }
                                if (fileUrl.startsWith('private-files/')) {
                                  return '';
                                }
                                if (fileUrl.startsWith('public-files/')) {
                                  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                                  return `${supabaseUrl}/storage/v1/object/public/${fileUrl}`;
                                }
                                return fileUrl;
                              };
                              
                              const fileUrl = getFileUrl(att.fileUrl);
                              const fileName = att.fileName || '';
                              const isImage = att.mimeType?.startsWith('image/') || 
                                /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
                              
                              if (isImage) {
                                return (
                                  <a 
                                    key={idx} 
                                    href={fileUrl || '#'} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="block"
                                    onClick={(e) => {
                                      if (!fileUrl) {
                                        e.preventDefault();
                                      }
                                    }}
                                  >
                                    <img 
                                      src={fileUrl} 
                                      alt={fileName}
                                      className="max-w-[200px] max-h-[150px] rounded border border-gray-200 object-cover hover:opacity-90 transition-opacity cursor-pointer"
                                    />
                                  </a>
                                );
                              }
                              
                              return (
                                <a 
                                  key={idx} 
                                  href={fileUrl || '#'} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  download={fileName}
                                  className={`flex items-center gap-1 text-xs hover:underline ${
                                    isMember ? 'text-primary-100 hover:text-white' : 'text-blue-600 hover:text-blue-800'
                                  }`}
                                  onClick={(e) => {
                                    if (!fileUrl) {
                                      e.preventDefault();
                                    }
                                  }}
                                >
                                  <span>📎</span>
                                  <span className="truncate max-w-[180px]">{fileName}</span>
                                  {att.fileSize && <span className="text-[10px] opacity-70">({(att.fileSize / 1024).toFixed(0)}KB)</span>}
                                </a>
                              );
                            })}
                          </div>
                        )}
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
              
              {/* 已上传的附件 */}
              {replyAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {replyAttachments.map((att, idx) => (
                    <div key={idx} className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs">
                      <span className="truncate max-w-[120px]">{att.originalName || att.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(idx)}
                        className="text-gray-400 hover:text-red-500 ml-1"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex justify-between items-center mt-2">
                <div className="flex items-center gap-2">
                  <FileUploadButton
                    onFilesSelected={handleFileSelect}
                    multiple
                    accept=".jpg,.jpeg,.png,.gif,.webp,image/*"
                    disabled={replyAttachments.length >= 3}
                    loading={uploading}
                    variant="text"
                    size="small"
                  />
                  <span className="text-xs text-gray-400">({replyAttachments.length}/3)</span>
                </div>
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
