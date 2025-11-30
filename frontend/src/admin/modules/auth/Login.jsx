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
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      await adminLogin(formData);
      // Redirect to admin dashboard
      navigate('/admin');
    } catch (err) {
      setError(err.message || err.response?.data?.detail || t('admin.auth.loginFailed'));
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
              label={t('admin.auth.username') || 'Username'}
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              autoComplete="username"
              placeholder={t('admin.auth.usernamePlaceholder') || '000-00-00000 或 admin@example.com'}
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
              
              <div className="text-sm">
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
        
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            {t('admin.auth.notAdminUser')}{' '}
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              {t('admin.auth.goToMemberLogin')}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

