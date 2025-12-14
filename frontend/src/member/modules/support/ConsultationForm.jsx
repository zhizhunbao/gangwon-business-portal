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
import { supportService, loggerService, exceptionService } from '@shared/services';

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
      loggerService.error('Failed to submit consultation', {
        module: 'ConsultationForm',
        function: 'handleSubmit',
        error_message: error.message,
        error_code: error.code
      });
      exceptionService.recordException(error, {
        request_path: window.location.pathname,
        error_code: error.code || 'SUBMIT_CONSULTATION_FAILED'
      });
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
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600 m-0">{error}</p>
          </div>
        )}

        <div className="flex flex-col gap-3 transition-all duration-200 focus-within:transform [&:focus-within_label]:text-blue-600">
          <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 transition-colors duration-200">{t('support.subjectLabel')} *</label>
          <Input
            value={formData.subject}
            onChange={(e) => handleChange('subject', e.target.value)}
            placeholder={t('support.subjectPlaceholder')}
            required
            className="focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:border-blue-500"
          />
        </div>

        <div className="flex flex-col gap-3 transition-all duration-200 focus-within:transform [&:focus-within_label]:text-blue-600">
          <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 transition-colors duration-200">{t('support.contentLabel')} *</label>
          <Textarea
            value={formData.content}
            onChange={(e) => handleChange('content', e.target.value)}
            rows={8}
            placeholder={t('support.contentPlaceholder')}
            required
            className="focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:border-blue-500"
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting || !formData.subject || !formData.content}
          className="mt-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {isSubmitting ? t('common.submitting') : t('common.submit')}
        </Button>
      </form>
    </Card>
  );
}

