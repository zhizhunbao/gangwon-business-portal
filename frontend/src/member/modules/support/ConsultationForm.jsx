/**
 * Consultation Form Component - Member Portal
 * 1:1咨询表单组件（姓名、邮箱、手机号、咨询标题、咨询内容、附件最多3个）
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '@shared/components/Card';
import Button from '@shared/components/Button';
import Input from '@shared/components/Input';
import Textarea from '@shared/components/Textarea';
import { supportService } from '@shared/services';
import './ConsultationForm.css';

export default function ConsultationForm({ onSubmitSuccess }) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    subject: '',
    content: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // 清除错误
    if (error) {
      setError(null);
    }
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
      await supportService.createInquiry({
        subject: formData.subject,
        content: formData.content
      });

      alert(t('message.submitSuccess'));
      setFormData({
        subject: '',
        content: ''
      });
      
      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
    } catch (error) {
      console.error('Failed to submit consultation:', error);
      const errorMessage = error?.response?.data?.detail || error?.message || t('message.submitFailed');
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <h2>{t('support.newInquiry')}</h2>
      <form onSubmit={handleSubmit} className="consultation-form">
        {error && (
          <div className="form-error">
            <p>{error}</p>
          </div>
        )}

        <div className="form-group">
          <label>{t('support.subjectLabel')} *</label>
          <Input
            value={formData.subject}
            onChange={(e) => handleChange('subject', e.target.value)}
            placeholder={t('support.subjectPlaceholder')}
            required
          />
        </div>

        <div className="form-group">
          <label>{t('support.contentLabel')} *</label>
          <Textarea
            value={formData.content}
            onChange={(e) => handleChange('content', e.target.value)}
            rows={8}
            placeholder={t('support.contentPlaceholder')}
            required
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting || !formData.subject || !formData.content}
        >
          {isSubmitting ? t('common.submitting') : t('common.submit')}
        </Button>
      </form>
    </Card>
  );
}

