/**
 * Project Application Modal - Member Portal
 * 项目申请弹窗
 */

import './Projects.css';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Modal, ModalFooter } from '@shared/components/Modal';
import Button from '@shared/components/Button';
import Input from '@shared/components/Input';
import Textarea from '@shared/components/Textarea';
import { apiService } from '@shared/services';
import { API_PREFIX, MAX_FILE_SIZE, RESOURCE_TYPES } from '@shared/utils/constants';
import { WarningIcon, PaperclipIcon, DocumentIcon, XIcon } from '@shared/components/Icons';

export default function ProjectApplicationModal({ isOpen, onClose, projectId, onSuccess }) {
  const { t } = useTranslation();
  
  const [formData, setFormData] = useState({
    attachments: []
  });
  const [submitting, setSubmitting] = useState(false);

  // 重置表单当弹窗关闭时
  useEffect(() => {
    if (!isOpen) {
      setFormData({ attachments: [] });
      setSubmitting(false);
    }
  }, [isOpen]);

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    
    // 验证文件数量（最多5个）
    const remainingSlots = 5 - formData.attachments.length;
    if (files.length > remainingSlots) {
      alert(t('projects.application.attachments.maxFiles', { max: 5 }));
      return;
    }

    // 验证文件大小和类型
    const validFiles = [];
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        alert(t('projects.application.attachments.fileTooLarge', { fileName: file.name }));
        continue;
      }
      validFiles.push(file);
    }

    setFormData(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...validFiles]
    }));
  };

  const handleRemoveFile = (index) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    // 验证附件数量
    if (formData.attachments.length === 0) {
      alert(t('projects.application.attachments.required'));
      return;
    }

    if (formData.attachments.length > 5) {
      alert(t('projects.application.attachments.maxFiles', { max: 5 }));
      return;
    }

    setSubmitting(true);
    try {
      const formDataToSend = new FormData();
      
      // 添加附件
      formData.attachments.forEach((file, index) => {
        formDataToSend.append(`attachments`, file);
      });

      // 提交申请
      const response = await apiService.post(
        `${API_PREFIX}/projects/${projectId}/applications`,
        formDataToSend,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.success) {
        alert(t('projects.application.submitSuccess') || t('message.submitSuccess'));
        onSuccess?.();
      } else {
        throw new Error(response.message || '提交失败');
      }
    } catch (error) {
      console.error('Failed to submit application:', error);
      alert(error.response?.data?.message || t('projects.application.submitFailed') || t('message.submitFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('projects.application.title')}
      size="lg"
    >
      {/* 注意事项 */}
      <div className="notice-card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center' }}>
          <WarningIcon className="w-5 h-5" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '0.5rem' }} />
          {t('projects.application.notice.title')}
        </h3>
        <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
          <li>{t('projects.application.notice.item1')}</li>
          <li>{t('projects.application.notice.item2')}</li>
          <li>{t('projects.application.notice.item3')}</li>
        </ul>
      </div>

      {/* 附件上传 */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>
          {t('projects.application.attachments.title')}
        </h3>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
          {t('projects.application.attachments.description')}
        </p>

        <div className="file-upload-area">
          <input
            type="file"
            id="file-upload-modal"
            multiple
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            accept=".pdf,.doc,.docx,.xls,.xlsx"
          />
          <Button
            onClick={() => document.getElementById('file-upload-modal').click()}
            variant="secondary"
            disabled={formData.attachments.length >= 5}
          >
            <PaperclipIcon className="w-4 h-4" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '0.5rem' }} />
            {t('common.upload')}
          </Button>
          <small className="form-hint" style={{ display: 'block', marginTop: '0.5rem' }}>
            {t('projects.application.attachments.hint')} ({t('projects.application.attachments.maxFiles', { max: 5 })})
          </small>
        </div>

        {formData.attachments.length > 0 && (
          <div className="uploaded-files" style={{ marginTop: '1.5rem' }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem' }}>
              {t('projects.application.attachments.uploaded')} ({formData.attachments.length}/5)
            </h4>
            {formData.attachments.map((file, index) => (
              <div key={index} className="file-item">
                <span className="file-name">
                  <DocumentIcon className="w-4 h-4" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '0.5rem' }} />
                  {file.name}
                </span>
                <span className="file-size">
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
                <Button
                  onClick={() => handleRemoveFile(index)}
                  variant="text"
                  size="small"
                >
                  <XIcon className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <ModalFooter>
        <Button
          onClick={onClose}
          variant="secondary"
          disabled={submitting}
        >
          {t('common.cancel')}
        </Button>
        
        <Button
          onClick={handleSubmit}
          variant="primary"
          disabled={submitting || formData.attachments.length === 0}
        >
          {submitting ? t('common.submitting') : t('common.submit')}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

