/**
 * Performance Company Info - Member Portal
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
import { memberService, loggerService, exceptionService } from '@shared/services';
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

export default function PerformanceCompanyInfo() {
  const { t, i18n } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logoError, setLogoError] = useState('');
  const [companyData, setCompanyData] = useState({
    companyName: '', businessNumber: '', corporationNumber: '', establishedDate: '',
    representativeName: '', phone: '', address: '', region: '', category: '', industry: '',
    description: '', website: '', logo: null, businessField: '', sales: '', employeeCount: '',
    mainBusiness: '', cooperationFields: [], approvalStatus: 'pending'
  });

  useEffect(() => { if (isAuthenticated) loadProfile(); }, [isAuthenticated, i18n.language]);

  const loadProfile = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const profile = await memberService.getProfile();
      if (profile) {
        setCompanyData({
          companyName: profile.companyName || '', businessNumber: profile.businessNumber || '',
          corporationNumber: profile.corporationNumber || '',
          establishedDate: profile.establishedDate || profile.foundingDate || '',
          representativeName: profile.representativeName || '', phone: profile.phone || '',
          address: profile.address || '', region: profile.region || '', category: profile.category || '',
          industry: profile.industry || '', description: profile.description || '',
          website: profile.website || profile.websiteUrl || '', logo: profile.logo || profile.logoUrl || null,
          businessField: profile.businessField || '',
          sales: profile.sales || profile.revenue ? formatNumber(profile.sales || profile.revenue) : '',
          employeeCount: profile.employeeCount ? formatNumber(profile.employeeCount) : '',
          mainBusiness: profile.mainBusiness || '', cooperationFields: profile.cooperationFields || [],
          approvalStatus: profile.approvalStatus || 'pending'
        });
      }
    } catch (error) {
      loggerService.error('Failed to load profile', { module: 'PerformanceCompanyInfo', function: 'loadProfile', error_message: error.message });
    } finally { setLoading(false); }
  };

  const handleChange = (field, value) => {
    if (field === 'sales' || field === 'employeeCount') {
      const numValue = parseFormattedNumber(value);
      if (!isNaN(numValue) || value === '') {
        setCompanyData(prev => ({ ...prev, [field]: value === '' ? '' : formatNumber(numValue) }));
        return;
      }
    }
    setCompanyData(prev => ({ ...prev, [field]: value }));
  };

  const handleCooperationFieldChange = (field, checked) => {
    const fields = companyData.cooperationFields || [];
    setCompanyData(prev => ({
      ...prev,
      cooperationFields: checked ? [...fields, field] : fields.filter(f => f !== field)
    }));
  };

  const handleSave = async () => {
    try {
      const saveData = {
        companyName: companyData.companyName, email: companyData.email || undefined,
        industry: companyData.industry || undefined,
        revenue: companyData.sales ? parseFormattedNumber(companyData.sales) : undefined,
        employeeCount: companyData.employeeCount ? parseFormattedNumber(companyData.employeeCount) : undefined,
        foundingDate: companyData.establishedDate || undefined, region: companyData.region || undefined,
        address: companyData.address || undefined, website: companyData.website || undefined
      };
      await memberService.updateProfile(saveData);
      setIsEditing(false);
      alert(t('message.saveSuccess', 'Save successful'));
      loadProfile();
    } catch (error) {
      loggerService.error('Failed to save profile', { module: 'PerformanceCompanyInfo', function: 'handleSave', error_message: error.message });
      alert(error.response?.data?.detail || error.message || t('message.saveFailed', 'Save failed'));
    }
  };

  const handleCancel = () => { setIsEditing(false); loadProfile(); };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setLogoError(validation.error || t('profile.logoUploadError', 'Upload failed'));
      e.target.value = '';
      return;
    }
    setLogoError('');
    setCompanyData(prev => ({ ...prev, logo: file }));
  };

  const regionOptions = [
    { value: 'chuncheon', label: t('profile.regions.chuncheon', 'Chuncheon') },
    { value: 'wonju', label: t('profile.regions.wonju', 'Wonju') },
    { value: 'gangneung', label: t('profile.regions.gangneung', 'Gangneung') },
    { value: 'donghae', label: t('profile.regions.donghae', 'Donghae') },
    { value: 'taebaek', label: t('profile.regions.taebaek', 'Taebaek') },
    { value: 'sokcho', label: t('profile.regions.sokcho', 'Sokcho') },
    { value: 'samcheok', label: t('profile.regions.samcheok', 'Samcheok') }
  ];

  const categoryOptions = [
    { value: 'tech', label: t('profile.categories.tech', 'Technology') },
    { value: 'manufacturing', label: t('profile.categories.manufacturing', 'Manufacturing') },
    { value: 'service', label: t('profile.categories.service', 'Service') },
    { value: 'retail', label: t('profile.categories.retail', 'Retail') },
    { value: 'other', label: t('profile.categories.other', 'Other') }
  ];

  const industryOptions = [
    { value: 'software', label: t('profile.industries.software', 'Software') },
    { value: 'hardware', label: t('profile.industries.hardware', 'Hardware') },
    { value: 'biotechnology', label: t('profile.industries.biotechnology', 'Biotechnology') },
    { value: 'healthcare', label: t('profile.industries.healthcare', 'Healthcare') },
    { value: 'education', label: t('profile.industries.education', 'Education') },
    { value: 'finance', label: t('profile.industries.finance', 'Finance') },
    { value: 'other', label: t('profile.industries.other', 'Other') }
  ];

  if (!isAuthenticated) {
    return (
      <div className="performance-company-info w-full max-w-full p-6 pb-8 sm:p-8 sm:pb-10 lg:p-10 lg:pb-12">
        <div className="mb-6 sm:mb-8 lg:mb-10">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 m-0">{t('performance.companyInfo', 'Company Info')}</h1>
        </div>
        <Card>
          <div className="text-center p-12">
            <div className="mb-6 flex justify-center"><UserIcon className="w-16 h-16 text-gray-400" /></div>
            <h2 className="text-2xl font-bold mb-4 text-gray-900">{t('profile.loginRequired', 'Login Required')}</h2>
            <p className="text-gray-500 mb-8">{t('profile.loginRequiredDesc', 'Please login to view company info.')}</p>
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
    <div className="performance-company-info w-full max-w-full p-6 pb-8 sm:p-8 sm:pb-10 lg:p-10 lg:pb-12">
      <div className="mb-6 sm:mb-8 lg:mb-10 flex justify-between items-center gap-4 sm:gap-6">
        <div className="flex-1 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <BuildingIcon className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-blue-600" />
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 m-0">{t('performance.companyInfo', 'Company Info')}</h1>
          </div>
          {loading && <div className="text-sm text-gray-500 flex items-center gap-2"><span className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></span>Loading...</div>}
        </div>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)} variant="primary" className="flex items-center gap-2">
            <EditIcon className="w-4 h-4" />{t('common.edit', 'Edit')}
          </Button>
        ) : (
          <div className="flex gap-3 sm:gap-4 flex-shrink-0">
            <Button onClick={handleSave} variant="primary" className="flex items-center gap-2">
              <CheckCircleIcon className="w-4 h-4" />{t('common.save', 'Save')}
            </Button>
            <Button onClick={handleCancel} variant="secondary">{t('common.cancel', 'Cancel')}</Button>
          </div>
        )}
      </div>

      {/* Basic Info */}
      <Card className="mb-6 sm:mb-8 shadow-sm hover:shadow-md transition-all p-0">
        <div className="flex items-center gap-3 sm:gap-4 border-b border-gray-200 p-6 sm:p-8 lg:p-10 pb-4 sm:pb-5 lg:pb-6">
          <BuildingIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 m-0">{t('profile.sections.basicInfo', 'Basic Info')}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 p-6 sm:p-8 lg:p-10">
          <div className="flex flex-col">
            <label className="text-sm sm:text-base font-medium text-gray-700 mb-2">{t('member.companyName', 'Company Name')} *</label>
            <Input value={companyData.companyName} onChange={(e) => handleChange('companyName', e.target.value)} disabled={!isEditing} required />
          </div>
          <div className="flex flex-col">
            <label className="text-sm sm:text-base font-medium text-gray-700 mb-2">{t('member.businessLicense', 'Business License')} *</label>
            <Input value={companyData.businessNumber} disabled={true} />
            <small className="mt-2 text-xs text-gray-500">{t('profile.businessLicenseHint', 'Cannot be modified')}</small>
          </div>
          <div className="flex flex-col">
            <label className="text-sm sm:text-base font-medium text-gray-700 mb-2">{t('member.corporationNumber', 'Corporation Number')}</label>
            <Input value={companyData.corporationNumber} onChange={(e) => handleChange('corporationNumber', e.target.value)} disabled={!isEditing} />
          </div>
          <div className="flex flex-col">
            <label className="text-sm sm:text-base font-medium text-gray-700 mb-2 flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-gray-500" />{t('member.establishedDate', 'Established Date')} *
            </label>
            <Input type="date" value={companyData.establishedDate} onChange={(e) => handleChange('establishedDate', e.target.value)} disabled={!isEditing} required />
          </div>
          <div className="flex flex-col">
            <label className="text-sm sm:text-base font-medium text-gray-700 mb-2 flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-gray-500" />{t('member.representativeName', 'Representative')} *
            </label>
            <Input value={companyData.representativeName} onChange={(e) => handleChange('representativeName', e.target.value)} disabled={!isEditing} required />
          </div>
          <div className="flex flex-col">
            <label className="text-sm sm:text-base font-medium text-gray-700 mb-2 flex items-center gap-2">
              <PhoneIcon className="w-4 h-4 text-gray-500" />{t('member.phone', 'Phone')} *
            </label>
            <Input type="tel" value={companyData.phone} onChange={(e) => handleChange('phone', e.target.value)} disabled={!isEditing} required />
          </div>
        </div>
      </Card>

      {/* Address Info */}
      <Card className="mb-6 sm:mb-8 shadow-sm hover:shadow-md transition-all p-0">
        <div className="flex items-center gap-3 sm:gap-4 border-b border-gray-200 p-6 sm:p-8 lg:p-10 pb-4 sm:pb-5 lg:pb-6">
          <LocationIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 m-0">{t('profile.sections.addressInfo', 'Address Info')}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 p-6 sm:p-8 lg:p-10">
          <div className="flex flex-col col-span-1 sm:col-span-2">
            <label className="text-sm sm:text-base font-medium text-gray-700 mb-2 flex items-center gap-2">
              <LocationIcon className="w-4 h-4 text-gray-500" />{t('member.address', 'Address')} *
            </label>
            <Input value={companyData.address} onChange={(e) => handleChange('address', e.target.value)} disabled={!isEditing} required />
          </div>
          <Select label={t('member.region', 'Region')} value={companyData.region} onChange={(e) => handleChange('region', e.target.value)} options={regionOptions} disabled={!isEditing} required />
        </div>
      </Card>

      {/* Business Info */}
      <Card className="mb-6 sm:mb-8 shadow-sm hover:shadow-md transition-all p-0">
        <div className="flex items-center gap-3 sm:gap-4 border-b border-gray-200 p-6 sm:p-8 lg:p-10 pb-4 sm:pb-5 lg:pb-6">
          <BriefcaseIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 m-0">{t('profile.sections.businessInfo', 'Business Info')}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 p-6 sm:p-8 lg:p-10">
          <Select label={t('member.category', 'Category')} value={companyData.category} onChange={(e) => handleChange('category', e.target.value)} options={categoryOptions} disabled={!isEditing} required />
          <Select label={t('member.industry', 'Industry')} value={companyData.industry} onChange={(e) => handleChange('industry', e.target.value)} options={industryOptions} disabled={!isEditing} required />
          <div className="flex flex-col">
            <label className="text-sm sm:text-base font-medium text-gray-700 mb-2">{t('member.businessField', 'Business Field')}</label>
            <Select value={companyData.businessField} onChange={(e) => handleChange('businessField', e.target.value)} options={categoryOptions} disabled={!isEditing} />
          </div>
          <div className="flex flex-col">
            <label className="text-sm sm:text-base font-medium text-gray-700 mb-2 flex items-center gap-2">
              <CurrencyDollarIcon className="w-4 h-4 text-gray-500" />{t('member.sales', 'Sales')}
            </label>
            <Input type="text" value={companyData.sales} onChange={(e) => handleChange('sales', e.target.value)} disabled={!isEditing} placeholder="0" />
          </div>
          <div className="flex flex-col">
            <label className="text-sm sm:text-base font-medium text-gray-700 mb-2 flex items-center gap-2">
              <TeamIcon className="w-4 h-4 text-gray-500" />{t('member.employeeCount', 'Employees')}
            </label>
            <Input type="text" value={companyData.employeeCount} onChange={(e) => handleChange('employeeCount', e.target.value)} disabled={!isEditing} placeholder="0" />
          </div>
          <div className="flex flex-col col-span-1 sm:col-span-2">
            <label className="text-sm sm:text-base font-medium text-gray-700 mb-2 flex items-center gap-2">
              <GlobeIcon className="w-4 h-4 text-gray-500" />{t('member.website', 'Website')}
            </label>
            <Input type="url" value={companyData.website} onChange={(e) => handleChange('website', e.target.value)} disabled={!isEditing} placeholder="https://example.com" />
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
                {['field1', 'field2', 'field3'].map(field => (
                  <label key={field} className="flex items-center gap-3 cursor-pointer p-2 rounded-md hover:bg-white transition-colors">
                    <input type="checkbox" checked={companyData.cooperationFields.includes(field)} onChange={(e) => handleCooperationFieldChange(field, e.target.checked)} className="w-4 h-4 text-blue-600 border-gray-300 rounded" />
                    <span className="text-sm text-gray-700">{field}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          {!isEditing && companyData.cooperationFields?.length > 0 && (
            <div className="flex flex-col col-span-1 sm:col-span-2">
              <label className="text-sm sm:text-base font-medium text-gray-700 mb-2">{t('member.cooperationFields', 'Cooperation Fields')}</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {companyData.cooperationFields.map((field, index) => (
                  <span key={index} className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md">{field}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>


      {/* Logo */}
      <Card className="mb-6 sm:mb-8 shadow-sm hover:shadow-md transition-all p-0">
        <div className="flex items-center gap-3 sm:gap-4 border-b border-gray-200 p-6 sm:p-8 lg:p-10 pb-4 sm:pb-5 lg:pb-6">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 m-0">{t('profile.sections.logo', 'Logo')}</h2>
        </div>
        <div className="flex flex-col gap-4 sm:gap-6 items-start p-6 sm:p-8 lg:p-10">
          {companyData.logo ? (
            <div className="w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 border-2 border-gray-200 rounded-lg overflow-hidden flex items-center justify-center bg-gray-50 hover:border-blue-300 hover:shadow-md transition-all">
              <img src={companyData.logo} alt="Company Logo" className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 text-gray-500 text-sm hover:border-blue-400 hover:bg-blue-50 transition-all">
              {t('profile.noLogo', 'No Logo')}
            </div>
          )}
          {isEditing && (
            <div className="flex flex-col gap-2">
              <input type="file" id="logo-upload" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              <Button onClick={() => document.getElementById('logo-upload').click()} variant="secondary">{t('common.upload', 'Upload')}</Button>
              <small className="text-xs text-gray-500">{t('profile.logoHint', 'JPG, PNG, GIF, max 10MB')}</small>
              {logoError && <div className="text-red-500 text-sm mt-2">{logoError}</div>}
            </div>
          )}
        </div>
      </Card>

      {/* Approval Status */}
      <Card className="mb-6 sm:mb-8 shadow-sm hover:shadow-md transition-all p-0 bg-gradient-to-br from-green-50 to-blue-50 border-green-200">
        <div className="flex items-center gap-3 sm:gap-4 border-b border-gray-200 p-6 sm:p-8 lg:p-10 pb-4 sm:pb-5 lg:pb-6">
          <CheckCircleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 m-0">{t('profile.sections.approvalStatus', 'Approval Status')}</h2>
        </div>
        <div className="flex flex-col gap-4 p-6 sm:p-8 lg:p-10">
          {companyData.approvalStatus === 'approved' && (
            <>
              <div className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg w-fit bg-green-100 text-green-800 border border-green-200 shadow-sm">
                <CheckCircleIcon className="w-5 h-5" />{t('member.approved', 'Approved')}
              </div>
              <p className="text-sm text-gray-600 m-0">{t('profile.approvalStatusDesc.approved', 'Your company info has been approved.')}</p>
            </>
          )}
          {companyData.approvalStatus === 'pending' && (
            <>
              <div className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg w-fit bg-yellow-100 text-yellow-800 border border-yellow-200 shadow-sm">
                <WarningIcon className="w-5 h-5" />{t('member.pending', 'Pending')}
              </div>
              <p className="text-sm text-gray-600 m-0">{t('profile.approvalStatusDesc.pending', 'Your company info is under review.')}</p>
            </>
          )}
          {companyData.approvalStatus === 'rejected' && (
            <>
              <div className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg w-fit bg-red-100 text-red-800 border border-red-200 shadow-sm">
                <XIcon className="w-5 h-5" />{t('member.rejected', 'Rejected')}
              </div>
              <p className="text-sm text-gray-600 m-0">{t('profile.approvalStatusDesc.rejected', 'Your company info was rejected. Please modify and resubmit.')}</p>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
