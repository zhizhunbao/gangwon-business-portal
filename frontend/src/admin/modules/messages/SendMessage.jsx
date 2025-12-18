/**
 * Send Message Component - Admin Portal
 * 发送站内信
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Button, Input, Textarea, Select, Alert } from '@shared/components';
import { messagesService, adminService } from '@shared/services';

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
    const response = await adminService.listMembers({ page: 1, pageSize: 100 });
    setMembers(response.members || []);
    setLoading(false);
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
      newErrors.recipientId = t('validation.required', { field: t('admin.messages.recipient') });
    }
    if (!formData.subject?.trim()) {
      newErrors.subject = t('validation.required', { field: t('admin.messages.subject') });
    }
    if (!formData.content?.trim()) {
      newErrors.content = t('validation.required', { field: t('admin.messages.content') });
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!validateForm()) {
      setMessageVariant('error');
      setMessage(t('admin.messages.validationError'));
      return;
    }

    setSaving(true);
    await messagesService.createMessage(formData);
    setMessageVariant('success');
    setMessage(t('admin.messages.sent'));
    
    // Reset form
    setFormData({
      recipientId: '',
      subject: '',
      content: '',
      isImportant: false
    });
    
    setTimeout(() => setMessage(null), 3000);
    setSaving(false);
  };

  const memberOptions = members.map(member => ({
    value: member.id,
    label: `${member.companyName} (${member.email})`
  }));

  return (
    <div className="w-full">
      {message && (
        <Alert variant={messageVariant} className="mb-4">
          {message}
        </Alert>
      )}

      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900 m-0 mb-1">
          {t('admin.messages.sendTitle')}
        </h2>
        <p className="text-gray-600 text-sm m-0">
          {t('admin.messages.sendDescription')}
        </p>
      </div>

      <Card>
        <div className="p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <Select
            label={t('admin.messages.recipient')}
            value={formData.recipientId}
            onChange={handleFieldChange('recipientId')}
            options={memberOptions}
            required
            error={errors.recipientId}
            disabled={loading}
            placeholder={t('admin.messages.selectRecipient')}
          />

          <Input
            label={t('admin.messages.subject')}
            value={formData.subject}
            onChange={handleFieldChange('subject')}
            required
            error={errors.subject}
            placeholder={t('admin.messages.subjectPlaceholder')}
            maxLength={255}
          />

          <Textarea
            label={t('admin.messages.content')}
            value={formData.content}
            onChange={handleFieldChange('content')}
            rows={10}
            required
            error={errors.content}
            placeholder={t('admin.messages.contentPlaceholder')}
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
              {t('admin.messages.markAsImportant')}
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
              {t('common.reset')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={saving}
            >
              {t('admin.messages.send')}
            </Button>
          </div>
        </form>
        </div>
      </Card>
    </div>
  );
}

