/**
 * Performance Company Info - Member Portal
 */

import { useTranslation } from 'react-i18next';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@shared/hooks';
import Card from '@shared/components/Card';
import Button from '@shared/components/Button';
import { Alert, Loading } from '@shared/components';
import Input from '@shared/components/Input';
import Textarea from '@shared/components/Textarea';
import Select from '@shared/components/Select';
import { Badge, Modal, ModalFooter } from '@shared/components';
import { memberService, uploadService } from '@shared/services';
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
  CheckCircleIcon
} from '@shared/components/Icons';
import { formatNumber, parseFormattedNumber } from '@shared/utils/format';
import { validateImageFile } from '@shared/utils/fileValidation';

export default function PerformanceCompanyInfo() {
  const { t, i18n } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [messageVariant, setMessageVariant] = useState('success');
  const [companyData, setCompanyData] = useState({
    companyName: '', businessNumber: '', corporationNumber: '', establishedDate: '',
    representativeName: '', phone: '', address: '', region: '', category: '', industry: '',
    description: '', website: '', logo: null, logoPreview: null, businessField: '', sales: '', employeeCount: '',
    mainBusiness: '', cooperationFields: [], approvalStatus: null
  });

  // 使用 ref 存储 logoPreview URL，便于清理
  const logoPreviewRef = useRef(null);

  // 清理 logo 预览 URL 的辅助函数
  const cleanupLogoPreview = useCallback(() => {
    if (logoPreviewRef.current) {
      URL.revokeObjectURL(logoPreviewRef.current);
      logoPreviewRef.current = null;
    }
  }, []);

  const loadProfile = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    cleanupLogoPreview();
    
    const profile = await memberService.getProfile();
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
      logoPreview: null,
      businessField: profile.businessField || '',
      sales: profile.sales || profile.revenue ? formatNumber(profile.sales || profile.revenue) : '',
      employeeCount: profile.employeeCount ? formatNumber(profile.employeeCount) : '',
      mainBusiness: profile.mainBusiness || '', 
      cooperationFields: profile.cooperationFields || [],
      approvalStatus: profile.approvalStatus || null
    });
    setLoading(false);
  }, [isAuthenticated, cleanupLogoPreview]);

  useEffect(() => { 
    if (isAuthenticated) loadProfile(); 
  }, [isAuthenticated, loadProfile]);

  // 清理 logo 预览 URL
  useEffect(() => {
    return () => {
      cleanupLogoPreview();
    };
  }, [cleanupLogoPreview]);

  const validateField = useCallback((field, value) => {
    const errors = { ...fieldErrors };
    
    if (field === 'phone' && value && !/^[\d\s\-+()]+$/.test(value)) {
      errors.phone = t('performance.companyInfo.validation.invalidPhone', '请输入有效的电话号码');
    } else if (field === 'website' && value && !/^https?:\/\/.+/.test(value)) {
      errors.website = t('performance.companyInfo.validation.invalidWebsite', '请输入有效的网站地址');
    } else if (field === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      errors.email = t('performance.companyInfo.validation.invalidEmail', '请输入有效的邮箱地址');
    } else {
      delete errors[field];
    }
    
    setFieldErrors(errors);
  }, [fieldErrors, t]);

  const handleChange = useCallback((field, value) => {
    if (field === 'sales' || field === 'employeeCount') {
      const numValue = parseFormattedNumber(value);
      if (!isNaN(numValue) || value === '') {
        setCompanyData(prev => ({ ...prev, [field]: value === '' ? '' : formatNumber(numValue) }));
      }
      return;
    }
    
    setCompanyData(prev => ({ ...prev, [field]: value }));
    if (['phone', 'website', 'email'].includes(field)) validateField(field, value);
  }, [validateField]);

  const handleCooperationFieldChange = useCallback((field, checked) => {
    setCompanyData(prev => {
      const fields = prev.cooperationFields || [];
      return {
        ...prev,
        cooperationFields: checked ? [...fields, field] : fields.filter(f => f !== field)
      };
    });
  }, []);

  // 必填字段列表和对应的显示名称
  const requiredFieldsMap = useMemo(() => ({
    companyName: t('member.companyName', 'Company Name'),
    establishedDate: t('member.establishedDate', 'Established Date'),
    representativeName: t('member.representativeName', 'Representative'),
    phone: t('member.phone', 'Phone'),
    address: t('member.address', 'Address')
  }), [t]);

  const requiredFields = useMemo(() => Object.keys(requiredFieldsMap), [requiredFieldsMap]);

  const handleSave = useCallback(async () => {
    const missingFields = requiredFields.filter(field => !companyData[field]);
    
    if (Object.keys(fieldErrors).length > 0) {
      setMessageVariant('error');
      setMessage(t('performance.companyInfo.validation.fieldErrors', '请修正表单错误'));
      return;
    }
    
    if (missingFields.length > 0) {
      setMessageVariant('error');
      setMessage(t('performance.companyInfo.validation.missingRequiredFields', '请填写所有必填项'));
      return;
    }

    setSaving(true);
    const saveData = {
      companyName: companyData.companyName,
      email: companyData.email,
      industry: companyData.industry,
      revenue: companyData.sales ? parseFormattedNumber(companyData.sales) : null,
      employeeCount: companyData.employeeCount ? parseFormattedNumber(companyData.employeeCount) : null,
      foundingDate: companyData.establishedDate,
      region: companyData.region,
      address: companyData.address,
      website: companyData.website,
      corporationNumber: companyData.corporationNumber,
      representativeName: companyData.representativeName,
      phone: companyData.phone,
      logoUrl: companyData.logo
    };

    await memberService.updateProfile(saveData);
    setIsEditing(false);
    setMessageVariant('success');
    setMessage(t('performance.companyInfo.message.saveSuccess', '保存成功'));
    setTimeout(() => setMessage(null), 3000);
    setSaving(false);
    loadProfile();
  }, [companyData, fieldErrors, requiredFields, t, loadProfile]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setFieldErrors({});
    cleanupLogoPreview();
    loadProfile();
  }, [cleanupLogoPreview, loadProfile]);

  const handleLogoFileSelect = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setMessageVariant('error');
      setMessage(validation.error);
      e.target.value = '';
      return;
    }
    
    setUploadingLogo(true);
    const uploadResponse = await uploadService.uploadPublic(file);
    setCompanyData(prev => ({ ...prev, logo: uploadResponse.file_url || uploadResponse.url }));
    setMessageVariant('success');
    setMessage(t('performance.companyInfo.message.logoUploadSuccess', 'Logo上传成功'));
    setTimeout(() => setMessage(null), 3000);
    setUploadingLogo(false);
    e.target.value = '';
  }, [t]);



  const regionOptions = useMemo(() => [
    { value: 'chuncheon', label: t('performance.companyInfo.profile.regions.chuncheon', '春川') },
    { value: 'wonju', label: t('performance.companyInfo.profile.regions.wonju', '原州') },
    { value: 'gangneung', label: t('performance.companyInfo.profile.regions.gangneung', '江陵') },
    { value: 'donghae', label: t('performance.companyInfo.profile.regions.donghae', '东海') },
    { value: 'taebaek', label: t('performance.companyInfo.profile.regions.taebaek', '太白') },
    { value: 'sokcho', label: t('performance.companyInfo.profile.regions.sokcho', '束草') },
    { value: 'samcheok', label: t('performance.companyInfo.profile.regions.samcheok', '三陟') }
  ], [t, i18n.language]);

  const categoryOptions = useMemo(() => [
    { value: 'tech', label: t('performance.companyInfo.profile.categories.tech', '科技') },
    { value: 'manufacturing', label: t('performance.companyInfo.profile.categories.manufacturing', '制造业') },
    { value: 'service', label: t('performance.companyInfo.profile.categories.service', '服务业') },
    { value: 'retail', label: t('performance.companyInfo.profile.categories.retail', '零售业') },
    { value: 'other', label: t('performance.companyInfo.profile.categories.other', '其他') }
  ], [t, i18n.language]);

  const industryOptions = useMemo(() => [
    { value: 'software', label: t('performance.companyInfo.profile.industries.software', '软件') },
    { value: 'hardware', label: t('performance.companyInfo.profile.industries.hardware', '硬件') },
    { value: 'biotechnology', label: t('performance.companyInfo.profile.industries.biotechnology', '生物技术') },
    { value: 'healthcare', label: t('performance.companyInfo.profile.industries.healthcare', '医疗保健') },
    { value: 'education', label: t('performance.companyInfo.profile.industries.education', '教育') },
    { value: 'finance', label: t('performance.companyInfo.profile.industries.finance', '金融') },
    { value: 'other', label: t('performance.companyInfo.profile.industries.other', '其他') }
  ], [t, i18n.language]);

  const cooperationFieldOptions = useMemo(() => [
    { value: 'field1', label: t('performance.companyInfo.profile.cooperationFields.field1', '技术合作') },
    { value: 'field2', label: t('performance.companyInfo.profile.cooperationFields.field2', '市场拓展') },
    { value: 'field3', label: t('performance.companyInfo.profile.cooperationFields.field3', '人才培养') }
  ], [t, i18n.language]);

  if (!isAuthenticated) {
    return (
      <div className="performance-company-info w-full max-w-full">
        <div className="mb-6 sm:mb-8 lg:mb-10 min-h-[48px] flex items-center">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 m-0">{t('performance.companyInfo.title', '企业信息')}</h1>
        </div>
        <Card>
          <div className="text-center p-12">
            <div className="mb-6 flex justify-center"><UserIcon className="w-16 h-16 text-gray-400" /></div>
            <h2 className="text-2xl font-bold mb-4 text-gray-900">{t('performance.companyInfo.profile.loginRequired', '需要登录')}</h2>
            <p className="text-gray-500 mb-8">{t('performance.companyInfo.profile.loginRequiredDesc', '请先登录以查看企业信息')}</p>
            <div className="flex gap-4 justify-center">
              <Link to="/login"><Button variant="primary">{t('common.login', 'Login')}</Button></Link>
              <Link to="/member/register"><Button variant="secondary">{t('common.register', 'Register')}</Button></Link>
            </div>
          </div>
        </Card>
      </div>
    );
  }


  return (
    <div className="performance-company-info w-full max-w-full">
      {message && (
        <div className="mb-4">
          <Alert variant={messageVariant}>
            {message}
          </Alert>
        </div>
      )}
      {/* 标题栏 */}
      <div className="mb-6 sm:mb-8 lg:mb-10 flex justify-between items-center gap-4 sm:gap-6 min-h-[48px]">
        <div className="flex items-center gap-3 sm:gap-4">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 m-0">{t('performance.companyInfo.title', '企业信息')}</h1>
          {companyData.approvalStatus && (
            <Badge 
              variant={
                companyData.approvalStatus === 'approved' ? 'success' :
                companyData.approvalStatus === 'pending' ? 'warning' :
                companyData.approvalStatus === 'rejected' ? 'danger' : 'gray'
              }
              className="text-xs sm:text-sm"
            >
              {companyData.approvalStatus === 'approved' && t('member.approved', 'Approved')}
              {companyData.approvalStatus === 'pending' && t('member.pending', 'Pending')}
              {companyData.approvalStatus === 'rejected' && t('member.rejected', 'Rejected')}
            </Badge>
          )}
        </div>
        {!isEditing ? (
          <Button
            onClick={() => setIsEditing(true)}
            variant="primary"
            disabled={loading || saving}
          >
            {t('common.edit', 'Edit')}
          </Button>
        ) : (
          <div className="flex gap-3 sm:gap-4 flex-shrink-0">
            <Button
              onClick={handleSave}
              variant="primary"
              disabled={saving}
            >
              {t('common.save', 'Save')}
            </Button>
            <Button onClick={handleCancel} variant="secondary" disabled={saving}>{t('common.cancel', 'Cancel')}</Button>
          </div>
        )}
      </div>

      {/* Basic Info */}
      <Card className="mb-6 sm:mb-8 shadow-sm hover:shadow-md transition-all p-0">
        <div className="flex items-center gap-3 sm:gap-4 border-b border-gray-200 p-6 sm:p-8 lg:p-10 pb-4 sm:pb-5 lg:pb-6">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 m-0">{t('performance.companyInfo.sections.basicInfo', '基本信息')}</h2>
        </div>
        <div className="p-6 sm:p-8 lg:p-10">
          {/* Logo Section */}
          <div className="mb-6 sm:mb-8 pb-6 sm:pb-8 border-b border-gray-200">
            <label className="block text-sm sm:text-base font-medium text-gray-700 mb-3 sm:mb-4">{t('performance.companyInfo.sections.logo', '企业Logo')}</label>
            <div className="flex flex-col items-start gap-4">
              {isEditing ? (
                <>
                  <input 
                    type="file" 
                    id="logo-upload" 
                    accept="image/*" 
                    onChange={handleLogoFileSelect} 
                    className="hidden"
                    disabled={uploadingLogo}
                  />
                  {uploadingLogo ? (
                    <div className="w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 border-2 border-blue-300 rounded-lg flex flex-col items-center justify-center bg-blue-50">
                      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-2"></div>
                      <span className="text-xs text-blue-600">{t('common.uploading', '上传中...')}</span>
                    </div>
                  ) : (companyData.logoPreview || companyData.logo) ? (
                    <div 
                      className="w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 border-2 border-gray-200 rounded-lg overflow-hidden flex items-center justify-center bg-gray-50 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                      onClick={() => document.getElementById('logo-upload')?.click()}
                      title={t('performance.companyInfo.profile.clickToChangeLogo', '点击更换Logo')}
                    >
                      <img 
                        src={companyData.logoPreview || companyData.logo} 
                        alt="Company Logo" 
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.target.src = '';
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  ) : (
                    <div 
                      className="w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 text-gray-500 text-xs sm:text-sm hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer"
                      onClick={() => document.getElementById('logo-upload')?.click()}
                      title={t('performance.companyInfo.profile.clickToUploadLogo', '点击上传Logo')}
                    >
                      {t('performance.companyInfo.profile.noLogo', '无Logo')}
                    </div>
                  )}
                  <small className="text-xs text-gray-500">{t('performance.companyInfo.profile.logoHint', '支持 JPG, PNG, GIF 格式，最大 10MB')}</small>
                </>
              ) : (
                <>
                  {(companyData.logo) ? (
                    <div className="w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 border-2 border-gray-200 rounded-lg overflow-hidden flex items-center justify-center bg-gray-50">
                      <img 
                        src={companyData.logo} 
                        alt="Company Logo" 
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.target.src = '';
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 text-gray-500 text-xs sm:text-sm">
                      {t('performance.companyInfo.profile.noLogo', '无Logo')}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          {/* Basic Info Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          <div className="flex flex-col">
            <label className="text-sm sm:text-base font-medium text-gray-700 mb-2">{t('member.companyName', 'Company Name')} <span className="text-red-600">*</span></label>
            <Input 
              value={companyData.companyName} 
              onChange={(e) => handleChange('companyName', e.target.value)} 
              disabled={!isEditing} 
              required 
              error={fieldErrors.companyName}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm sm:text-base font-medium text-gray-700 mb-2">{t('member.businessLicense', 'Business License')} <span className="text-red-600">*</span></label>
            <Input value={companyData.businessNumber} disabled={true} />
            <small className="mt-2 text-xs text-gray-500">{t('performance.companyInfo.profile.businessLicenseHint', '营业执照号不可修改')}</small>
          </div>
          <div className="flex flex-col">
            <label className="text-sm sm:text-base font-medium text-gray-700 mb-2">{t('member.corporationNumber', 'Corporation Number')}</label>
            <Input 
              value={companyData.corporationNumber} 
              onChange={(e) => handleChange('corporationNumber', e.target.value)} 
              disabled={!isEditing}
              error={fieldErrors.corporationNumber}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm sm:text-base font-medium text-gray-700 mb-2">
              {t('member.establishedDate', 'Established Date')} <span className="text-red-600">*</span>
            </label>
            <Input 
              type="date" 
              value={companyData.establishedDate} 
              onChange={(e) => handleChange('establishedDate', e.target.value)} 
              disabled={!isEditing} 
              required
              error={fieldErrors.establishedDate}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm sm:text-base font-medium text-gray-700 mb-2">
              {t('member.representativeName', 'Representative')} <span className="text-red-600">*</span>
            </label>
            <Input 
              value={companyData.representativeName} 
              onChange={(e) => handleChange('representativeName', e.target.value)} 
              disabled={!isEditing} 
              required
              error={fieldErrors.representativeName}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm sm:text-base font-medium text-gray-700 mb-2">
              {t('member.phone', 'Phone')} <span className="text-red-600">*</span>
            </label>
            <Input 
              type="tel" 
              value={companyData.phone} 
              onChange={(e) => handleChange('phone', e.target.value)} 
              disabled={!isEditing} 
              required
              error={fieldErrors.phone}
            />
          </div>
          </div>
        </div>
      </Card>

      {/* Address Info */}
      <Card className="mb-6 sm:mb-8 shadow-sm hover:shadow-md transition-all p-0">
        <div className="flex items-center gap-3 sm:gap-4 border-b border-gray-200 p-6 sm:p-8 lg:p-10 pb-4 sm:pb-5 lg:pb-6">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 m-0">{t('performance.companyInfo.sections.addressInfo', '地址信息')}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 p-6 sm:p-8 lg:p-10">
          <div className="flex flex-col col-span-1 sm:col-span-2">
            <label className="text-sm sm:text-base font-medium text-gray-700 mb-2">
              {t('member.address', 'Address')} <span className="text-red-600">*</span>
            </label>
            <Input 
              value={companyData.address} 
              onChange={(e) => handleChange('address', e.target.value)} 
              disabled={!isEditing} 
              required
              error={fieldErrors.address}
            />
          </div>
          <Select label={t('member.region', 'Region')} value={companyData.region} onChange={(e) => handleChange('region', e.target.value)} options={regionOptions} disabled={!isEditing} required placeholder={null} />
        </div>
      </Card>

      {/* Business Info */}
      <Card className="mb-6 sm:mb-8 shadow-sm hover:shadow-md transition-all p-0">
        <div className="flex items-center gap-3 sm:gap-4 border-b border-gray-200 p-6 sm:p-8 lg:p-10 pb-4 sm:pb-5 lg:pb-6">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 m-0">{t('performance.companyInfo.sections.businessInfo', '业务信息')}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 p-6 sm:p-8 lg:p-10">
          <Select label={t('member.category', 'Category')} value={companyData.category} onChange={(e) => handleChange('category', e.target.value)} options={categoryOptions} disabled={!isEditing} required placeholder={null} />
          <Select label={t('member.industry', 'Industry')} value={companyData.industry} onChange={(e) => handleChange('industry', e.target.value)} options={industryOptions} disabled={!isEditing} required placeholder={null} />
          <div className="flex flex-col">
            <label className="text-sm sm:text-base font-medium text-gray-700 mb-2">{t('member.businessField', 'Business Field')}</label>
            <Select value={companyData.businessField} onChange={(e) => handleChange('businessField', e.target.value)} options={categoryOptions} disabled={!isEditing} placeholder={null} />
          </div>
          <div className="flex flex-col">
            <label className="text-sm sm:text-base font-medium text-gray-700 mb-2">
              {t('member.sales', 'Sales')}
            </label>
            <Input type="text" value={companyData.sales} onChange={(e) => handleChange('sales', e.target.value)} disabled={!isEditing} placeholder="0" />
          </div>
          <div className="flex flex-col">
            <label className="text-sm sm:text-base font-medium text-gray-700 mb-2">
              {t('member.employeeCount', 'Employees')}
            </label>
            <Input type="text" value={companyData.employeeCount} onChange={(e) => handleChange('employeeCount', e.target.value)} disabled={!isEditing} placeholder="0" />
          </div>
          <div className="flex flex-col col-span-1 sm:col-span-2">
            <label className="text-sm sm:text-base font-medium text-gray-700 mb-2">
              {t('member.website', 'Website')}
            </label>
            <Input 
              type="url" 
              value={companyData.website} 
              onChange={(e) => handleChange('website', e.target.value)} 
              disabled={!isEditing} 
              placeholder="https://example.com"
              error={fieldErrors.website}
            />
          </div>
          <div className="flex flex-col col-span-1 sm:col-span-2">
            <label className="text-sm sm:text-base font-medium text-gray-700 mb-2">{t('member.mainBusiness', 'Main Business')}</label>
            <Textarea value={companyData.mainBusiness} onChange={(e) => handleChange('mainBusiness', e.target.value)} disabled={!isEditing} rows={4} />
          </div>
          <div className="flex flex-col col-span-1 sm:col-span-2">
            <label className="text-sm sm:text-base font-medium text-gray-700 mb-2">{t('member.description', 'Description')}</label>
            <Textarea value={companyData.description} onChange={(e) => handleChange('description', e.target.value)} disabled={!isEditing} rows={5} maxLength={500} />
            <small className="mt-2 text-xs text-gray-500">{companyData.description.length}/500</small>
          </div>
          {isEditing && (
            <div className="flex flex-col col-span-1 sm:col-span-2">
              <label className="text-sm sm:text-base font-medium text-gray-700 mb-2">{t('member.cooperationFields', 'Cooperation Fields')}</label>
              <div className="flex flex-col gap-3 mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                {cooperationFieldOptions.map(option => (
                  <label key={option.value} className="flex items-center gap-3 cursor-pointer p-2 rounded-md hover:bg-white transition-colors">
                    <input 
                      type="checkbox" 
                      checked={companyData.cooperationFields.includes(option.value)} 
                      onChange={(e) => handleCooperationFieldChange(option.value, e.target.checked)} 
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded" 
                    />
                    <span className="text-sm text-gray-700">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          {!isEditing && companyData.cooperationFields?.length > 0 && (
            <div className="flex flex-col col-span-1 sm:col-span-2">
              <label className="text-sm sm:text-base font-medium text-gray-700 mb-2">{t('member.cooperationFields', 'Cooperation Fields')}</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {companyData.cooperationFields.map((field, index) => {
                  const fieldOption = cooperationFieldOptions.find(opt => opt.value === field);
                  return (
                    <span key={index} className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md">
                      {fieldOption ? fieldOption.label : field}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Card>

    </div>
  );
}
