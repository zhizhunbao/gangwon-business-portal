/**
 * Performance Company Info - Member Portal
 * 成果管理 - 企业信息页面
 */

import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@shared/hooks';
import Card from '@shared/components/Card';
import Button from '@shared/components/Button';
import Input from '@shared/components/Input';
import Textarea from '@shared/components/Textarea';
import Select from '@shared/components/Select';
import { memberService } from '@shared/services';
import { 
  UserIcon, 
  BuildingIcon, 
  LocationIcon, 
  PhoneIcon, 
  CalendarIcon,
  BriefcaseIcon,
  CurrencyDollarIcon,
  TeamIcon,
  GlobeIcon,
  EditIcon,
  CheckCircleIcon,
  XIcon,
  WarningIcon
} from '@shared/components/Icons';
import { formatNumber, parseFormattedNumber } from '@shared/utils/format';
import { validateImageFile } from '@shared/utils/fileValidation';
import './PerformanceCompanyInfo.css';

export default function PerformanceCompanyInfo() {
  const { t, i18n } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logoError, setLogoError] = useState('');
  const [companyData, setCompanyData] = useState({
    companyName: '',
    businessNumber: '',
    corporationNumber: '',
    establishedDate: '',
    representativeName: '',
    phone: '',
    address: '',
    region: '',
    category: '',
    industry: '',
    description: '',
    website: '',
    logo: null,
    // 业务信息字段（根据文档要求添加）
    businessField: '',
    sales: '',
    employeeCount: '',
    mainBusiness: '',
    cooperationFields: [],
    // 审批状态
    approvalStatus: 'pending' // pending, approved, rejected
  });

  useEffect(() => {
    if (isAuthenticated) {
      loadProfile();
    }
  }, [isAuthenticated, i18n.language]); // Reload data when language changes

  const loadProfile = async () => {
    if (!isAuthenticated) return;
    
    setLoading(true);
    try {
      const profile = await memberService.getProfile();
      if (profile) {
        setCompanyData({
          companyName: profile.companyName || '',
          businessNumber: profile.businessNumber || '',
          corporationNumber: profile.corporationNumber || '',
          establishedDate: profile.establishedDate || profile.foundingDate || '',
          representativeName: profile.representativeName || '',
          phone: profile.phone || '',
          address: profile.address || '',
          region: profile.region || '',
          category: profile.category || '',
          industry: profile.industry || '',
          description: profile.description || '',
          website: profile.website || profile.websiteUrl || '',
          logo: profile.logo || profile.logoUrl || null,
          // 业务信息字段
          businessField: profile.businessField || '',
          sales: profile.sales || profile.revenue ? formatNumber(profile.sales || profile.revenue) : '',
          employeeCount: profile.employeeCount ? formatNumber(profile.employeeCount) : '',
          mainBusiness: profile.mainBusiness || '',
          cooperationFields: profile.cooperationFields || [],
          // 审批状态
          approvalStatus: profile.approvalStatus || 'pending'
        });
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    // 处理数字字段的格式化
    if (field === 'sales' || field === 'employeeCount') {
      const numValue = parseFormattedNumber(value);
      if (!isNaN(numValue) || value === '') {
        setCompanyData(prev => ({
          ...prev,
          [field]: value === '' ? '' : formatNumber(numValue)
        }));
        return;
      }
    }
    
    setCompanyData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCooperationFieldChange = (field, checked) => {
    const fields = companyData.cooperationFields || [];
    if (checked) {
      setCompanyData(prev => ({
        ...prev,
        cooperationFields: [...fields, field]
      }));
    } else {
      setCompanyData(prev => ({
        ...prev,
        cooperationFields: fields.filter(f => f !== field)
      }));
    }
  };

  const handleSave = async () => {
    try {
      // 准备保存数据，将格式化的数字转换为原始数字
      const saveData = {
        companyName: companyData.companyName,
        email: companyData.email || undefined,
        industry: companyData.industry || undefined,
        revenue: companyData.sales ? parseFormattedNumber(companyData.sales) : undefined,
        employeeCount: companyData.employeeCount ? parseFormattedNumber(companyData.employeeCount) : undefined,
        foundingDate: companyData.establishedDate || undefined,
        region: companyData.region || undefined,
        address: companyData.address || undefined,
        website: companyData.website || companyData.websiteUrl || undefined
      };
      
      await memberService.updateProfile(saveData);
      setIsEditing(false);
      alert(t('message.saveSuccess') || '保存成功');
      loadProfile();
    } catch (error) {
      console.error('Failed to save:', error);
      const errorMessage = error.response?.data?.detail || error.message || t('message.saveFailed') || '保存失败';
      alert(errorMessage);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    loadProfile(); // 恢复原始数据
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file (type and size)
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setLogoError(validation.error || t('profile.logoUploadError', '文件上传失败：仅支持图片格式，最大10MB'));
      // Clear file input
      e.target.value = '';
      return;
    }
    
    // Clear error
    setLogoError('');
    
    // Note: File upload will be handled when saving the profile
    // Set file in companyData for now (actual upload will be handled in save)
    setCompanyData(prev => ({
      ...prev,
      logo: file
    }));
  };

  const regionOptions = [
    { value: '춘천시', label: t('profile.regions.춘천시', '춘천시') },
    { value: '원주시', label: t('profile.regions.원주시', '원주시') },
    { value: '강릉시', label: t('profile.regions.강릉시', '강릉시') },
    { value: '동해시', label: t('profile.regions.동해시', '동해시') },
    { value: '태백시', label: t('profile.regions.태백시', '태백시') },
    { value: '속초시', label: t('profile.regions.속초시', '속초시') },
    { value: '삼척시', label: t('profile.regions.삼척시', '삼척시') }
  ];

  const categoryOptions = [
    { value: 'tech', label: t('profile.categories.tech', '技术') },
    { value: 'manufacturing', label: t('profile.categories.manufacturing', '制造业') },
    { value: 'service', label: t('profile.categories.service', '服务业') },
    { value: 'retail', label: t('profile.categories.retail', '零售') },
    { value: 'other', label: t('profile.categories.other', '其他') }
  ];

  const industryOptions = [
    { value: 'software', label: t('profile.industries.software', '软件') },
    { value: 'hardware', label: t('profile.industries.hardware', '硬件') },
    { value: 'biotechnology', label: t('profile.industries.biotechnology', '生物技术') },
    { value: 'healthcare', label: t('profile.industries.healthcare', '医疗保健') },
    { value: 'education', label: t('profile.industries.education', '教育') },
    { value: 'finance', label: t('profile.industries.finance', '金融') },
    { value: 'other', label: t('profile.industries.other', '其他') }
  ];

  // 未登录用户显示提示信息
  if (!isAuthenticated) {
    return (
      <div className="performance-company-info">
        <div className="page-header">
          <h1>{t('performance.companyInfo', '企业信息')}</h1>
        </div>
        
        <Card>
          <div style={{ textAlign: 'center', padding: '3rem 2rem' }}>
            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
              <UserIcon className="w-16 h-16" style={{ color: '#6b7280' }} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#1f2937' }}>
              {t('profile.loginRequired') || '需要登录'}
            </h2>
            <p style={{ color: '#6b7280', marginBottom: '2rem', fontSize: '1rem' }}>
              {t('profile.loginRequiredDesc') || '要查看和管理企业信息，请先登录。'}
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <Link to="/login">
                <Button variant="primary" style={{ padding: '0.75rem 2rem' }}>
                  {t('common.login') || '登录'}
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="secondary" style={{ padding: '0.75rem 2rem' }}>
                  {t('common.register') || '注册'}
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="performance-company-info">
      <div className="page-header">
        <div className="page-header-content">
          <div className="page-title-wrapper">
            <BuildingIcon className="page-title-icon" />
            <h1>{t('performance.companyInfo', '企业信息')}</h1>
          </div>
          {loading && <div className="loading-indicator">加载中...</div>}
        </div>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)} variant="primary" className="edit-button">
            <EditIcon className="button-icon" />
            {t('common.edit', '编辑')}
          </Button>
        ) : (
          <div className="button-group">
            <Button onClick={handleSave} variant="primary" className="save-button">
              <CheckCircleIcon className="button-icon" />
              {t('common.save', '保存')}
            </Button>
            <Button onClick={handleCancel} variant="secondary">
              {t('common.cancel', '取消')}
            </Button>
          </div>
        )}
      </div>

      {/* 基本信息 */}
      <Card className="info-card">
        <div className="card-header">
          <BuildingIcon className="section-icon" />
          <h2>{t('profile.sections.basicInfo', '基本信息')}</h2>
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label>{t('member.companyName', '企业名称')} *</label>
            <Input
              value={companyData.companyName}
              onChange={(e) => handleChange('companyName', e.target.value)}
              disabled={!isEditing}
              required
            />
          </div>

          <div className="form-group">
            <label>{t('member.businessLicense', '营业执照号')} *</label>
            <Input
              value={companyData.businessNumber}
              disabled={true}
              title={t('profile.businessLicenseNotEditable', '营业执照号不可修改')}
            />
            <small className="form-hint">
              {t('profile.businessLicenseHint', '营业执照号不可修改')}
            </small>
          </div>

          <div className="form-group">
            <label>{t('member.corporationNumber', '法人号码')}</label>
            <Input
              value={companyData.corporationNumber}
              onChange={(e) => handleChange('corporationNumber', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div className="form-group">
            <label>
              <CalendarIcon className="label-icon" />
              {t('member.establishedDate', '成立日期')} *
            </label>
            <Input
              type="date"
              value={companyData.establishedDate}
              onChange={(e) => handleChange('establishedDate', e.target.value)}
              disabled={!isEditing}
              required
            />
          </div>

          <div className="form-group">
            <label>
              <UserIcon className="label-icon" />
              {t('member.representativeName', '代表姓名')} *
            </label>
            <Input
              value={companyData.representativeName}
              onChange={(e) => handleChange('representativeName', e.target.value)}
              disabled={!isEditing}
              required
            />
          </div>

          <div className="form-group">
            <label>
              <PhoneIcon className="label-icon" />
              {t('member.phone', '电话')} *
            </label>
            <Input
              type="tel"
              value={companyData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              disabled={!isEditing}
              required
            />
          </div>
        </div>
      </Card>

      {/* 地址信息 */}
      <Card className="info-card">
        <div className="card-header">
          <LocationIcon className="section-icon" />
          <h2>{t('profile.sections.addressInfo', '地址信息')}</h2>
        </div>
        <div className="form-grid">
          <div className="form-group full-width">
            <label>
              <LocationIcon className="label-icon" />
              {t('member.address', '地址')} *
            </label>
            <Input
              value={companyData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              disabled={!isEditing}
              required
            />
          </div>

          <Select
            label={t('member.region', '地区')}
            value={companyData.region}
            onChange={(e) => handleChange('region', e.target.value)}
            options={regionOptions}
            disabled={!isEditing}
            required
          />
        </div>
      </Card>

      {/* 业务信息 */}
      <Card className="info-card">
        <div className="card-header">
          <BriefcaseIcon className="section-icon" />
          <h2>{t('profile.sections.businessInfo', '业务信息')}</h2>
        </div>
        <div className="form-grid">
          <Select
            label={t('member.category', '类别')}
            value={companyData.category}
            onChange={(e) => handleChange('category', e.target.value)}
            options={categoryOptions}
            disabled={!isEditing}
            required
          />

          <Select
            label={t('member.industry', '行业')}
            value={companyData.industry}
            onChange={(e) => handleChange('industry', e.target.value)}
            options={industryOptions}
            disabled={!isEditing}
            required
          />

          <div className="form-group">
            <label>{t('member.businessField', '业务领域')}</label>
            <Select
              value={companyData.businessField}
              onChange={(e) => handleChange('businessField', e.target.value)}
              options={categoryOptions}
              disabled={!isEditing}
            />
          </div>

          <div className="form-group">
            <label>
              <CurrencyDollarIcon className="label-icon" />
              {t('member.sales', '销售额')}
            </label>
            <Input
              type="text"
              value={companyData.sales}
              onChange={(e) => handleChange('sales', e.target.value)}
              disabled={!isEditing}
              placeholder="0"
            />
          </div>

          <div className="form-group">
            <label>
              <TeamIcon className="label-icon" />
              {t('member.employeeCount', '员工数')}
            </label>
            <Input
              type="text"
              value={companyData.employeeCount}
              onChange={(e) => handleChange('employeeCount', e.target.value)}
              disabled={!isEditing}
              placeholder="0"
            />
          </div>

          <div className="form-group full-width">
            <label>
              <GlobeIcon className="label-icon" />
              {t('member.website', '网站')}
            </label>
            <Input
              type="url"
              value={companyData.website}
              onChange={(e) => handleChange('website', e.target.value)}
              disabled={!isEditing}
              placeholder="https://example.com"
            />
          </div>

          <div className="form-group full-width">
            <label>{t('member.mainBusiness', '主要业务及产品')}</label>
            <Textarea
              value={companyData.mainBusiness}
              onChange={(e) => handleChange('mainBusiness', e.target.value)}
              disabled={!isEditing}
              rows={4}
            />
          </div>

          <div className="form-group full-width">
            <label>{t('member.description', '描述')}</label>
            <Textarea
              value={companyData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              disabled={!isEditing}
              rows={5}
              maxLength={500}
            />
            <small className="form-hint">
              {companyData.description.length}/500
            </small>
          </div>

          {isEditing && (
              <div className="form-group full-width">
              <label>{t('member.cooperationFields', '产业合作期望领域')}</label>
              <div className="checkbox-group">
                {/* Note: Options should be loaded from settings API (see 1.4 Frontend Feature Completion) */}
                {['field1', 'field2', 'field3'].map(field => (
                  <label key={field} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={companyData.cooperationFields.includes(field)}
                      onChange={(e) => handleCooperationFieldChange(field, e.target.checked)}
                    />
                    <span>{field}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {!isEditing && companyData.cooperationFields && companyData.cooperationFields.length > 0 && (
            <div className="form-group full-width">
              <label>{t('member.cooperationFields', '产业合作期望领域')}</label>
              <div className="cooperation-fields-display">
                {companyData.cooperationFields.map((field, index) => (
                  <span key={index} className="field-tag">{field}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Logo */}
      <Card className="info-card">
        <div className="card-header">
          <h2>{t('profile.sections.logo', 'Logo')}</h2>
        </div>
        <div className="logo-upload">
          {companyData.logo ? (
            <div className="logo-preview">
              <img src={companyData.logo} alt="Company Logo" />
            </div>
          ) : (
            <div className="logo-placeholder">
              {t('profile.noLogo', '无Logo')}
            </div>
          )}
          
          {isEditing && (
            <div className="upload-actions">
              <input
                type="file"
                id="logo-upload"
                accept="image/*"
                onChange={handleLogoUpload}
                style={{ display: 'none' }}
              />
              <Button
                onClick={() => document.getElementById('logo-upload').click()}
                variant="secondary"
              >
                {t('common.upload', '上传')}
              </Button>
              <small className="form-hint">
                {t('profile.logoHint', '支持 JPG, PNG, GIF 格式，最大 10MB')}
              </small>
              {logoError && (
                <div className="error-message" style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                  {logoError}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* 审批状态 */}
      <Card className="info-card approval-card">
        <div className="card-header">
          <CheckCircleIcon className="section-icon" />
          <h2>{t('profile.sections.approvalStatus', '审批状态')}</h2>
        </div>
        <div className="approval-status">
          {companyData.approvalStatus === 'approved' && (
            <>
              <div className="status-badge status-approved">
                <CheckCircleIcon className="status-icon" />
                {t('member.approved', '已批准')}
              </div>
              <p className="status-description">
                {t('profile.approvalStatusDesc.approved', '您的企业信息已通过审核。')}
              </p>
            </>
          )}
          {companyData.approvalStatus === 'pending' && (
            <>
              <div className="status-badge status-pending">
                <WarningIcon className="status-icon" />
                {t('member.pending', '待审核')}
              </div>
              <p className="status-description">
                {t('profile.approvalStatusDesc.pending', '您的企业信息正在审核中，请耐心等待。')}
              </p>
            </>
          )}
          {companyData.approvalStatus === 'rejected' && (
            <>
              <div className="status-badge status-rejected">
                <XIcon className="status-icon" />
                {t('member.rejected', '已拒绝')}
              </div>
              <p className="status-description">
                {t('profile.approvalStatusDesc.rejected', '您的企业信息审核未通过，请修改后重新提交。')}
              </p>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

