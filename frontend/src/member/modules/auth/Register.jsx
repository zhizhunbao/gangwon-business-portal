/**
 * Register Page - Member Portal
 * Multi-step Registration Form
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@shared/hooks';
import { LanguageSwitcher, AddressSearch, TermsModal, TERM_TYPES } from '@shared/components';
import { EyeIcon, EyeOffIcon } from '@shared/components/Icons';
import { 
  formatBusinessLicense, 
  formatCorporationNumber, 
  formatPhoneNumber,
  formatNumber,
  parseFormattedNumber
} from '@shared/utils/format';
import { validateImageFile, validateFile, ALLOWED_FILE_TYPES } from '@shared/utils/fileValidation';
import './Auth.css';

export default function Register() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { register, isLoading } = useAuth();
  
  // 根据当前语言获取地区选项值
  const getRegionValue = (isGangwon) => {
    const isKorean = i18n.language === 'ko';
    if (isGangwon) {
      return isKorean ? '강원특별자치도' : '江原特别自治道';
    } else {
      return isKorean ? '강원 이외' : '江原以外';
    }
  };
  
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;
  
  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    businessNumber: '',
    password: '',
    passwordConfirm: '',
    companyName: '',
    region: '',
    category: '',
    
    // Step 2: Company Info
    corporationNumber: '',
    address: '',
    addressDetail: '',
    representativeName: '',
    establishedDate: '',
    logo: null,
    businessLicenseFile: null,
    
    // Step 3: Contact Info
    email: '',
    phone: '',
    representativePhone: '',
    contactPersonName: '',
    contactPersonDepartment: '',
    contactPersonPosition: '',
    
    // Step 4: Business Info
    businessField: '',
    sales: '',
    employeeCount: '',
    websiteUrl: '',
    mainBusiness: '',
    cooperationFields: [],
    
    // Step 5: Terms
    agreeAll: false,
    termsOfService: false,
    privacyPolicy: false,
    thirdPartySharing: false,
    marketingConsent: false
  });
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [fileErrors, setFileErrors] = useState({});
  
  // Terms modal
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [currentTermType, setCurrentTermType] = useState(null);
  
  const handleAddressSelect = (address, zonecode) => {
    setFormData(prev => ({
      ...prev,
      address: address
    }));
  };
  
  const handleViewTerms = (termType) => {
    setCurrentTermType(termType);
    setTermsModalOpen(true);
  };
  
  const handleCloseTermsModal = () => {
    setTermsModalOpen(false);
    setCurrentTermType(null);
  };
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      if (name === 'agreeAll') {
        setFormData(prev => ({
          ...prev,
          agreeAll: checked,
          termsOfService: checked,
          privacyPolicy: checked,
          thirdPartySharing: checked,
          marketingConsent: checked
        }));
      } else if (name === 'cooperationFields') {
        const fields = formData.cooperationFields || [];
        if (checked) {
          setFormData(prev => ({
            ...prev,
            cooperationFields: [...fields, value]
          }));
        } else {
          setFormData(prev => ({
            ...prev,
            cooperationFields: fields.filter(f => f !== value)
          }));
        }
      } else {
        setFormData(prev => ({
          ...prev,
          [name]: checked
        }));
      }
    } else if (name === 'sales' || name === 'employeeCount') {
      // Format numbers with commas
      const numValue = parseFormattedNumber(value);
      if (!isNaN(numValue) || value === '') {
        setFormData(prev => ({
          ...prev,
          [name]: value === '' ? '' : formatNumber(numValue)
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  const handleBusinessNumberChange = (e) => {
    const value = e.target.value;
    const formatted = formatBusinessLicense(value);
    setFormData(prev => ({
      ...prev,
      businessNumber: formatted
    }));
  };
  
  const handleCorporationNumberChange = (e) => {
    const value = e.target.value;
    const formatted = formatCorporationNumber(value);
    setFormData(prev => ({
      ...prev,
      corporationNumber: formatted
    }));
  };
  
  const handlePhoneChange = (e) => {
    const value = e.target.value;
    const formatted = formatPhoneNumber(value);
    setFormData(prev => ({
      ...prev,
      [e.target.name]: formatted
    }));
  };
  
  const handleFileChange = (e, fieldName, acceptImagesOnly = false) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file using utility functions
    let validation;
    if (acceptImagesOnly) {
      // For logo: validate as image
      validation = validateImageFile(file);
    } else {
      // For business license: validate as any allowed file type
      validation = validateFile(file, {
        allowedTypes: ALLOWED_FILE_TYPES.all
      });
    }
    
    if (!validation.valid) {
      setFileErrors(prev => ({
        ...prev,
        [fieldName]: validation.error || t('auth.fileUploadError', '文件上传失败')
      }));
      // Clear file input
      e.target.value = '';
      return;
    }
    
    // Clear any previous errors
    setFileErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
    
    // Set file in form data
    setFormData(prev => ({
      ...prev,
      [fieldName]: file
    }));
  };
  
  const removeFile = (fieldName) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: null
    }));
    setFileErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  };
  
  const validateStep = (step) => {
    setError('');
    
    switch (step) {
      case 1:
        if (!formData.businessNumber || formData.businessNumber.replace(/\D/g, '').length !== 10) {
          setError(t('validation.required', { field: t('auth.businessLicense') }));
          return false;
        }
        if (!formData.password || formData.password.length < 8) {
          setError(t('validation.passwordMinLength'));
          return false;
        }
        if (formData.password !== formData.passwordConfirm) {
          setError(t('validation.passwordMismatch'));
          return false;
        }
        if (!formData.companyName) {
          setError(t('validation.required', { field: t('member.companyName') }));
          return false;
        }
        if (!formData.region) {
          setError(t('validation.required', { field: t('member.region') }));
          return false;
        }
        if (!formData.category) {
          setError(t('validation.required', { field: t('member.category') }));
          return false;
        }
        return true;
        
      case 2:
        if (!formData.corporationNumber || formData.corporationNumber.replace(/\D/g, '').length !== 13) {
          setError(t('validation.required', { field: t('member.corporationNumber') }));
          return false;
        }
        if (!formData.address) {
          setError(t('validation.required', { field: t('member.address') }));
          return false;
        }
        if (!formData.representativeName) {
          setError(t('validation.required', { field: t('member.representativeName') }));
          return false;
        }
        if (!formData.establishedDate) {
          setError(t('validation.required', { field: t('member.establishedDate') }));
          return false;
        }
        return true;
        
      case 3:
        if (!formData.email) {
          setError(t('validation.required', { field: t('auth.email') }));
          return false;
        }
        if (!formData.phone) {
          setError(t('validation.required', { field: t('member.phone') }));
          return false;
        }
        if (!formData.contactPersonName) {
          setError(t('validation.required', { field: t('member.contactPersonName') }));
          return false;
        }
        return true;
        
      case 4:
        if (!formData.businessField) {
          setError(t('validation.required', { field: t('member.businessField') }));
          return false;
        }
        return true;
        
      case 5:
        if (!formData.termsOfService || !formData.privacyPolicy || !formData.thirdPartySharing) {
          setError(t('auth.termsRequired'));
          return false;
        }
        return true;
        
      default:
        return true;
    }
  };
  
  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };
  
  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!validateStep(5)) {
      return;
    }
    
    try {
      // Prepare form data for submission
      const submitData = new FormData();
      
      // Add all form fields
      Object.keys(formData).forEach(key => {
        if (key === 'logo' || key === 'businessLicenseFile') {
          if (formData[key]) {
            submitData.append(key, formData[key]);
          }
        } else if (key === 'cooperationFields') {
          formData.cooperationFields.forEach(field => {
            submitData.append('cooperationFields[]', field);
          });
        } else if (key === 'sales' || key === 'employeeCount') {
          submitData.append(key, parseFormattedNumber(formData[key]) || 0);
        } else if (!key.startsWith('agree') && key !== 'passwordConfirm') {
          submitData.append(key, formData[key]);
        }
      });
      
      // Convert businessNumber (camelCase) to business_number (snake_case) for backend API
      submitData.set('business_number', formData.businessNumber?.replace(/-/g, '') || '');
      
      // Call register - it will handle file uploads and field mapping
      const response = await register(submitData);
      
      // Show success message
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      // Handle error response
      const errorMessage = err.message || err.detail || err.response?.data?.detail || err.response?.data?.message || t('auth.registerFailed');
      setError(errorMessage);
    }
  };
  
  if (success) {
    return (
      <div className="auth-success-container">
        <div className="auth-language-switcher">
          <LanguageSwitcher />
        </div>
        <div className="auth-success-card">
          <div className="auth-alert auth-alert-success">
            <strong>{t('auth.registerSuccess')}</strong>
            <p style={{ marginTop: '8px', marginBottom: 0 }}>
              {t('auth.redirectingToLogin')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-language-switcher">
        <LanguageSwitcher />
      </div>
      
      <div className="auth-card auth-card-large">
        <div className="auth-brand">
          <h2 className="auth-app-name">{t('common.appName')}</h2>
        </div>
        
        {/* Progress Steps */}
        <div className="auth-steps">
          {[1, 2, 3, 4, 5].map(step => (
            <div key={step} className={`auth-step ${step === currentStep ? 'active' : step < currentStep ? 'completed' : ''}`}>
              <div className="auth-step-number">{step}</div>
              <div className="auth-step-label">{t(`auth.registerStep${step}`)}</div>
            </div>
          ))}
        </div>
        
        {error && (
          <div className="auth-alert auth-alert-error">
            {error}
          </div>
        )}
        
        <form onSubmit={currentStep === 5 ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }} className="auth-form">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="auth-step-content">
              <div className="auth-form-group">
                <label htmlFor="businessNumber">
                  {t('auth.businessLicense')} <span className="required">*</span>
                </label>
                <input
                  id="businessNumber"
                  name="businessNumber"
                  type="text"
                  className="auth-input"
                  value={formData.businessNumber}
                  onChange={handleBusinessNumberChange}
                  required
                  maxLength={12}
                  placeholder={t('auth.businessLicensePlaceholder')}
                />
                <span className="auth-help-text">
                  {t('auth.businessLicenseHelp')}
                </span>
              </div>
              
              <div className="auth-form-group">
                <label htmlFor="password">
                  {t('auth.password')} <span className="required">*</span>
                </label>
                <div className="auth-password-input-wrapper">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    className="auth-input"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                  >
                    {showPassword ? (
                      <EyeOffIcon className="w-5 h-5" />
                    ) : (
                      <EyeIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
                <span className="auth-help-text">
                  {t('auth.passwordHelp')}
                </span>
              </div>
              
              <div className="auth-form-group">
                <label htmlFor="passwordConfirm">
                  {t('auth.passwordConfirm')} <span className="required">*</span>
                </label>
                <div className="auth-password-input-wrapper">
                  <input
                    id="passwordConfirm"
                    name="passwordConfirm"
                    type={showPasswordConfirm ? 'text' : 'password'}
                    className="auth-input"
                    value={formData.passwordConfirm}
                    onChange={handleChange}
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                    aria-label={showPasswordConfirm ? t('auth.hidePassword') : t('auth.showPassword')}
                  >
                    {showPasswordConfirm ? (
                      <EyeOffIcon className="w-5 h-5" />
                    ) : (
                      <EyeIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
              
              <div className="auth-form-group">
                <label htmlFor="companyName">
                  {t('member.companyName')} <span className="required">*</span>
                </label>
                <input
                  id="companyName"
                  name="companyName"
                  type="text"
                  className="auth-input"
                  value={formData.companyName}
                  onChange={handleChange}
                  required
                  autoComplete="organization"
                />
              </div>
              
              <div className="auth-form-group">
                <label>
                  {t('member.region')} <span className="required">*</span>
                </label>
                <div className="auth-radio-group">
                  <label className="auth-radio-label">
                    <input
                      type="radio"
                      name="region"
                      value={getRegionValue(true)}
                      checked={formData.region === getRegionValue(true)}
                      onChange={handleChange}
                      required
                    />
                    <span>{t('member.regionGangwon')}</span>
                  </label>
                  <label className="auth-radio-label">
                    <input
                      type="radio"
                      name="region"
                      value={getRegionValue(false)}
                      checked={formData.region === getRegionValue(false)}
                      onChange={handleChange}
                      required
                    />
                    <span>{t('member.regionOther')}</span>
                  </label>
                </div>
              </div>
              
              <div className="auth-form-group">
                <label>
                  {t('member.category')} <span className="required">*</span>
                </label>
                <div className="auth-radio-group">
                  <label className="auth-radio-label">
                    <input
                      type="radio"
                      name="category"
                      value="pre"
                      checked={formData.category === 'pre'}
                      onChange={handleChange}
                      required
                    />
                    <span>{t('member.categoryPre')}</span>
                  </label>
                  <label className="auth-radio-label">
                    <input
                      type="radio"
                      name="category"
                      value="startup"
                      checked={formData.category === 'startup'}
                      onChange={handleChange}
                      required
                    />
                    <span>{t('member.categoryStartup')}</span>
                  </label>
                </div>
              </div>
            </div>
          )}
          
          {/* Step 2: Company Info */}
          {currentStep === 2 && (
            <div className="auth-step-content">
              <div className="auth-form-group">
                <label htmlFor="corporationNumber">
                  {t('member.corporationNumber')} <span className="required">*</span>
                </label>
                <input
                  id="corporationNumber"
                  name="corporationNumber"
                  type="text"
                  className="auth-input"
                  value={formData.corporationNumber}
                  onChange={handleCorporationNumberChange}
                  required
                  maxLength={14}
                  placeholder="000000-0000000"
                />
              </div>
              
              <div className="auth-form-group">
                <label htmlFor="address">
                  {t('member.address')} <span className="required">*</span>
                </label>
                <AddressSearch
                  value={formData.address}
                  onSelect={handleAddressSelect}
                  disabled={isLoading}
                />
              </div>
              
              <div className="auth-form-group">
                <label htmlFor="addressDetail">
                  {t('member.addressDetail')}
                </label>
                <input
                  id="addressDetail"
                  name="addressDetail"
                  type="text"
                  className="auth-input"
                  value={formData.addressDetail}
                  onChange={handleChange}
                />
              </div>
              
              <div className="auth-form-group">
                <label htmlFor="representativeName">
                  {t('member.representativeName')} <span className="required">*</span>
                </label>
                <input
                  id="representativeName"
                  name="representativeName"
                  type="text"
                  className="auth-input"
                  value={formData.representativeName}
                  onChange={handleChange}
                  required
                  autoComplete="name"
                />
              </div>
              
              <div className="auth-form-group">
                <label htmlFor="establishedDate">
                  {t('member.establishedDate')} <span className="required">*</span>
                </label>
                <input
                  id="establishedDate"
                  name="establishedDate"
                  type="date"
                  className="auth-input"
                  value={formData.establishedDate}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="auth-form-group">
                <label htmlFor="logo">
                  {t('member.logoUpload')}
                </label>
                <div className="auth-file-upload">
                  <input
                    id="logo"
                    name="logo"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'logo', true)}
                    className="auth-file-input"
                  />
                  {formData.logo && (
                    <div className="auth-file-info">
                      <span>{formData.logo.name}</span>
                      <button
                        type="button"
                        className="auth-file-remove"
                        onClick={() => removeFile('logo')}
                      >
                        {t('auth.removeFile')}
                      </button>
                    </div>
                  )}
                  {fileErrors.logo && (
                    <span className="auth-error-text">{fileErrors.logo}</span>
                  )}
                </div>
              </div>
              
              <div className="auth-form-group">
                <label htmlFor="businessLicenseFile">
                  {t('member.businessLicenseFile')}
                </label>
                <div className="auth-file-upload">
                  <input
                    id="businessLicenseFile"
                    name="businessLicenseFile"
                    type="file"
                    onChange={(e) => handleFileChange(e, 'businessLicenseFile', false)}
                    className="auth-file-input"
                  />
                  {formData.businessLicenseFile && (
                    <div className="auth-file-info">
                      <span>{formData.businessLicenseFile.name}</span>
                      <button
                        type="button"
                        className="auth-file-remove"
                        onClick={() => removeFile('businessLicenseFile')}
                      >
                        {t('auth.removeFile')}
                      </button>
                    </div>
                  )}
                  {fileErrors.businessLicenseFile && (
                    <span className="auth-error-text">{fileErrors.businessLicenseFile}</span>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Step 3: Contact Info */}
          {currentStep === 3 && (
            <div className="auth-step-content">
              <div className="auth-form-group">
                <label htmlFor="email">
                  {t('auth.email')} <span className="required">*</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className="auth-input"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  autoComplete="email"
                  placeholder={t('auth.emailPlaceholder')}
                />
              </div>
              
              <div className="auth-form-group">
                <label htmlFor="phone">
                  {t('member.phone')} <span className="required">*</span>
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  className="auth-input"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  required
                  autoComplete="tel"
                />
              </div>
              
              <div className="auth-form-group">
                <label htmlFor="representativePhone">
                  {t('member.representativePhone')}
                </label>
                <input
                  id="representativePhone"
                  name="representativePhone"
                  type="tel"
                  className="auth-input"
                  value={formData.representativePhone}
                  onChange={handlePhoneChange}
                  autoComplete="tel"
                />
              </div>
              
              <div className="auth-form-group">
                <label htmlFor="contactPersonName">
                  {t('member.contactPersonName')} <span className="required">*</span>
                </label>
                <input
                  id="contactPersonName"
                  name="contactPersonName"
                  type="text"
                  className="auth-input"
                  value={formData.contactPersonName}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="auth-form-group">
                <label htmlFor="contactPersonDepartment">
                  {t('member.contactPersonDepartment')}
                </label>
                <input
                  id="contactPersonDepartment"
                  name="contactPersonDepartment"
                  type="text"
                  className="auth-input"
                  value={formData.contactPersonDepartment}
                  onChange={handleChange}
                />
              </div>
              
              <div className="auth-form-group">
                <label htmlFor="contactPersonPosition">
                  {t('member.contactPersonPosition')}
                </label>
                <input
                  id="contactPersonPosition"
                  name="contactPersonPosition"
                  type="text"
                  className="auth-input"
                  value={formData.contactPersonPosition}
                  onChange={handleChange}
                />
              </div>
            </div>
          )}
          
          {/* Step 4: Business Info */}
          {currentStep === 4 && (
            <div className="auth-step-content">
              <div className="auth-form-group">
                <label htmlFor="businessField">
                  {t('member.businessField')} <span className="required">*</span>
                </label>
                <input
                  id="businessField"
                  name="businessField"
                  type="text"
                  className="auth-input"
                  value={formData.businessField}
                  onChange={handleChange}
                  placeholder={t('member.businessField')}
                />
              </div>
              
              <div className="auth-form-group">
                <label htmlFor="sales">
                  {t('member.sales')}
                </label>
                <input
                  id="sales"
                  name="sales"
                  type="text"
                  className="auth-input"
                  value={formData.sales}
                  onChange={handleChange}
                  placeholder="0"
                />
              </div>
              
              <div className="auth-form-group">
                <label htmlFor="employeeCount">
                  {t('member.employeeCount')}
                </label>
                <input
                  id="employeeCount"
                  name="employeeCount"
                  type="text"
                  className="auth-input"
                  value={formData.employeeCount}
                  onChange={handleChange}
                  placeholder="0"
                />
              </div>
              
              <div className="auth-form-group">
                <label htmlFor="websiteUrl">
                  {t('member.websiteUrl')}
                </label>
                <input
                  id="websiteUrl"
                  name="websiteUrl"
                  type="url"
                  className="auth-input"
                  value={formData.websiteUrl}
                  onChange={handleChange}
                  placeholder="https://example.com"
                />
              </div>
              
              <div className="auth-form-group">
                <label htmlFor="mainBusiness">
                  {t('member.mainBusiness')}
                </label>
                <textarea
                  id="mainBusiness"
                  name="mainBusiness"
                  className="auth-textarea"
                  value={formData.mainBusiness}
                  onChange={handleChange}
                  rows={4}
                />
              </div>
              
              <div className="auth-form-group">
                <label htmlFor="cooperationFields">
                  {t('member.cooperationFields')}
                </label>
                <input
                  id="cooperationFields"
                  name="cooperationFields"
                  type="text"
                  className="auth-input"
                  value={formData.cooperationFields.join(', ')}
                  onChange={(e) => {
                    const values = e.target.value.split(',').map(v => v.trim()).filter(v => v);
                    setFormData(prev => ({ ...prev, cooperationFields: values }));
                  }}
                  placeholder={t('member.cooperationFields')}
                />
                <small className="auth-hint">{t('common.commaSeparatedHint') || '多个值请用逗号分隔'}</small>
              </div>
            </div>
          )}
          
          {/* Step 5: Terms */}
          {currentStep === 5 && (
            <div className="auth-step-content">
              <div className="auth-form-group">
                <label className="auth-checkbox-label">
                  <input
                    type="checkbox"
                    name="agreeAll"
                    checked={formData.agreeAll}
                    onChange={handleChange}
                  />
                  <span><strong>{t('auth.agreeAll')}</strong></span>
                </label>
              </div>
              
              <div className="auth-terms-list">
                <div className="auth-form-group">
                  <label className="auth-checkbox-label">
                    <input
                      type="checkbox"
                      name="termsOfService"
                      checked={formData.termsOfService}
                      onChange={handleChange}
                      required
                    />
                    <span>
                      <span className="auth-terms-label">{t('auth.termsRequiredLabel')}</span>
                      {t('auth.termsOfService')}
                    </span>
                    <button
                      type="button"
                      className="auth-terms-view"
                      onClick={() => handleViewTerms(TERM_TYPES.TERMS_OF_SERVICE)}
                    >
                      {t('auth.viewTerms')}
                    </button>
                  </label>
                </div>
                
                <div className="auth-form-group">
                  <label className="auth-checkbox-label">
                    <input
                      type="checkbox"
                      name="privacyPolicy"
                      checked={formData.privacyPolicy}
                      onChange={handleChange}
                      required
                    />
                    <span>
                      <span className="auth-terms-label">{t('auth.termsRequiredLabel')}</span>
                      {t('auth.privacyPolicy')}
                    </span>
                    <button
                      type="button"
                      className="auth-terms-view"
                      onClick={() => handleViewTerms(TERM_TYPES.PRIVACY_POLICY)}
                    >
                      {t('auth.viewTerms')}
                    </button>
                  </label>
                </div>
                
                <div className="auth-form-group">
                  <label className="auth-checkbox-label">
                    <input
                      type="checkbox"
                      name="thirdPartySharing"
                      checked={formData.thirdPartySharing}
                      onChange={handleChange}
                      required
                    />
                    <span>
                      <span className="auth-terms-label">{t('auth.termsRequiredLabel')}</span>
                      {t('auth.thirdPartySharing')}
                    </span>
                    <button
                      type="button"
                      className="auth-terms-view"
                      onClick={() => handleViewTerms(TERM_TYPES.THIRD_PARTY_SHARING)}
                    >
                      {t('auth.viewTerms')}
                    </button>
                  </label>
                </div>
                
                <div className="auth-form-group">
                  <label className="auth-checkbox-label">
                    <input
                      type="checkbox"
                      name="marketingConsent"
                      checked={formData.marketingConsent}
                      onChange={handleChange}
                    />
                    <span>
                      <span className="auth-terms-label">{t('auth.termsOptionalLabel')}</span>
                      {t('auth.marketingConsent')}
                    </span>
                    <button
                      type="button"
                      className="auth-terms-view"
                      onClick={() => handleViewTerms(TERM_TYPES.MARKETING_CONSENT)}
                    >
                      {t('auth.viewTerms')}
                    </button>
                  </label>
                </div>
              </div>
            </div>
          )}
          
          {/* Navigation Buttons */}
          <div className="auth-form-actions">
            {currentStep > 1 && (
              <button
                type="button"
                className="auth-button auth-button-secondary"
                onClick={handlePrevious}
                disabled={isLoading}
              >
                {t('auth.previousStep')}
              </button>
            )}
            {currentStep < totalSteps ? (
              <button
                type="submit"
                className="auth-button auth-button-primary"
                disabled={isLoading}
              >
                {t('auth.nextStep')}
              </button>
            ) : (
              <button
                type="submit"
                className={`auth-button auth-button-primary ${isLoading ? 'auth-button-loading' : ''}`}
                disabled={isLoading}
              >
                {!isLoading && t('common.register')}
              </button>
            )}
          </div>
        </form>
        
        <div className="auth-footer">
          {t('auth.hasAccount')}{' '}
          <Link to="/login" className="auth-link">
            {t('common.login')}
          </Link>
          .
        </div>
      </div>
      
      {/* Terms Modal */}
      <TermsModal
        isOpen={termsModalOpen}
        termType={currentTermType}
        onClose={handleCloseTermsModal}
      />
    </div>
  );
}
