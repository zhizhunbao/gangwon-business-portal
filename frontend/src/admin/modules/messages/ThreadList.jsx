/**
 * Thread List Component - Admin Portal
 * 1对1咨询列表 - 左右分栏布局
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Card, Button, Badge, Alert, Pagination, Modal, ModalFooter, FileUploadButton } from '@shared/components';
import { messagesService } from '@shared/services';
import { formatDateTime } from '@shared/utils';
import { useUpload } from '@shared/hooks';

export default function ThreadList() {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const messagesEndRef = useRef(null);
  
  const [loading, setLoading] = useState(false);
  const [threads, setThreads] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [filter, setFilter] = useState('all');
  const [message, setMessage] = useState(null);
  const [messageVariant, setMessageVariant] = useState('success');
  
  const [selectedThread, setSelectedThread] = useState(null);
  const [threadMessages, setThreadMessages] = useState([]);
  const [loadingThread, setLoadingThread] = useState(false);
  
  const [replyContent, setReplyContent] = useState('');
  const [replyAttachments, setReplyAttachments] = useState([]);
  const [sending, setSending] = useState(false);
  const [closeConfirm, setCloseConfirm] = useState({ open: false, threadId: null });

  // 使用统一的上传 hook
  const { uploading, uploadAttachments } = useUpload();

  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'end' });
    }
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

  const loadThreads = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    const params = {
      page: currentPage,
      pageSize: pageSize,
      status: filter === 'all' ? undefined : filter,
    };
    const response = await messagesService.getAdminThreads(params);
    setThreads(response.items || []);
    setTotalCount(response.total || 0);
    setLoading(false);
  }, [currentPage, filter, pageSize]);

  const loadThreadDetail = useCallback(async (threadId) => {
    setLoadingThread(true);
    const response = await messagesService.getThread(threadId);
    setSelectedThread(response.thread);
    setThreadMessages(response.messages || []);
    setLoadingThread(false);
    setThreads(prev => prev.map(t => 
      t.id === threadId ? { ...t, adminUnreadCount: 0 } : t
    ));
  }, []);

  const shouldScrollRef = useRef(false);
  
  useEffect(() => { loadThreads(); }, [loadThreads]);
  
  // 只在发送新消息后滚动到底部
  useEffect(() => {
    if (shouldScrollRef.current && threadMessages.length > 0) {
      scrollToBottom(true);
      shouldScrollRef.current = false;
    }
  }, [threadMessages]);


  useEffect(() => {
    const threadId = searchParams.get('threadId');
    if (threadId) {
      loadThreadDetail(threadId);
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('threadId');
      setSearchParams(newSearchParams, { replace: true });
    }
  }, [searchParams]);

  const handleThreadClick = (thread) => loadThreadDetail(thread.id);

  const handleSendReply = async () => {
    if (!replyContent.trim() || !selectedThread) return;
    setSending(true);
    try {
      // 转换附件格式
      const attachments = replyAttachments.map(att => ({
        fileName: att.originalName || att.name || att.fileName,
        fileUrl: att.fileUrl || att.url,
        fileSize: att.fileSize || att.size || 0,
        mimeType: att.mimeType || 'application/octet-stream'
      }));

      const newMessage = await messagesService.createThreadMessage(selectedThread.id, { 
        content: replyContent.trim(),
        attachments 
      });
      shouldScrollRef.current = true; // 标记需要滚动
      setThreadMessages(prev => [...prev, newMessage]);
      setReplyContent('');
      setReplyAttachments([]);
    } catch {
      setMessageVariant('error');
      setMessage(t('common.error'));
      setTimeout(() => setMessage(null), 3000);
    }
    setSending(false);
  };

  const handleCloseThread = () => selectedThread && setCloseConfirm({ open: true, threadId: selectedThread.id });

  const confirmCloseThread = async () => {
    const { threadId } = closeConfirm;
    await messagesService.updateThread(threadId, { status: 'closed' });
    setSelectedThread(prev => prev ? { ...prev, status: 'closed' } : null);
    setThreads(prev => prev.map(t => t.id === threadId ? { ...t, status: 'closed' } : t));
    setCloseConfirm({ open: false, threadId: null });
    setMessageVariant('success');
    setMessage(t('admin.messages.thread.closed'));
    setTimeout(() => setMessage(null), 3000);
  };

  const handleReopenThread = async () => {
    if (!selectedThread) return;
    await messagesService.updateThread(selectedThread.id, { status: 'open' });
    setSelectedThread(prev => prev ? { ...prev, status: 'open' } : null);
    setThreads(prev => prev.map(t => t.id === selectedThread.id ? { ...t, status: 'open' } : t));
    setMessageVariant('success');
    setMessage(t('admin.messages.thread.reopened'));
    setTimeout(() => setMessage(null), 3000);
  };

  const getStatusBadge = (status) => {
    const map = {
      open: { variant: 'success', label: t('admin.messages.thread.status.open') },
      resolved: { variant: 'info', label: t('admin.messages.thread.status.resolved') },
      closed: { variant: 'secondary', label: t('admin.messages.thread.status.closed') }
    };
    const c = map[status] || map.open;
    return <Badge variant={c.variant} size="sm">{c.label}</Badge>;
  };

  const getCategoryBadge = (category) => {
    const map = {
      support: { variant: 'info', label: t('admin.messages.category.support') },
      performance: { variant: 'warning', label: t('admin.messages.category.performance') },
      general: { variant: 'secondary', label: t('admin.messages.category.general') }
    };
    const c = map[category] || map.general;
    return <Badge variant={c.variant} size="sm">{c.label}</Badge>;
  };

  const formatDate = (d) => d ? formatDateTime(d, 'MM-dd HH:mm', i18n.language) : '';
  const totalUnread = threads.reduce((sum, t) => sum + (t.adminUnreadCount || 0), 0);


  return (
    <div className="w-full">
      {message && <Alert variant={messageVariant} className="mb-2">{message}</Alert>}

      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {['all', 'open', 'resolved', 'closed'].map(key => (
            <Button
              key={key}
              variant={filter === key ? 'primary' : 'outline'}
              size="sm"
              onClick={() => { setFilter(key); setCurrentPage(1); }}
            >
              {key === 'all' ? t('admin.messages.filters.all') : t(`admin.messages.thread.status.${key}`)}
            </Button>
          ))}
        </div>
        {totalUnread > 0 && (
          <Badge variant="error" size="sm">
            {t('admin.messages.unreadCount')}: {totalUnread}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left panel - Thread list */}
        <div className="lg:col-span-1">
          <Card className="h-[calc(100vh-300px)] min-h-[350px] flex flex-col shadow-sm">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-sm font-medium text-gray-700 m-0">
                {t('admin.messages.threads.title')} ({totalCount})
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : threads.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                  <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <span className="text-sm">{t('admin.messages.threads.empty')}</span>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {threads.map((thread) => (
                    <li
                      key={thread.id}
                      className={`p-3 cursor-pointer transition-all hover:bg-blue-50/50 ${
                        selectedThread?.id === thread.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'
                      } ${thread.adminUnreadCount > 0 ? 'bg-amber-50/30' : ''}`}
                      onClick={() => handleThreadClick(thread)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0 ${
                          thread.adminUnreadCount > 0 ? 'bg-blue-500' : 'bg-gray-400'
                        }`}>
                          {(thread.memberName || '会')[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-sm truncate ${thread.adminUnreadCount > 0 ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                              {thread.subject}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="truncate">{thread.memberName}</span>
                            <span>·</span>
                            <span>{formatDate(thread.lastMessageAt || thread.createdAt)}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1.5">
                            {getStatusBadge(thread.status)}
                            {thread.adminUnreadCount > 0 && (
                              <Badge variant="error" size="sm">{thread.adminUnreadCount}</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {totalCount > pageSize && (
              <div className="border-t border-gray-100 p-3 bg-gray-50/30">
                <Pagination current={currentPage} total={totalCount} pageSize={pageSize} onChange={setCurrentPage} size="sm" />
              </div>
            )}
          </Card>
        </div>


        {/* Right panel - Thread detail */}
        <div className="lg:col-span-2">
          <Card className="h-[calc(100vh-300px)] min-h-[350px] flex flex-col shadow-sm">
            {loadingThread ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : selectedThread ? (
              <>
                {/* Header */}
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-base font-semibold text-gray-900 m-0 truncate">{selectedThread.subject}</h3>
                        {getCategoryBadge(selectedThread.category)}
                        {getStatusBadge(selectedThread.status)}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-3 flex-wrap">
                        <span>{selectedThread.memberName}</span>
                        <span>{formatDate(selectedThread.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {selectedThread.status === 'open' ? (
                        <Button variant="outline" size="sm" onClick={handleCloseThread}>{t('admin.messages.thread.close')}</Button>
                      ) : (
                        <Button variant="outline" size="sm" onClick={handleReopenThread}>{t('admin.messages.thread.reopen')}</Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-gray-50/50 to-white">
                  {threadMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                      <svg className="w-16 h-16 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span>{t('admin.messages.thread.noMessages')}</span>
                    </div>
                  ) : (
                    threadMessages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.senderType === 'admin' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex items-end gap-2 max-w-[75%] ${msg.senderType === 'admin' ? 'flex-row-reverse' : ''}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0 ${
                            msg.senderType === 'admin' ? 'bg-blue-500' : 'bg-gray-500'
                          }`}>
                            {msg.senderType === 'admin' ? t('admin.messages.avatar.admin') : (selectedThread.memberName || t('admin.messages.avatar.member'))[0]}
                          </div>
                          <div className={`px-4 py-2.5 rounded-2xl shadow-sm ${
                            msg.senderType === 'admin'
                              ? 'bg-blue-500 text-white rounded-br-md'
                              : 'bg-white text-gray-800 border border-gray-100 rounded-bl-md'
                          }`}>
                            <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</div>
                            <div className={`text-xs mt-1.5 ${msg.senderType === 'admin' ? 'text-blue-100' : 'text-gray-400'}`}>
                              {formatDate(msg.createdAt)}
                            </div>
                            {msg.attachments?.length > 0 && (
                              <div className={`mt-2 pt-2 border-t ${msg.senderType === 'admin' ? 'border-blue-400/50' : 'border-gray-100'} space-y-2`}>
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
                                          className="max-w-[200px] max-h-[150px] rounded border border-gray-200 object-cover hover:opacity-90 transition-opacity"
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
                                        msg.senderType === 'admin' ? 'text-blue-100 hover:text-white' : 'text-blue-600 hover:text-blue-800'
                                      }`}
                                      onClick={(e) => {
                                        if (!fileUrl) {
                                          e.preventDefault();
                                        }
                                      }}
                                    >
                                      <span>📎</span>
                                      <span className="truncate max-w-[200px]">{fileName}</span>
                                      {att.fileSize && <span className="text-[10px] opacity-70">({(att.fileSize / 1024).toFixed(0)}KB)</span>}
                                    </a>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Reply input */}
                {selectedThread.status === 'open' ? (
                  <div className="p-3 border-t border-gray-100 bg-white">
                    <textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder={t('admin.messages.composer.contentPlaceholder')}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-sm"
                      rows={2}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }}
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
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                          disabled={replyAttachments.length >= 3}
                          loading={uploading}
                          variant="text"
                          size="small"
                        />
                        <span className="text-xs text-gray-400">({replyAttachments.length}/3)</span>
                      </div>
                      <Button variant="primary" onClick={handleSendReply} disabled={!replyContent.trim() || sending} className="px-4 py-2 rounded-lg">
                        {sending ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '发送'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 border-t border-gray-100 bg-gray-50 text-center text-sm text-gray-500">
                    {t('admin.messages.thread.status.closed')}
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                <svg className="w-20 h-20 mb-4 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-sm">{t('admin.messages.selectMessage')}</p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Close Confirmation Modal */}
      <Modal isOpen={closeConfirm.open} onClose={() => setCloseConfirm({ open: false, threadId: null })} title={t('admin.messages.thread.confirmClose')} size="sm">
        <div className="py-4"><p className="text-gray-600">{t('admin.messages.thread.closeWarning')}</p></div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setCloseConfirm({ open: false, threadId: null })}>{t('common.cancel')}</Button>
          <Button variant="primary" onClick={confirmCloseThread}>{t('admin.messages.thread.close')}</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
