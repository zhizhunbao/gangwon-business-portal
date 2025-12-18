/**
 * Message Composer Component - Admin Portal
 * 富文本消息编辑器 - 支持文件附件和格式化内容
 */

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Button, Input, RichTextEditor, Alert } from '@shared/components';
import { uploadService } from '@shared/services';

export default function MessageComposer({ 
  threadId, 
  recipientName, 
  onSend, 
  onCancel,
  initialSubject = '',
  isNewThread = false 
}) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    subject: initialSubject,
    content: '',
    isImportant: false,
    category: 'general'
  });
  const [attachments, setAttachments] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [messageVariant, setMessageVariant] = useState('success');

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

  const handleFileUpload = useCallback(async (files) => {
    if (!files || files.length === 0) return;
    if (attachments.length + files.length > 3) return;

    setUploadingFiles(prev => [...prev, ...Array.from(files)]);
    
    const uploadPromises = Array.from(files).map(async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'message');
      
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
    
    if (isNewThread && !formData.subject?.trim()) {
      newErrors.subject = t('validation.required', { field: t('admin.messages.composer.subject') });
    }
    
    if (!formData.content?.trim()) {
      newErrors.content = t('validation.required', { field: t('admin.messages.composer.content') });
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    const messageData = {
      ...formData,
      attachments: attachments.map(att => ({
        fileName: att.fileName,
        filePath: att.filePath,
        fileSize: att.fileSize,
        mimeType: att.mimeType
      }))
    };
    
    await onSend(messageData);
    setLoading(false);
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
    { value: 'support', label: t('admin.messages.category.support') },
    { value: 'performance', label: t('admin.messages.category.performance') }
  ];

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      title={isNewThread 
        ? t('admin.messages.composer.newMessage') 
        : t('admin.messages.composer.reply')
      }
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {message && (
          <Alert variant={messageVariant}>
            {message}
          </Alert>
        )}

        {/* Recipient Info */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm">
            <span className="font-medium text-gray-700">
              {t('admin.messages.composer.recipient')}:
            </span>
            <span className="ml-2 text-gray-900">{recipientName}</span>
          </div>
        </div>

        {/* Subject (only for new threads) */}
        {isNewThread && (
          <Input
            label={t('admin.messages.composer.subject')}
            value={formData.subject}
            onChange={handleFieldChange('subject')}
            required
            error={errors.subject}
            placeholder={t('admin.messages.composer.subjectPlaceholder')}
            maxLength={255}
          />
        )}

        {/* Category (only for new threads) */}
        {isNewThread && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('admin.messages.composer.category')}
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
        )}

        {/* Content */}
        <RichTextEditor
          label={t('admin.messages.composer.content')}
          value={formData.content}
          onChange={handleFieldChange('content')}
          required
          error={errors.content}
          placeholder={t('admin.messages.composer.contentPlaceholder')}
          height="200px"
        />

        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('admin.messages.composer.attachments')} 
            <span className="text-gray-500 text-xs ml-1">
              ({t('admin.messages.composer.maxFiles')})
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
              disabled={attachments.length >= 3 || uploadingFiles.length > 0}
            />
            <label
              htmlFor="file-upload"
              className={`cursor-pointer ${
                attachments.length >= 3 ? 'cursor-not-allowed opacity-50' : ''
              }`}
            >
              <div className="text-gray-600">
                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p className="mt-2 text-sm">
                  {uploadingFiles.length > 0
                    ? t('admin.messages.composer.uploading')
                    : t('admin.messages.composer.clickToUpload')
                  }
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {t('admin.messages.composer.supportedFormats')}
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

        {/* Important Flag */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="isImportant"
            checked={formData.isImportant}
            onChange={handleFieldChange('isImportant')}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="isImportant" className="text-sm text-gray-700 cursor-pointer">
            {t('admin.messages.composer.markAsImportant')}
          </label>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
          >
            {t('admin.messages.composer.send')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}