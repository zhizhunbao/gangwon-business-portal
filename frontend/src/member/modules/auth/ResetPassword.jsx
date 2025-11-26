/**
 * Reset Password Page - Member Portal
 * 重置密码页面
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@shared/components';
import { EyeIcon, EyeOffIcon } from '@shared/components/Icons';
import authService from '@shared/services/auth.service';
import './Auth.css';

export default function ResetPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const token = searchParams.get('token');
  
  useEffect(() => {
    if (!token) {
      setError(t('auth.invalidResetToken', '无效的重置令牌'));
    }
  }, [token, t]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!token) {
      setError(t('auth.invalidResetToken', '无效的重置令牌'));
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError(t('auth.passwordsDoNotMatch', '两次输入的密码不一致'));
      return;
    }
    
    if (formData.password.length < 8) {
      setError(t('auth.passwordTooShort', '密码长度至少为8位'));
      return;
    }
    
    setIsLoading(true);
    
    try {
      await authService.resetPassword(token, formData.password);
      
      setIsSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.message || t('auth.passwordResetFailed', '密码重置失败'));
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePasswordChange = (e) => {
    setFormData(prev => ({
      ...prev,
      password: e.target.value
    }));
  };

  const handleConfirmPasswordChange = (e) => {
    setFormData(prev => ({
      ...prev,
      confirmPassword: e.target.value
    }));
  };

  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(prev => !prev);
  };

  if (isSuccess) {
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
            <p>{t('auth.passwordResetSuccess', '密码重置成功！')}</p>
            <p className="auth-help-text">
              {t('auth.redirectingToLogin', '正在跳转到登录页面...')}
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
            <label htmlFor="password">
              {t('auth.newPassword', '新密码')}
            </label>
            <div className="auth-password-input-wrapper">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                className="auth-input"
                value={formData.password}
                onChange={handlePasswordChange}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder={t('auth.newPasswordPlaceholder', '请输入新密码（至少8位）')}
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
            <span className="auth-help-text">
              {t('auth.passwordHelp', '密码长度至少为8位，建议包含字母、数字和特殊字符')}
            </span>
          </div>
          
          <div className="auth-form-group">
            <label htmlFor="confirmPassword">
              {t('auth.confirmPassword', '确认密码')}
            </label>
            <div className="auth-password-input-wrapper">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                className="auth-input"
                value={formData.confirmPassword}
                onChange={handleConfirmPasswordChange}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder={t('auth.confirmPasswordPlaceholder', '请再次输入新密码')}
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={toggleConfirmPasswordVisibility}
                aria-label={showConfirmPassword ? t('auth.hidePassword') : t('auth.showPassword')}
              >
                {showConfirmPassword ? (
                  <EyeOffIcon className="w-5 h-5" />
                ) : (
                  <EyeIcon className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
          
          <button
            type="submit"
            className={`auth-button auth-button-primary ${isLoading ? 'auth-button-loading' : ''}`}
            disabled={isLoading || !token}
          >
            {!isLoading && t('auth.resetPassword', '重置密码')}
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

