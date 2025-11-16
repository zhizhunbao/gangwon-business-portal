/**
 * Performance Form Content - Member Portal
 * 绩效数据录入表单内容组件
 */

import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import Card from '@shared/components/Card';
import Button from '@shared/components/Button';
import Input from '@shared/components/Input';
import Textarea from '@shared/components/Textarea';
import Select from '@shared/components/Select';
import { apiService } from '@shared/services';
import { API_PREFIX } from '@shared/utils/constants';
import { PaperclipIcon, DocumentIcon, XIcon } from '@shared/components/Icons';
import './Performance.css';

export default function PerformanceFormContent() {
  const { t } = useTranslation();
  const isEdit = false; // 编辑功能可通过 hash 参数实现，如 #edit-${id}
  
  const [formData, setFormData] = useState({
    year: new Date().getFullYear(),
    quarter: '',
    sales: '',
    employment: '',
    governmentSupport: '',
    intellectualProperty: {
      patents: '',
      trademarks: '',
      copyrights: '',
      certifications: ''
    },
    proofDocuments: [],
    notes: ''
  });

  useEffect(() => {
    // 编辑功能可通过 hash 参数实现，如 #edit-${id}
    // 当前仅支持新建功能
    if (isEdit) {
      // TODO: 从 hash 中解析 id，如 window.location.hash === '#edit-123'
      // TODO: 从 API 获取绩效数据
      // Mock data for development
      setFormData({
        year: 2024,
        quarter: 4,
        sales: '50000000',
        employment: '15',
        governmentSupport: '10000000',
        intellectualProperty: {
          patents: '1',
          trademarks: '1',
          copyrights: '0',
          certifications: '0'
        },
        proofDocuments: [],
        notes: ''
      });
    }
  }, [isEdit]);

  const handleChange = (field, value) => {
    if (field.startsWith('intellectualProperty.')) {
      const ipField = field.split('.')[1];
      setFormData(prev => ({
        ...prev,
        intellectualProperty: {
          ...prev.intellectualProperty,
          [ipField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    setFormData(prev => ({
      ...prev,
      proofDocuments: [...prev.proofDocuments, ...files]
    }));
  };

  const handleRemoveFile = (index) => {
    setFormData(prev => ({
      ...prev,
      proofDocuments: prev.proofDocuments.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    try {
      // TODO: 验证表单
      // TODO: API 调用提交绩效数据
      console.log('Submitting performance:', formData);
      alert(t('message.submitSuccess'));
      window.location.hash = 'list';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
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

  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const year = new Date().getFullYear() - i;
    return { value: year.toString(), label: year.toString() };
  });

  const quarterOptions = [
    { value: '', label: t('performance.selectQuarter') },
    { value: '1', label: t('performance.quarter1') },
    { value: '2', label: t('performance.quarter2') },
    { value: '3', label: t('performance.quarter3') },
    { value: '4', label: t('performance.quarter4') }
  ];

  const totalIP = Object.values(formData.intellectualProperty).reduce(
    (sum, val) => sum + (parseInt(val) || 0), 0
  );

  return (
    <div className="performance-form-content">
      <div className="page-header">
        <h1>{isEdit ? t('performance.edit', '编辑绩效') : t('performance.createNew', '新增绩效')}</h1>
      </div>

      {/* 基本信息 */}
      <Card>
        <h2>{t('performance.sections.basicInfo')}</h2>
        <div className="form-grid">
          <div className="form-group">
            <label>{t('performance.year')} *</label>
            <Select
              value={formData.year.toString()}
              onChange={(e) => handleChange('year', parseInt(e.target.value))}
              options={yearOptions}
              required
            />
          </div>

          <div className="form-group">
            <label>{t('performance.quarter')}</label>
            <Select
              value={formData.quarter}
              onChange={(e) => handleChange('quarter', e.target.value)}
              options={quarterOptions}
            />
            <small className="form-hint">
              {t('performance.quarterHint')}
            </small>
          </div>
        </div>
      </Card>

      {/* 销售和雇佣 */}
      <Card>
        <h2>{t('performance.sections.salesEmployment')}</h2>
        <div className="form-grid">
          <div className="form-group">
            <label>{t('performance.sales')} (원) *</label>
            <Input
              type="number"
              value={formData.sales}
              onChange={(e) => handleChange('sales', e.target.value)}
              placeholder="0"
              required
            />
          </div>

          <div className="form-group">
            <label>{t('performance.employment')} (명) *</label>
            <Input
              type="number"
              value={formData.employment}
              onChange={(e) => handleChange('employment', e.target.value)}
              placeholder="0"
              required
            />
          </div>
        </div>
      </Card>

      {/* 政府支持 */}
      <Card>
        <h2>{t('performance.sections.governmentSupport')}</h2>
        <div className="form-group">
          <label>{t('performance.governmentSupport')} (원)</label>
          <Input
            type="number"
            value={formData.governmentSupport}
            onChange={(e) => handleChange('governmentSupport', e.target.value)}
            placeholder="0"
          />
        </div>
      </Card>

      {/* 知识产权 */}
      <Card>
        <h2>{t('performance.sections.intellectualProperty')}</h2>
        <div className="form-grid">
          <div className="form-group">
            <label>{t('performance.patent')} (건)</label>
            <Input
              type="number"
              value={formData.intellectualProperty.patents}
              onChange={(e) => handleChange('intellectualProperty.patents', e.target.value)}
              placeholder="0"
            />
          </div>

          <div className="form-group">
            <label>{t('performance.trademark')} (건)</label>
            <Input
              type="number"
              value={formData.intellectualProperty.trademarks}
              onChange={(e) => handleChange('intellectualProperty.trademarks', e.target.value)}
              placeholder="0"
            />
          </div>

          <div className="form-group">
            <label>{t('performance.copyright')} (건)</label>
            <Input
              type="number"
              value={formData.intellectualProperty.copyrights}
              onChange={(e) => handleChange('intellectualProperty.copyrights', e.target.value)}
              placeholder="0"
            />
          </div>

          <div className="form-group">
            <label>{t('performance.certification')} (건)</label>
            <Input
              type="number"
              value={formData.intellectualProperty.certifications}
              onChange={(e) => handleChange('intellectualProperty.certifications', e.target.value)}
              placeholder="0"
            />
          </div>
        </div>
        
        <div className="ip-summary">
          <strong>{t('performance.totalIP')}: {totalIP} {t('performance.items')}</strong>
        </div>
      </Card>

      {/* 证明文件 */}
      <Card>
        <h2>{t('performance.sections.proofDocuments')}</h2>
        <p className="section-description">
          {t('performance.proofDocumentsDesc')}
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
            {t('performance.fileUploadHint')}
          </small>
        </div>

        {formData.proofDocuments.length > 0 && (
          <div className="uploaded-files">
            <h3>{t('performance.uploadedFiles')}</h3>
            {formData.proofDocuments.map((file, index) => (
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

      {/* 备注 */}
      <Card>
        <h2>{t('performance.sections.notes')}</h2>
        <div className="form-group">
          <Textarea
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            rows={5}
            placeholder={t('performance.notesPlaceholder')}
          />
        </div>
      </Card>

      {/* 操作按钮 */}
      <div className="action-buttons">
        <Button
          onClick={() => {
            window.location.hash = 'list';
            window.dispatchEvent(new HashChangeEvent('hashchange'));
          }}
          variant="secondary"
        >
          {t('common.cancel')}
        </Button>
        
        <Button
          onClick={handleSaveDraft}
          variant="outline"
        >
          {t('performance.saveDraft')}
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

