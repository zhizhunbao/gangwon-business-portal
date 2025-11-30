/**
 * Login Page - Member Portal
 * Minimalist Style
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@shared/hooks';
import { LanguageSwitcher } from '@shared/components';
import { EyeIcon, EyeOffIcon } from '@shared/components/Icons';
import { formatBusinessLicense } from '@shared/utils/format';
import './Auth.css';

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();
  
  const [formData, setFormData] = useState({
    businessNumber: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      // Remove dashes from business number for API call
      const businessNumberClean = formData.businessNumber.replace(/-/g, '');
      const response = await login({
        businessNumber: businessNumberClean,
        password: formData.password
      });
      // Redirect based on role
      const redirectPath = response.user.role === 'admin' ? '/admin' : '/member';
      navigate(redirectPath);
    } catch (err) {
      setError(err.response?.data?.message || t('auth.loginFailed'));
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
  
  const handlePasswordChange = (e) => {
    setFormData(prev => ({
      ...prev,
      password: e.target.value
    }));
  };
  
  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };
  
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
            <label htmlFor="businessNumber">
              {t('auth.businessLicense')}
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
            <div className="auth-links">
              <label htmlFor="password">
                {t('auth.password')}
              </label>
              <div className="auth-link-group">
                <Link to="/find-id" className="auth-link">
                  {t('auth.findId')}
                </Link>
                <span className="auth-link-separator">|</span>
                <Link to="/forgot-password" className="auth-link">
                  {t('auth.forgotPassword')}
                </Link>
              </div>
            </div>
            <div className="auth-password-input-wrapper">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                className="auth-input"
                value={formData.password}
                onChange={handlePasswordChange}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={togglePasswordVisibility}
                aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
              >
                {showPassword ? (
                  <EyeOffIcon className="w-5 h-5" />
                ) : (
                  <EyeIcon className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
          
          <div className="auth-checkbox-group">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              className="auth-checkbox"
            />
            <label htmlFor="remember-me" className="auth-checkbox-label">
              {t('auth.rememberMe')}
            </label>
          </div>
          
          <button
            type="submit"
            className={`auth-button auth-button-primary ${isLoading ? 'auth-button-loading' : ''}`}
            disabled={isLoading}
          >
            {!isLoading && t('common.login')}
          </button>
        </form>
        
        <div className="auth-footer">
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="auth-link">
            {t('common.register')}
          </Link>
          .
        </div>
      </div>
    </div>
  );
}

