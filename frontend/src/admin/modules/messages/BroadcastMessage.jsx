/**
 * Broadcast Message Component - Admin Portal
 * 群发消息功能 - 向所有会员或特定群体发送消息
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Button, Input, RichTextEditor, Alert, Checkbox } from '@shared/components';
import { messagesService, adminService, uploadService } from '@shared/services';

export default function BroadcastMessage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState([]);
  const [formData, setFormData] = useState({
    subject: '',
    content: '',
    isImportant: false,
    category: 'general',
    sendToAll: true,
    selectedMembers: []
  });
  const [attachments, setAttachments] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [messageVariant, setMessageVariant] = useState('success');

  const loadMembers = useCallback(async () => {
    setLoading(true);
    const response = await adminService.listMembers({ page: 1, pageSize: 100 });
    setMembers(response.members || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const handleFieldChange = (field) => (event) => {
    const value = event?.target?.value !== undefined ? event.target.value : event;
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleMemberSelection = (memberId, checked) => {
    setFormData(prev => ({
      ...prev,
      selectedMembers: checked
        ? [...prev.selectedMembers, memberId]
        : prev.selectedMembers.filter(id => id !== memberId)
    }));
  };

  const handleSelectAll = (checked) => {
    setFormData(prev => ({
      ...prev,
      selectedMembers: checked ? members.map(m => m.id) : []
    }));
  };

  const handleFileUpload = useCallback(async (files) => {
    if (!files || files.length === 0) return;
    if (attachments.length + files.length > 5) return;

    setUploadingFiles(prev => [...prev, ...Array.from(files)]);
    
    const uploadPromises = Array.from(files).map(async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'broadcast');
      
      const response = await uploadService.uploadFile(formData);
      return {
        id: response.id,
        fileName: file.name,
        fileSize: file.size,
        filePath: response.filePath,
        mimeType: file.type
      };
    });

    const uploadedFiles = await Promise.all(uploadPromises);
    setAttachments(prev => [...prev, ...uploadedFiles]);
    setUploadingFiles([]);
  }, [attachments.length]);

  const handleRemoveAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.subject?.trim()) {
      newErrors.subject = t('validation.required', { field: t('admin.messages.broadcast.subject') });
    }
    
    if (!formData.content?.trim()) {
      newErrors.content = t('validation.required', { field: t('admin.messages.broadcast.content') });
    }
    
    if (!formData.sendToAll && formData.selectedMembers.length === 0) {
      newErrors.selectedMembers = t('admin.messages.broadcast.noRecipients');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!validateForm()) return;

    setSaving(true);
    
    const broadcastData = {
      subject: formData.subject,
      content: formData.content,
      isImportant: formData.isImportant,
      category: formData.category,
      sendToAll: formData.sendToAll,
      recipientIds: formData.sendToAll ? [] : formData.selectedMembers,
      attachments: attachments.map(att => ({
        fileName: att.fileName,
        filePath: att.filePath,
        fileSize: att.fileSize,
        mimeType: att.mimeType
      }))
    };
    
    await messagesService.createBroadcast(broadcastData);
    
    setMessageVariant('success');
    setMessage(t('admin.messages.broadcast.sent'));
    
    // Reset form
    setFormData({
      subject: '',
      content: '',
      isImportant: false,
      category: 'general',
      sendToAll: true,
      selectedMembers: []
    });
    setAttachments([]);
    
    setTimeout(() => setMessage(null), 3000);
    setSaving(false);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return `0 ${t('common.fileSize.bytes', 'Bytes')}`;
    const k = 1024;
    const sizes = [
      t('common.fileSize.bytes', 'Bytes'),
      t('common.fileSize.kb', 'KB'),
      t('common.fileSize.mb', 'MB'),
      t('common.fileSize.gb', 'GB')
    ];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const categoryOptions = [
    { value: 'general', label: t('admin.messages.category.general') },
    { value: 'announcement', label: t('admin.messages.category.announcement') },
    { value: 'system', label: t('admin.messages.category.system') }
  ];

  const recipientCount = formData.sendToAll ? members.length : formData.selectedMembers.length;

  return (
    <div className="w-full">
      {message && (
        <Alert variant={messageVariant} className="mb-4">
          {message}
        </Alert>
      )}

      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900 m-0 mb-1">
          {t('admin.messages.broadcast.title')}
        </h2>
        <p className="text-gray-600 text-sm m-0">
          {t('admin.messages.broadcast.description')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Message Form */}
        <div className="lg:col-span-2">
          <Card>
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                label={t('admin.messages.broadcast.subject')}
                value={formData.subject}
                onChange={handleFieldChange('subject')}
                required
                error={errors.subject}
                placeholder={t('admin.messages.broadcast.subjectPlaceholder')}
                maxLength={255}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('admin.messages.broadcast.category')}
                </label>
                <select
                  value={formData.category}
                  onChange={handleFieldChange('category')}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  {categoryOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <RichTextEditor
                label={t('admin.messages.broadcast.content')}
                value={formData.content}
                onChange={handleFieldChange('content')}
                required
                error={errors.content}
                placeholder={t('admin.messages.broadcast.contentPlaceholder')}
                height="300px"
              />

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('admin.messages.broadcast.attachments')} 
                  <span className="text-gray-500 text-xs ml-1">
                    ({t('admin.messages.broadcast.maxFiles')})
                  </span>
                </label>
                
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
                    onChange={(e) => handleFileUpload(e.target.files)}
                    className="hidden"
                    id="file-upload"
                    disabled={attachments.length >= 5 || uploadingFiles.length > 0}
                  />
                  <label
                    htmlFor="file-upload"
                    className={`cursor-pointer ${
                      attachments.length >= 5 ? 'cursor-not-allowed opacity-50' : ''
                    }`}
                  >
                    <div className="text-gray-600">
                      <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <p className="mt-2 text-sm">
                        {uploadingFiles.length > 0
                          ? t('admin.messages.broadcast.uploading')
                          : t('admin.messages.broadcast.clickToUpload')
                        }
                      </p>
                    </div>
                  </label>
                </div>

                {/* Attachment List */}
                {attachments.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {attachments.map((attachment, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {attachment.fileName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(attachment.fileSize)}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(index)}
                          className="flex-shrink-0 ml-4 text-red-600 hover:text-red-800"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isImportant"
                  checked={formData.isImportant}
                  onChange={handleFieldChange('isImportant')}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="isImportant" className="text-sm text-gray-700 cursor-pointer">
                  {t('admin.messages.broadcast.markAsImportant')}
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setFormData({
                      subject: '',
                      content: '',
                      isImportant: false,
                      category: 'general',
                      sendToAll: true,
                      selectedMembers: []
                    });
                    setAttachments([]);
                    setErrors({});
                    setMessage(null);
                  }}
                >
                  {t('common.reset')}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={saving}
                  disabled={recipientCount === 0}
                >
                  {t('admin.messages.broadcast.send', { count: recipientCount })}
                </Button>
              </div>
            </form>
            </div>
          </Card>
        </div>

        {/* Recipients */}
        <div className="lg:col-span-1">
          <Card>
            <div className="p-6 space-y-4">
              <h3 className="text-lg font-medium text-gray-900">
                {t('admin.messages.broadcast.recipients')}
              </h3>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="sendToAll"
                    name="recipientType"
                    checked={formData.sendToAll}
                    onChange={() => setFormData(prev => ({ ...prev, sendToAll: true }))}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <label htmlFor="sendToAll" className="text-sm text-gray-700 cursor-pointer">
                    {t('admin.messages.broadcast.sendToAll')} ({members.length})
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="sendToSelected"
                    name="recipientType"
                    checked={!formData.sendToAll}
                    onChange={() => setFormData(prev => ({ ...prev, sendToAll: false }))}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <label htmlFor="sendToSelected" className="text-sm text-gray-700 cursor-pointer">
                    {t('admin.messages.broadcast.sendToSelected')}
                  </label>
                </div>
              </div>

              {!formData.sendToAll && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">
                      {t('admin.messages.broadcast.selectedCount', { count: formData.selectedMembers.length })}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleSelectAll(formData.selectedMembers.length !== members.length)}
                    >
                      {formData.selectedMembers.length === members.length 
                        ? t('admin.messages.broadcast.deselectAll')
                        : t('admin.messages.broadcast.selectAll')
                      }
                    </Button>
                  </div>

                  {errors.selectedMembers && (
                    <p className="text-sm text-red-600">{errors.selectedMembers}</p>
                  )}

                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {loading ? (
                      <div className="text-center text-gray-500 py-4">
                        {t('common.loading')}
                      </div>
                    ) : (
                      members.map(member => (
                        <Checkbox
                          key={member.id}
                          checked={formData.selectedMembers.includes(member.id)}
                          onChange={(checked) => handleMemberSelection(member.id, checked)}
                          label={member.companyName}
                          description={member.email}
                        />
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}