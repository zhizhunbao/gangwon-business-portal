/**
 * Login Page - Admin Portal
 * 管理员登录页面
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@shared/hooks';
import { Button, Input, Alert, LanguageSwitcher } from '@shared/components';

export default function AdminLogin() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { adminLogin, isLoading } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      await adminLogin(formData);
      navigate('/admin');
    } catch (err) {
      // 显示错误信息，阻止跳转
      setError(err.response?.data?.message || t('admin.auth.loginFailed'));
    }
  };
  
  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            {t('admin.auth.loginTitle')}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {t('admin.auth.loginSubtitle')}
          </p>
        </div>
      </div>
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 py-8 px-6 sm:px-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="error" onClose={() => setError('')}>
                {error}
              </Alert>
            )}
            
            <Input
              label={t('admin.auth.email') || 'Email'}
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              autoComplete="email"
              placeholder={t('admin.auth.emailPlaceholder') || 'admin@example.com'}
            />
            
            <Input
              label={t('admin.auth.password')}
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              autoComplete="current-password"
              placeholder={t('admin.auth.passwordPlaceholder')}
            />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  {t('admin.auth.rememberMe')}
                </label>
              </div>
              
              <div className="text-sm flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/admin/find-id')}
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  {t('admin.auth.findId')}
                </button>
                <span className="text-gray-400">|</span>
                <button
                  type="button"
                  onClick={() => navigate('/admin/forgot-password')}
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  {t('admin.auth.forgotPassword')}
                </button>
              </div>
            </div>
            
            <Button
              type="submit"
              className="w-full"
              loading={isLoading}
            >
              {t('admin.auth.login')}
            </Button>
          </form>
        </div>
        
        <div className="mt-6 text-center space-y-2">
          <p className="text-sm text-gray-600">
            {t('admin.auth.notAdminUser')}{' '}
            <button
              type="button"
              onClick={() => navigate('/member/home')}
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              {t('admin.auth.goToMemberLogin')}
            </button>
          </p>
          <p className="text-xs text-gray-500">
            {t('admin.auth.needAdminAccount')}
          </p>
        </div>
      </div>
    </div>
  );
}

