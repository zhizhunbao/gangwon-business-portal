/**
 * Project Application Page - Member Portal
 * 项目申请
 */

import './Projects.css';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '@shared/components/Card';
import Button from '@shared/components/Button';
import Input from '@shared/components/Input';
import Textarea from '@shared/components/Textarea';
import Select from '@shared/components/Select';
import { WarningIcon, PaperclipIcon, DocumentIcon, XIcon } from '@shared/components/Icons';

export default function ProjectApplication() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    projectTitle: '',
    budget: '',
    duration: '',
    objectives: '',
    scope: '',
    expectedResults: '',
    teamMembers: '',
    attachments: []
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    setFormData(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...files]
    }));
  };

  const handleRemoveFile = (index) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    try {
      // TODO: 验证表单
      // TODO: API 调用提交申请
      console.log('Submitting application:', formData);
      alert(t('message.submitSuccess'));
      navigate(`/member/projects/${id}`);
    } catch (error) {
      console.error('Failed to submit:', error);
      alert(t('message.submitFailed'));
    }
  };

  const handleSaveDraft = async () => {
    try {
      // TODO: API 调用保存草稿
      console.log('Saving draft:', formData);
      alert(t('message.saveSuccess'));
    } catch (error) {
      console.error('Failed to save draft:', error);
      alert(t('message.saveFailed'));
    }
  };

  return (
    <div className="project-application">
      <div className="page-header">
        <h1>{t('projects.application.title')}</h1>
        <p className="subtitle">{t('projects.application.subtitle')}</p>
      </div>

      {/* 注意事项 */}
      <Card className="notice-card">
        <h3>
          <WarningIcon className="w-5 h-5" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '0.5rem' }} />
          {t('projects.application.notice.title')}
        </h3>
        <ul>
          <li>{t('projects.application.notice.item1')}</li>
          <li>{t('projects.application.notice.item2')}</li>
          <li>{t('projects.application.notice.item3')}</li>
        </ul>
      </Card>

      {/* 申请表单 */}
      <Card>
        <h2>{t('projects.application.form.title')}</h2>
        
        <div className="form-section">
          <div className="form-group">
            <label>{t('projects.application.form.projectTitle')} *</label>
            <Input
              value={formData.projectTitle}
              onChange={(e) => handleChange('projectTitle', e.target.value)}
              placeholder={t('projects.application.form.projectTitlePlaceholder')}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>{t('projects.application.form.budget')} *</label>
              <Input
                type="number"
                value={formData.budget}
                onChange={(e) => handleChange('budget', e.target.value)}
                placeholder="0"
                required
              />
            </div>

            <div className="form-group">
              <label>{t('projects.application.form.duration')} *</label>
              <Input
                value={formData.duration}
                onChange={(e) => handleChange('duration', e.target.value)}
                placeholder="예: 12개월"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>{t('projects.application.form.objectives')} *</label>
            <Textarea
              value={formData.objectives}
              onChange={(e) => handleChange('objectives', e.target.value)}
              rows={5}
              required
            />
            <small className="form-hint">
              {t('projects.application.form.objectivesHint')}
            </small>
          </div>

          <div className="form-group">
            <label>{t('projects.application.form.scope')} *</label>
            <Textarea
              value={formData.scope}
              onChange={(e) => handleChange('scope', e.target.value)}
              rows={5}
              required
            />
          </div>

          <div className="form-group">
            <label>{t('projects.application.form.expectedResults')} *</label>
            <Textarea
              value={formData.expectedResults}
              onChange={(e) => handleChange('expectedResults', e.target.value)}
              rows={5}
              required
            />
          </div>

          <div className="form-group">
            <label>{t('projects.application.form.teamMembers')}</label>
            <Textarea
              value={formData.teamMembers}
              onChange={(e) => handleChange('teamMembers', e.target.value)}
              rows={4}
              placeholder={t('projects.application.form.teamMembersPlaceholder')}
            />
          </div>
        </div>
      </Card>

      {/* 附件上传 */}
      <Card>
        <h2>{t('projects.application.attachments.title')}</h2>
        <p className="section-description">
          {t('projects.application.attachments.description')}
        </p>

        <div className="file-upload-area">
          <input
            type="file"
            id="file-upload"
            multiple
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
          <Button
            onClick={() => document.getElementById('file-upload').click()}
            variant="secondary"
          >
            <PaperclipIcon className="w-4 h-4" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '0.5rem' }} />
            {t('common.upload')}
          </Button>
          <small className="form-hint">
            {t('projects.application.attachments.hint')}
          </small>
        </div>

        {formData.attachments.length > 0 && (
          <div className="uploaded-files">
            <h3>{t('projects.application.attachments.uploaded')}</h3>
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
      </Card>

      {/* 操作按钮 */}
      <div className="action-buttons">
        <Button
          onClick={() => navigate(`/member/projects/${id}`)}
          variant="secondary"
        >
          {t('common.cancel')}
        </Button>
        
        <Button
          onClick={handleSaveDraft}
          variant="outline"
        >
          {t('projects.application.saveDraft')}
        </Button>
        
        <Button
          onClick={handleSubmit}
          variant="primary"
        >
          {t('common.submit')}
        </Button>
      </div>
    </div>
  );
}

