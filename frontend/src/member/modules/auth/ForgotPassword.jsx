/**
 * Forgot Password Page - Member Portal
 * 找回密码页面（密码重置请求）
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@shared/components';
import { formatBusinessLicense } from '@shared/utils/format';
import authService from '@shared/services/auth.service';
import './Auth.css';

export default function ForgotPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    businessLicense: '',
    email: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      await authService.forgotPassword({
        businessLicense: formData.businessLicense,
        email: formData.email
      });
      
      setIsSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.message || t('auth.passwordResetFailed', '密码重置请求失败'));
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleBusinessLicenseChange = (e) => {
    const value = e.target.value;
    const formatted = formatBusinessLicense(value);
    setFormData(prev => ({
      ...prev,
      businessLicense: formatted
    }));
  };

  const handleEmailChange = (e) => {
    setFormData(prev => ({
      ...prev,
      email: e.target.value
    }));
  };

  if (isSubmitted) {
    return (
      <div className="auth-container">
        <div className="auth-language-switcher">
          <LanguageSwitcher />
        </div>
        
        <div className="auth-card">
          <div className="auth-brand">
            <h2 className="auth-app-name">{t('common.appName')}</h2>
          </div>
          
          <div className="auth-success-message">
            <p>{t('auth.passwordResetEmailSent', '密码重置邮件已发送，请查收您的邮箱。')}</p>
            <p className="auth-help-text">
              {t('auth.checkEmailInstructions', '请检查您的邮箱并点击重置链接。如果没有收到邮件，请检查垃圾邮件文件夹。')}
            </p>
          </div>
          
          <div className="auth-footer">
            <Link to="/login" className="auth-link">
              {t('common.backToLogin', '返回登录')}
            </Link>
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
      
      <div className="auth-card">
        <div className="auth-brand">
          <h2 className="auth-app-name">{t('common.appName')}</h2>
        </div>
        
        {error && (
          <div className="auth-alert auth-alert-error">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-form-group">
            <label htmlFor="businessLicense">
              {t('auth.businessLicense')}
            </label>
            <input
              id="businessLicense"
              name="businessLicense"
              type="text"
              className="auth-input"
              value={formData.businessLicense}
              onChange={handleBusinessLicenseChange}
              required
              maxLength={12}
              placeholder={t('auth.businessLicensePlaceholder')}
            />
            <span className="auth-help-text">
              {t('auth.businessLicenseHelp')}
            </span>
          </div>
          
          <div className="auth-form-group">
            <label htmlFor="email">
              {t('auth.email')}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className="auth-input"
              value={formData.email}
              onChange={handleEmailChange}
              required
              placeholder={t('auth.emailPlaceholder', '请输入注册邮箱')}
            />
            <span className="auth-help-text">
              {t('auth.forgotPasswordHelp', '我们将向此邮箱发送密码重置链接')}
            </span>
          </div>
          
          <button
            type="submit"
            className={`auth-button auth-button-primary ${isLoading ? 'auth-button-loading' : ''}`}
            disabled={isLoading}
          >
            {!isLoading && t('auth.sendResetLink', '发送重置链接')}
          </button>
        </form>
        
        <div className="auth-footer">
          <Link to="/login" className="auth-link">
            {t('common.backToLogin', '返回登录')}
          </Link>
        </div>
      </div>
    </div>
  );
}

