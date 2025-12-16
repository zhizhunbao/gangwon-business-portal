/**
 * Send Message Component - Admin Portal
 * 发送站内信
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Button, Input, Textarea, Select, Alert } from '@shared/components';
import { messageService, adminService, loggerService, exceptionService } from '@shared/services';

export default function SendMessage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState([]);
  const [formData, setFormData] = useState({
    recipientId: '',
    subject: '',
    content: '',
    isImportant: false
  });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [messageVariant, setMessageVariant] = useState('success');

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminService.listMembers({ page: 1, pageSize: 1000 });
      setMembers(response.members || []);
    } catch (error) {
      loggerService.error('Failed to load members', {
        module: 'SendMessage',
        function: 'loadMembers',
        error_message: error.message
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const handleFieldChange = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
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

  const validateForm = () => {
    const newErrors = {};
    if (!formData.recipientId) {
      newErrors.recipientId = t('validation.required', { field: t('admin.messages.recipient', '收件人') });
    }
    if (!formData.subject?.trim()) {
      newErrors.subject = t('validation.required', { field: t('admin.messages.subject', '主题') });
    }
    if (!formData.content?.trim()) {
      newErrors.content = t('validation.required', { field: t('admin.messages.content', '内容') });
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!validateForm()) {
      setMessageVariant('error');
      setMessage(t('admin.messages.validationError', '请补全必填信息'));
      return;
    }

    setSaving(true);
    try {
      await messageService.createMessage(formData);
      setMessageVariant('success');
      setMessage(t('admin.messages.sent', '消息发送成功'));
      
      // Reset form
      setFormData({
        recipientId: '',
        subject: '',
        content: '',
        isImportant: false
      });
      
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      loggerService.error('Failed to send message', {
        module: 'SendMessage',
        function: 'handleSubmit',
        error_message: error.message,
        error_code: error.code
      });
      exceptionService.recordException(error, {
        request_path: window.location.pathname,
        error_code: 'SEND_MESSAGE_ERROR'
      });
      setMessageVariant('error');
      setMessage(error?.response?.data?.detail || error?.message || t('admin.messages.sendFailed', '发送失败'));
    } finally {
      setSaving(false);
    }
  };

  const memberOptions = members.map(member => ({
    value: member.id,
    label: `${member.companyName} (${member.email})`
  }));

  return (
    <div className="w-full max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">
          {t('admin.messages.sendTitle', '发送站内信')}
        </h1>

        {message && (
          <Alert variant={messageVariant} className="mb-4">
            {message}
          </Alert>
        )}
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <Select
            label={t('admin.messages.recipient', '收件人')}
            value={formData.recipientId}
            onChange={handleFieldChange('recipientId')}
            options={memberOptions}
            required
            error={errors.recipientId}
            disabled={loading}
            placeholder={t('admin.messages.selectRecipient', '选择收件人')}
          />

          <Input
            label={t('admin.messages.subject', '主题')}
            value={formData.subject}
            onChange={handleFieldChange('subject')}
            required
            error={errors.subject}
            placeholder={t('admin.messages.subjectPlaceholder', '请输入消息主题')}
            maxLength={255}
          />

          <Textarea
            label={t('admin.messages.content', '内容')}
            value={formData.content}
            onChange={handleFieldChange('content')}
            rows={10}
            required
            error={errors.content}
            placeholder={t('admin.messages.contentPlaceholder', '请输入消息内容')}
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isImportant"
              checked={formData.isImportant}
              onChange={handleFieldChange('isImportant')}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="isImportant" className="text-sm text-gray-700 cursor-pointer">
              {t('admin.messages.markAsImportant', '标记为重要消息')}
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFormData({
                  recipientId: '',
                  subject: '',
                  content: '',
                  isImportant: false
                });
                setErrors({});
                setMessage(null);
              }}
            >
              {t('common.reset', '重置')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={saving}
            >
              {t('admin.messages.send', '发送')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

