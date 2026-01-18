/**
 * Inquiry Form Component - Member Portal
 * 1:1咨询表单组件（标题、内容、附件最多3个）
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Card, { CardBody } from '@shared/components/Card';
import Button from '@shared/components/Button';
import { Alert, FileUploadButton } from '@shared/components';
import Input from '@shared/components/Input';
import Select from '@shared/components/Select';
import Textarea from '@shared/components/Textarea';
import { messagesService } from '@shared/services';
import { TrashIcon, DocumentIcon } from '@shared/components/Icons';
import { useUpload } from '@shared/hooks';

const MAX_ATTACHMENTS = 3;

// 咨询分类选项（将在组件内使用翻译）
const INQUIRY_CATEGORY_OPTIONS = [
  { value: 'general' },
  { value: 'support' },
  { value: 'performance' }
];

export default function InquiryForm({ onSubmitSuccess }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    category: 'general',
    subject: '',
    content: '',
    attachments: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // 使用统一的上传 hook
  const { uploading: isUploading, uploadAttachments } = useUpload({
    onError: (err) => setError(err.message || t('common.uploadFailed'))
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  // 处理文件上传
  const handleFilesSelected = async (files) => {
    if (files.length === 0) return;

    const remainingSlots = MAX_ATTACHMENTS - formData.attachments.length;
    if (remainingSlots <= 0) {
      setError(t('support.maxAttachmentsReached', { max: MAX_ATTACHMENTS }));
      return;
    }

    const filesToUpload = files.slice(0, remainingSlots);
    setError(null);

    const uploadedFiles = await uploadAttachments(filesToUpload);
    if (uploadedFiles) {
      setFormData(prev => ({
        ...prev,
        attachments: [...prev.attachments, ...uploadedFiles]
      }));
    }
  };

  // 删除附件
  const handleRemoveAttachment = (index) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  // 格式化文件大小
  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.subject || !formData.content) {
      setError(t('support.fillAllFields'));
      return;
    }

    setIsSubmitting(true);
    setError(null);
    
    try {
      // 转换附件格式为 Threads 格式
      // Threads API 期望: { fileName, fileUrl, fileSize, mimeType }
      const threadAttachments = formData.attachments.map(att => {
        const fileUrl = att.fileUrl || att.url;
        const fileName = att.originalName || att.name || att.fileName || 'attachment';
        const fileSize = att.fileSize || att.size || 0;
        
        // 从文件名推断 MIME 类型
        let mimeType = att.mimeType || 'application/octet-stream';
        if (!mimeType || mimeType === 'application/octet-stream') {
          const ext = fileName.split('.').pop()?.toLowerCase();
          const mimeMap = {
            'pdf': 'application/pdf',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xls': 'application/vnd.ms-excel',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif'
          };
          mimeType = mimeMap[ext] || 'application/octet-stream';
        }
        
        return {
          fileName,
          fileUrl,
          fileSize,
          mimeType
        };
      });

      const thread = await messagesService.createThread({
        category: formData.category,
        subject: formData.subject,
        content: formData.content,
        attachments: threadAttachments
      });

      setSuccess(t('support.submitSuccess'));
      setFormData({
        category: 'general',
        subject: '',
        content: '',
        attachments: []
      });
      
      if (onSubmitSuccess) {
        // 跳转到咨询历史页面
        onSubmitSuccess();
      }
    } catch (err) {
      // AOP 系统会自动记录错误
      setError(t('support.submitFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 分类选项（带翻译）
  const categoryOptions = INQUIRY_CATEGORY_OPTIONS.map(opt => ({
    value: opt.value,
    label: t(`support.category.${opt.value}`, opt.label)
  }));

  return (
    <div className="w-full">
      {/* 页面标题 */}
      <div className="mb-6 sm:mb-8 lg:mb-10 min-h-[48px] flex items-center">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 m-0">
          {t('support.newInquiry')}
        </h1>
      </div>

      <Card>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
            {success && (
              <Alert variant="success" onClose={() => setSuccess(null)}>
                {success}
              </Alert>
            )}

            {/* 咨询分类 */}
            <Select
              label={t('support.categoryLabel')}
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value)}
              options={categoryOptions}
              required
            />

            {/* 咨询标题 */}
            <Input
              label={t('support.subjectLabel')}
              value={formData.subject}
              onChange={(e) => handleChange('subject', e.target.value)}
              placeholder={t('support.subjectPlaceholder')}
              required
            />

            {/* 咨询内容 */}
            <Textarea
              label={t('support.contentLabel')}
              value={formData.content}
              onChange={(e) => handleChange('content', e.target.value)}
              rows={8}
              placeholder={t('support.contentPlaceholder')}
              required
            />

            {/* 附件上传 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('support.attachments')} 
                <span className="font-normal text-gray-500 ml-2">
                  ({formData.attachments.length}/{MAX_ATTACHMENTS})
                </span>
              </label>
              
              {/* 已上传的附件列表 */}
              {formData.attachments.length > 0 && (
                <div className="space-y-2 mb-3">
                  {formData.attachments.map((att, index) => (
                    <div 
                      key={index} 
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <DocumentIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-700 truncate">
                            {att.originalName || att.name}
                          </p>
                          {(att.fileSize || att.size) && (
                            <p className="text-xs text-gray-500">
                              {formatFileSize(att.fileSize || att.size)}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(index)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* 上传按钮 */}
              {formData.attachments.length < MAX_ATTACHMENTS && (
                <div>
                  <FileUploadButton
                    onFilesSelected={handleFilesSelected}
                    multiple
                    loading={isUploading}
                    label={t('support.addAttachment')}
                    loadingLabel={t('common.uploading')}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    {t('support.attachmentHint')}
                  </p>
                </div>
              )}
            </div>

            {/* 提交按钮 */}
            <div className="pt-4">
              <Button
                type="submit"
                disabled={isSubmitting || !formData.subject || !formData.content}
              >
                {isSubmitting ? t('common.submitting') : t('common.submit')}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}

