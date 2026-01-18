/**
 * Register Page - Member Portal
 * Multi-step Registration Form - Clean Design
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@shared/hooks';
import { AddressSearch, TermsModal, TERM_TYPES, FileUploadButton } from '@shared/components';
import { EyeIcon, EyeOffIcon } from '@shared/components/Icons';
import { authService } from '@shared/services';
import { 
  formatBusinessLicense, 
  formatCorporationNumber, 
  formatPhoneNumber,
  formatNumber,
  parseFormattedNumber,
  validateImageFile,
  validateFile,
  ALLOWED_FILE_TYPES
} from '@shared/utils';

const STORAGE_KEY = 'register_form_draft';

// 从 localStorage 加载保存的表单数据
const loadSavedFormData = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // 不恢复密码和文件字段
      return {
        ...parsed,
        password: '',
        passwordConfirm: '',
        logo: null,
        businessLicenseFile: null,
        // 不恢复同意条款
        agreeAll: false,
        termsOfService: false,
        privacyPolicy: false,
        thirdPartySharing: false,
        marketingConsent: false
      };
    }
  } catch (e) {
    // AOP 系统会自动记录错误
  }
  return null;
};

// 保存表单数据到 localStorage
const saveFormData = (data) => {
  try {
    // 不保存敏感信息
    const toSave = { ...data };
    delete toSave.password;
    delete toSave.passwordConfirm;
    delete toSave.logo;
    delete toSave.businessLicenseFile;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (e) {
    // AOP 系统会自动记录错误
  }
};

// 清除保存的表单数据
const clearSavedFormData = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    // AOP 系统会自动记录错误
  }
};

export default function Register() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { register } = useAuth();
  
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;
  
  const defaultFormData = {
    businessNumber: '', password: '', passwordConfirm: '', companyName: '', region: '', category: '',
    corporationNumber: '', address: '', addressDetail: '', representative: '', establishedDate: '',
    logo: null, businessLicenseFile: null,
    email: '', phone: '', representativePhone: '', contactPersonPhone: '', contactPersonName: '', contactPersonDepartment: '', contactPersonPosition: '',
    startupType: '', ksicMajor: '', ksicSub: '',
    businessField: '', sales: '', employeeCount: '', websiteUrl: '', mainBusiness: '', cooperationFields: [],
    agreeAll: false, termsOfService: false, privacyPolicy: false, thirdPartySharing: false, marketingConsent: false
  };
  
  const [formData, setFormData] = useState(() => {
    const saved = loadSavedFormData();
    return saved ? { ...defaultFormData, ...saved } : defaultFormData;
  });
  
  // 自动保存表单数据
  useEffect(() => {
    const timer = setTimeout(() => {
      saveFormData(formData);
    }, 500); // 防抖 500ms
    return () => clearTimeout(timer);
  }, [formData]);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [fileErrors, setFileErrors] = useState({});
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [currentTermType, setCurrentTermType] = useState(null);
  
  const handleAddressSelect = (address) => setFormData(prev => ({ ...prev, address }));
  const handleViewTerms = (termType) => { setCurrentTermType(termType); setTermsModalOpen(true); };
  const handleCloseTermsModal = () => { setTermsModalOpen(false); setCurrentTermType(null); };
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      if (name === 'agreeAll') {
        setFormData(prev => ({ ...prev, agreeAll: checked, termsOfService: checked, privacyPolicy: checked, thirdPartySharing: checked, marketingConsent: checked }));
      } else {
        setFormData(prev => ({ ...prev, [name]: checked }));
      }
    } else if (name === 'sales' || name === 'employeeCount') {
      const numValue = parseFormattedNumber(value);
      if (!isNaN(numValue) || value === '') {
        setFormData(prev => ({ ...prev, [name]: value === '' ? '' : formatNumber(numValue) }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };
  
  const handleBusinessNumberChange = (e) => setFormData(prev => ({ ...prev, businessNumber: formatBusinessLicense(e.target.value) }));
  const handleCorporationNumberChange = (e) => setFormData(prev => ({ ...prev, corporationNumber: formatCorporationNumber(e.target.value) }));
  
  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData(prev => ({ ...prev, [e.target.name]: formatted }));
  };
  
  const handleFileChange = (e, fieldName, acceptImagesOnly = false) => {
    const file = e.target.files[0];
    if (!file) return;
    const validation = acceptImagesOnly ? validateImageFile(file) : validateFile(file, { allowedTypes: ALLOWED_FILE_TYPES.all });
    if (!validation.valid) {
      setFileErrors(prev => ({ ...prev, [fieldName]: validation.error }));
      e.target.value = '';
      return;
    }
    setFileErrors(prev => { const n = { ...prev }; delete n[fieldName]; return n; });
    setFormData(prev => ({ ...prev, [fieldName]: file }));
  };
  
  const removeFile = (fieldName) => {
    setFormData(prev => ({ ...prev, [fieldName]: null }));
    setFileErrors(prev => { const n = { ...prev }; delete n[fieldName]; return n; });
    const input = document.getElementById(fieldName);
    if (input) input.value = '';
  };
  
  const [isValidating, setIsValidating] = useState(false);
  
  const validateStep = (step) => {
    setError('');
    const checks = {
      1: () => {
        if (!formData.businessNumber || formData.businessNumber.replace(/\D/g, '').length !== 10) return t('validation.required', { field: t('auth.businessLicense') });
        if (!formData.password || formData.password.length < 8) return t('validation.passwordMinLength');
        if (formData.password !== formData.passwordConfirm) return t('validation.passwordMismatch');
        if (!formData.companyName) return t('validation.required', { field: t('member.companyName') });
        if (!formData.region || formData.region === '') return t('validation.required', { field: t('member.region') });
        if (!formData.category || formData.category === '') return t('validation.required', { field: t('member.category') });
        return null;
      },
      2: () => {
        if (!formData.address) return t('validation.required', { field: t('member.address') });
        if (!formData.representative) return t('validation.required', { field: t('member.representative') });
        return null;
      },
      3: () => {
        if (!formData.email) return t('validation.required', { field: t('auth.email') });
        if (!formData.phone) return t('validation.required', { field: t('member.phone') });
        // 验证韩国电话号码格式
        // 手机: 010-xxxx-xxxx, 011-xxx-xxxx, 016-xxx-xxxx, 017-xxx-xxxx, 018-xxx-xxxx, 019-xxx-xxxx
        // 首尔: 02-xxx-xxxx, 02-xxxx-xxxx
        // 其他地区: 0xx-xxx-xxxx, 0xx-xxxx-xxxx
        const phoneRegex = /^(01[0-9]-\d{3,4}-\d{4}|02-\d{3,4}-\d{4}|0[3-9]\d-\d{3,4}-\d{4})$/;
        if (!phoneRegex.test(formData.phone)) return t('validation.invalidPhoneFormat');
        // 如果填写了代表电话，也要验证格式
        if (formData.representativePhone && !phoneRegex.test(formData.representativePhone)) return t('validation.invalidPhoneFormat');
        // 如果填写了负责人电话，也要验证格式
        if (formData.contactPersonPhone && !phoneRegex.test(formData.contactPersonPhone)) return t('validation.invalidPhoneFormat');
        return null;
      },
      4: () => {
        return null;
      },
      5: () => {
        if (!formData.termsOfService || !formData.privacyPolicy || !formData.thirdPartySharing) return t('auth.termsRequired');
        return null;
      }
    };
    const err = checks[step]?.();
    if (err) { setError(err); return false; }
    return true;
  };
  
  const handleNext = async () => {
    if (!validateStep(currentStep)) return;
    
    // 第一步额外检查营业执照号码是否已注册
    if (currentStep === 1) {
      setIsValidating(true);
      try {
        const result = await authService.checkBusinessNumber(formData.businessNumber);
        if (!result.available) {
          setError(t('auth.businessNumberAlreadyRegistered'));
          setIsValidating(false);
          return;
        }
      } catch (err) {
        // 如果检查失败，继续下一步（在最终提交时会再次验证）
        // AOP 系统会自动记录错误
      }
      setIsValidating(false);
    }
    
    // 第三步额外检查邮箱是否已注册
    if (currentStep === 3) {
      setIsValidating(true);
      try {
        const result = await authService.checkEmail(formData.email);
        if (!result.available) {
          setError(t('auth.emailAlreadyRegistered'));
          setIsValidating(false);
          return;
        }
      } catch (err) {
        // AOP 系统会自动记录错误
      }
      setIsValidating(false);
    }
    
    setCurrentStep(prev => Math.min(prev + 1, totalSteps));
  };
  const handlePrevious = () => setCurrentStep(prev => Math.max(prev - 1, 1));
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validateStep(5)) return;
    
    setIsSubmitting(true);
    
    // 定义不需要提交的字段
    const excludeFields = ['passwordConfirm', 'agreeAll', 'termsOfService', 'privacyPolicy', 'thirdPartySharing', 'marketingConsent'];
    
    const submitData = new FormData();
    Object.keys(formData).forEach(key => {
      // 跳过排除的字段
      if (excludeFields.includes(key)) return;
      
      if (key === 'logo' || key === 'businessLicenseFile') {
        if (formData[key]) submitData.append(key, formData[key]);
      } else if (key === 'cooperationFields') {
        formData.cooperationFields.forEach(field => submitData.append('cooperationFields[]', field));
      } else if (key === 'sales' || key === 'employeeCount') {
        submitData.append(key, parseFormattedNumber(formData[key]) || 0);
      } else {
        // 只提交非空的字段
        if (formData[key] !== '' && formData[key] !== null && formData[key] !== undefined) {
          submitData.append(key, formData[key]);
        }
      }
    });
    submitData.set('business_number', formData.businessNumber?.replace(/-/g, '') || '');
    
    try {
      await register(submitData);
      clearSavedFormData();
      setIsSubmitting(false);
      setSuccess(true);
    } catch (err) {
      setIsSubmitting(false);
      
      let message = err?.message || t('auth.registerFailed');
      
      // 检查后端返回的错误信息
      const backendError = err?.response?.data?.error?.message || err?.response?.data?.message;
      if (backendError) {
        message = backendError;
      }
      
      // 转换英文错误消息为国际化消息
      if (message.includes('Business number already registered')) {
        message = t('auth.businessNumberAlreadyRegistered');
        setCurrentStep(1);
      } else if (message.includes('Email already registered')) {
        message = t('auth.emailAlreadyRegistered');
        setCurrentStep(3);
      }
      
      setError(message);
    }
  };

  // 成功弹框关闭 - 跳转到首页
  const handleSuccessClose = () => {
    setSuccess(false);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#f5f6f7] py-12 px-4 sm:px-6">
      <div className="max-w-[640px] w-full mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('common.register')}</h1>
        </div>

        {/* Progress - KRDS Style */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4, 5].map((step, idx) => (
              <div key={step} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors ${
                    step < currentStep ? 'bg-[#0052a4] border-[#0052a4] text-white' : 
                    step === currentStep ? 'bg-[#0052a4] border-[#0052a4] text-white' : 
                    'bg-white border-gray-300 text-gray-400'
                  }`}>
                    {step < currentStep ? '✓' : step}
                  </div>
                  <span className={`mt-2 text-xs text-center whitespace-nowrap ${
                    step === currentStep ? 'text-[#0052a4] font-semibold' : 'text-gray-500'
                  }`}>
                    {t(`auth.registerStep${step}`)}
                  </span>
                </div>
                {idx < 4 && (
                  <div className={`flex-1 h-0.5 mx-2 mt-[-20px] ${step < currentStep ? 'bg-[#0052a4]' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Card - KRDS Style */}
        <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
          )}

          <form onSubmit={currentStep === 5 ? handleSubmit : async (e) => { e.preventDefault(); await handleNext(); }}>
            {/* Step 1 */}
            {currentStep === 1 && (
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.businessLicense')} <span className="text-red-500">*</span></label>
                  <input type="text" value={formData.businessNumber} onChange={handleBusinessNumberChange} maxLength={12} placeholder="000-00-00000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm" />
                  <p className="mt-1 text-xs text-gray-500">{t('auth.businessLicenseHelp')}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.password')} <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} autoComplete="new-password"
                      className="w-full px-3 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{t('auth.passwordHelp')}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.passwordConfirm')} <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input type={showPasswordConfirm ? 'text' : 'password'} name="passwordConfirm" value={formData.passwordConfirm} onChange={handleChange} autoComplete="new-password"
                      className="w-full px-3 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" />
                    <button type="button" onClick={() => setShowPasswordConfirm(!showPasswordConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPasswordConfirm ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('member.companyName')} <span className="text-red-500">*</span></label>
                  <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} autoComplete="organization"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('member.region')} <span className="text-red-500">*</span></label>
                  <select 
                    name="region" 
                    value={formData.region} 
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  >
                    <option value="">{t('member.selectRegion')}</option>
                    <option value={t('profile.regions.chuncheon')}>{t('profile.regions.chuncheon')}</option>
                    <option value={t('profile.regions.wonju')}>{t('profile.regions.wonju')}</option>
                    <option value={t('profile.regions.gangneung')}>{t('profile.regions.gangneung')}</option>
                    <option value={t('profile.regions.donghae')}>{t('profile.regions.donghae')}</option>
                    <option value={t('profile.regions.taebaek')}>{t('profile.regions.taebaek')}</option>
                    <option value={t('profile.regions.sokcho')}>{t('profile.regions.sokcho')}</option>
                    <option value={t('profile.regions.samcheok')}>{t('profile.regions.samcheok')}</option>
                    <option value={t('profile.regions.hongcheon')}>{t('profile.regions.hongcheon')}</option>
                    <option value={t('profile.regions.hoengseong')}>{t('profile.regions.hoengseong')}</option>
                    <option value={t('profile.regions.yeongwol')}>{t('profile.regions.yeongwol')}</option>
                    <option value={t('profile.regions.pyeongchang')}>{t('profile.regions.pyeongchang')}</option>
                    <option value={t('profile.regions.jeongseon')}>{t('profile.regions.jeongseon')}</option>
                    <option value={t('profile.regions.cheorwon')}>{t('profile.regions.cheorwon')}</option>
                    <option value={t('profile.regions.hwacheon')}>{t('profile.regions.hwacheon')}</option>
                    <option value={t('profile.regions.yanggu')}>{t('profile.regions.yanggu')}</option>
                    <option value={t('profile.regions.inje')}>{t('profile.regions.inje')}</option>
                    <option value={t('profile.regions.goseong')}>{t('profile.regions.goseong')}</option>
                    <option value={t('profile.regions.yangyang')}>{t('profile.regions.yangyang')}</option>
                    <option value={t('profile.regions.other')}>{t('profile.regions.other')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('member.category')} <span className="text-red-500">*</span></label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="category" value="individual" checked={formData.category === 'individual'} onChange={handleChange} className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-gray-700">{t('member.categoryIndividual')}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="category" value="corporation" checked={formData.category === 'corporation'} onChange={handleChange} className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-gray-700">{t('member.categoryCorporation')}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="category" value="nonprofit" checked={formData.category === 'nonprofit'} onChange={handleChange} className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-gray-700">{t('member.categoryNonProfit')}</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2 */}
            {currentStep === 2 && (
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('member.corporationNumber')}</label>
                  <input type="text" value={formData.corporationNumber} onChange={handleCorporationNumberChange} maxLength={14} placeholder="000000-0000000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('member.address')} <span className="text-red-500">*</span></label>
                  <AddressSearch value={formData.address} onSelect={handleAddressSelect} disabled={isSubmitting} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('member.addressDetail')}</label>
                  <input type="text" name="addressDetail" value={formData.addressDetail} onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('member.representative')} <span className="text-red-500">*</span></label>
                  <input type="text" name="representative" value={formData.representative} onChange={handleChange} autoComplete="name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('member.establishedDate')}</label>
                  <input 
                    type="date" 
                    name="establishedDate" 
                    value={formData.establishedDate} 
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" 
                  />
                  <p className="mt-1 text-xs text-gray-500">{t('member.establishedDateHelp')}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('member.logoUpload')}</label>
                  <div className="flex items-center gap-3">
                    <FileUploadButton
                      accept="image/*"
                      label={t('common.selectFile', '파일 선택')}
                      onFilesSelected={(files) => {
                        if (files[0]) {
                          const validation = validateImageFile(files[0]);
                          if (!validation.valid) {
                            setFileErrors(prev => ({ ...prev, logo: validation.error }));
                            return;
                          }
                          setFileErrors(prev => { const n = { ...prev }; delete n.logo; return n; });
                          setFormData(prev => ({ ...prev, logo: files[0] }));
                        }
                      }}
                    />
                    {formData.logo && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-600">{formData.logo.name}</span>
                        <button type="button" onClick={() => removeFile('logo')} className="text-red-500 hover:text-red-700">{t('auth.removeFile')}</button>
                      </div>
                    )}
                  </div>
                  {fileErrors.logo && <p className="mt-1 text-xs text-red-500">{fileErrors.logo}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('member.businessLicenseFile')}</label>
                  <div className="flex items-center gap-3">
                    <FileUploadButton
                      label={t('common.selectFile', '파일 선택')}
                      onFilesSelected={(files) => {
                        if (files[0]) {
                          const validation = validateFile(files[0], { allowedTypes: ALLOWED_FILE_TYPES.all });
                          if (!validation.valid) {
                            setFileErrors(prev => ({ ...prev, businessLicenseFile: validation.error }));
                            return;
                          }
                          setFileErrors(prev => { const n = { ...prev }; delete n.businessLicenseFile; return n; });
                          setFormData(prev => ({ ...prev, businessLicenseFile: files[0] }));
                        }
                      }}
                    />
                    {formData.businessLicenseFile && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-600">{formData.businessLicenseFile.name}</span>
                        <button type="button" onClick={() => removeFile('businessLicenseFile')} className="text-red-500 hover:text-red-700">{t('auth.removeFile')}</button>
                      </div>
                    )}
                  </div>
                  {fileErrors.businessLicenseFile && <p className="mt-1 text-xs text-red-500">{fileErrors.businessLicenseFile}</p>}
                </div>
              </div>
            )}


            {/* Step 3 */}
            {currentStep === 3 && (
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.email')} <span className="text-red-500">*</span></label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} autoComplete="email" placeholder={t('auth.emailPlaceholder')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('member.phone')} <span className="text-red-500">*</span></label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handlePhoneChange} autoComplete="tel" placeholder="010-1234-5678"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" />
                  <p className="mt-1 text-xs text-gray-500">{t('member.phoneHelp')}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('member.representativePhone')}</label>
                  <input type="tel" name="representativePhone" value={formData.representativePhone} onChange={handlePhoneChange} autoComplete="tel" placeholder="010-1234-5678"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('member.contactPersonName')}</label>
                  <input type="text" name="contactPersonName" value={formData.contactPersonName} onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('member.contactPersonPhone')}</label>
                  <input type="tel" name="contactPersonPhone" value={formData.contactPersonPhone} onChange={handlePhoneChange} autoComplete="tel" placeholder="010-1234-5678"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('member.contactPersonDepartment')}</label>
                  <input type="text" name="contactPersonDepartment" value={formData.contactPersonDepartment} onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('member.contactPersonPosition')}</label>
                  <input type="text" name="contactPersonPosition" value={formData.contactPersonPosition} onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" />
                </div>
              </div>
            )}

            {/* Step 4 */}
            {currentStep === 4 && (
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('member.startupType')}</label>
                  <select 
                    name="startupType" 
                    value={formData.startupType} 
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  >
                    <option value="">{t('member.selectStartupType')}</option>
                    <option value="preliminary">{t('industryClassification.startupType.preliminary')}</option>
                    <option value="startup_under_3years">{t('industryClassification.startupType.startup_under_3years')}</option>
                    <option value="growth_over_7years">{t('industryClassification.startupType.growth_over_7years')}</option>
                    <option value="restart">{t('industryClassification.startupType.restart')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('member.ksicMajor')}</label>
                  <select 
                    name="ksicMajor" 
                    value={formData.ksicMajor} 
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  >
                    <option value="">{t('member.selectKsicMajor')}</option>
                    {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U'].map(code => (
                      <option key={code} value={code}>{t(`industryClassification.ksicMajor.${code}`)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('member.ksicSub')}</label>
                  <select 
                    name="ksicSub" 
                    value={formData.ksicSub} 
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  >
                    <option value="">{t('member.selectKsicSub')}</option>
                    {['13', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31'].map(code => (
                      <option key={code} value={code}>{t(`industryClassification.ksicSub.${code}`)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('member.businessField')}</label>
                  <select 
                    name="businessField" 
                    value={formData.businessField} 
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  >
                    <option value="">{t('member.selectBusinessField')}</option>
                    <option value="software">{t('profile.industries.software')}</option>
                    <option value="hardware">{t('profile.industries.hardware')}</option>
                    <option value="biotechnology">{t('profile.industries.biotechnology')}</option>
                    <option value="healthcare">{t('profile.industries.healthcare')}</option>
                    <option value="education">{t('profile.industries.education')}</option>
                    <option value="finance">{t('profile.industries.finance')}</option>
                    <option value="other">{t('profile.industries.other')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('member.sales')}</label>
                  <input type="text" name="sales" value={formData.sales} onChange={handleChange} placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('member.employeeCount')}</label>
                  <input type="text" name="employeeCount" value={formData.employeeCount} onChange={handleChange} placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('member.websiteUrl')}</label>
                  <input type="url" name="websiteUrl" value={formData.websiteUrl} onChange={handleChange} placeholder="https://example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('member.mainBusiness')}</label>
                  <textarea name="mainBusiness" value={formData.mainBusiness} onChange={handleChange} rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition resize-none" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('member.cooperationFields')}</label>
                  <input type="text" value={formData.cooperationFields.join(', ')}
                    onChange={(e) => setFormData(prev => ({ ...prev, cooperationFields: e.target.value.split(',').map(v => v.trim()).filter(v => v) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" />
                  <p className="mt-1 text-xs text-gray-500">{t('common.commaSeparatedHint') || '多个值请用逗号分隔'}</p>
                </div>
              </div>
            )}

            {/* Step 5 */}
            {currentStep === 5 && (
              <div className="space-y-5">
                <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition">
                  <input type="checkbox" name="agreeAll" checked={formData.agreeAll} onChange={handleChange} className="w-5 h-5 text-blue-600 rounded" />
                  <span className="font-medium text-gray-900">{t('auth.agreeAll')}</span>
                </label>

                <div className="border-t border-gray-200 pt-4 space-y-4">
                  {[
                    { name: 'termsOfService', type: TERM_TYPES.TERMS_OF_SERVICE, required: true },
                    { name: 'privacyPolicy', type: TERM_TYPES.PRIVACY_POLICY, required: true },
                    { name: 'thirdPartySharing', type: TERM_TYPES.THIRD_PARTY_SHARING, required: true },
                    { name: 'marketingConsent', type: TERM_TYPES.MARKETING_CONSENT, required: false }
                  ].map(({ name, type, required }) => (
                    <div key={name} className="flex items-center justify-between py-2">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" name={name} checked={formData[name]} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
                        <span className="text-sm text-gray-700">
                          <span className={required ? 'text-red-500' : 'text-gray-400'}>{required ? t('auth.termsRequiredLabel') : t('auth.termsOptionalLabel')}</span>
                          {' '}{t(`auth.${name}`)}
                        </span>
                      </label>
                      <button type="button" onClick={() => handleViewTerms(type)} className="text-sm text-blue-600 hover:underline">{t('auth.viewTerms')}</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 mt-8 pt-6 border-t border-gray-200">
              {currentStep > 1 && (
                <button type="button" onClick={handlePrevious} disabled={isSubmitting || isValidating}
                  className="flex-1 px-6 py-3 text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition disabled:opacity-50">
                  {t('auth.previousStep')}
                </button>
              )}
              <button type="submit" disabled={isSubmitting || isValidating}
                className={`flex-1 px-6 py-3 text-white bg-[#0052a4] rounded font-medium hover:bg-[#003d7a] active:bg-[#003366] transition disabled:opacity-50 ${currentStep === 1 ? 'w-full' : ''}`}>
                {(isSubmitting || isValidating) ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  </span>
                ) : currentStep < totalSteps ? t('auth.nextStep') : t('common.register')}
              </button>
            </div>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            {t('auth.hasAccount')}{' '}
            <Link to="/login" className="text-blue-600 hover:underline font-medium">{t('common.login')}</Link>
          </p>
        </div>
      </div>

      <TermsModal isOpen={termsModalOpen} termType={currentTermType} onClose={handleCloseTermsModal} />

      {/* 注册成功弹框 */}
      {success && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center animate-in fade-in zoom-in duration-200">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">{t('auth.registerSuccess')}</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">{t('auth.registerPendingApproval')}</p>
            <button
              onClick={handleSuccessClose}
              className="w-full px-6 py-3 bg-[#0052a4] text-white rounded font-medium hover:bg-[#003d7a] transition"
            >
              {t('common.confirm')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
