/**
 * Header Component - Admin Portal
 * 管理员端顶部导航 - Windster Style
 */

import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import useAuthStore from '@shared/stores/authStore';
import LanguageSwitcher from '@shared/components/LanguageSwitcher';
import { loggerService, exceptionService } from '@shared/services';
import {
  MenuIcon,
  BellIcon,
  SearchIcon,
  UserIcon,
  LogoutIcon,
  ChevronDownIcon,
  DocumentIcon,
  WarningIcon,
  NotificationBell
} from '@shared/components';

export default function Header({ onToggleSidebar }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const userMenuRef = useRef(null);
  const notificationsRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      setShowUserMenu(false);
      await logout();
      loggerService.info('Admin logout succeeded', {
        module: 'AdminHeader',
        function: 'handleLogout'
      });
      navigate('/admin/login', { replace: true });
    } catch (error) {
      loggerService.error('Admin logout failed', {
        module: 'AdminHeader',
        function: 'handleLogout',
        error_message: error.message,
        error_code: error.code
      });
      exceptionService.recordException(error, {
        request_path: window.location.pathname,
        error_code: 'LOGOUT_ERROR'
      });
      // Even if logout API fails, clear local auth and redirect
      const { clearAuth } = useAuthStore.getState();
      clearAuth();
      navigate('/admin/login', { replace: true });
    }
  };

  const notifications = [
    // 示例通知数据，可以从 API 获取
  ];

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-[1000] shadow-sm md:px-4">
      <div className="flex items-center gap-4">
        <button 
          className="bg-transparent border-none cursor-pointer p-2 text-gray-500 transition-colors duration-200 flex items-center justify-center rounded-md hover:text-gray-900"
          onClick={onToggleSidebar}
          aria-label="Toggle Sidebar"
        >
          <MenuIcon className="w-6 h-6" />
        </button>
        
        <Link to="/admin" className="flex items-center gap-2 no-underline text-gray-900 font-semibold text-lg">
          <span className="whitespace-nowrap md:hidden">{t('admin.header.title')}</span>
        </Link>
      </div>

      <div className="hidden lg:flex flex-1 justify-center items-center max-w-[600px] mx-8">
        <div className="relative w-full max-w-[500px]">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none w-4 h-4 z-[1]" />
          <input
            type="text"
            placeholder={t('admin.header.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full py-2.5 pl-10 pr-4 border border-gray-200 rounded-lg text-sm bg-gray-50 transition-all duration-200 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* 语言切换 */}
        <LanguageSwitcher />

        {/* 日志 */}
        <Link 
          to="/admin/logs"
          className={`relative bg-transparent border-none cursor-pointer p-2 text-gray-500 transition-all duration-200 rounded-md flex items-center justify-center no-underline ${
            location.pathname.startsWith('/admin/logs') 
              ? 'text-blue-500 bg-blue-50 hover:text-blue-600 hover:bg-blue-100' 
              : 'hover:text-gray-900 hover:bg-gray-100'
          }`}
          title={t('admin.header.logs') || '应用日志'}
        >
          <DocumentIcon className="w-5 h-5" />
        </Link>

        {/* 异常 */}
        <Link 
          to="/admin/exceptions"
          className={`relative bg-transparent border-none cursor-pointer p-2 text-gray-500 transition-all duration-200 rounded-md flex items-center justify-center no-underline ${
            location.pathname.startsWith('/admin/exceptions') 
              ? 'text-blue-500 bg-blue-50 hover:text-blue-600 hover:bg-blue-100' 
              : 'hover:text-gray-900 hover:bg-gray-100'
          }`}
          title={t('admin.header.exceptions') || '应用异常'}
        >
          <WarningIcon className="w-5 h-5" />
        </Link>

        {/* 站内信通知 */}
        <NotificationBell userType="admin" />

        {/* 用户菜单或登录按钮 */}
        {isAuthenticated ? (
          <div className="relative" ref={userMenuRef}>
            <button 
              className="flex items-center gap-2 bg-transparent border-none cursor-pointer py-2 px-3 transition-all duration-200 rounded-lg hover:bg-gray-100 active:scale-[0.98]"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center font-semibold text-sm shadow-[0_2px_4px_-1px_rgba(59,130,246,0.3)]">
                {user?.name?.charAt(0) || 'A'}
              </div>
              <span className="text-sm font-medium text-gray-700 max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap md:hidden">
                {user?.name || t('admin.header.admin')}
              </span>
              <ChevronDownIcon className={`w-4 h-4 text-gray-500 transition-all duration-200 flex-shrink-0 ${showUserMenu ? 'rotate-180 text-blue-500' : ''}`} />
            </button>

            {showUserMenu && (
              <div className="absolute top-[calc(100%+0.5rem)] right-0 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[240px] z-[1001] overflow-hidden animate-[slideDown_0.2s_ease-out] md:right-[-1rem]">
                <div className="p-4 flex items-center gap-3 bg-gray-50">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center font-semibold text-lg flex-shrink-0 shadow-[0_2px_4px_-1px_rgba(59,130,246,0.3)]">
                    {user?.name?.charAt(0) || 'A'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 m-0 mb-1 overflow-hidden text-ellipsis whitespace-nowrap">
                      {user?.name || t('admin.header.admin')}
                    </div>
                    <div className="text-xs text-gray-500 overflow-hidden text-ellipsis whitespace-nowrap">
                      {user?.email || ''}
                    </div>
                  </div>
                </div>
                
                <div className="h-px bg-gray-200 my-2" />
                
                <Link 
                  to="/admin/profile"
                  className="flex items-center gap-3 py-3 px-4 text-gray-700 no-underline bg-transparent border-none w-full text-left cursor-pointer text-sm transition-colors duration-200 hover:bg-gray-100"
                  onClick={() => setShowUserMenu(false)}
                >
                  <UserIcon className="w-[18px] h-[18px] flex-shrink-0" />
                  <span>{t('admin.header.profile')}</span>
                </Link>
                
                <div className="h-px bg-gray-200 my-2" />
                
                <button 
                  className="flex items-center gap-3 py-3 px-4 text-red-600 bg-transparent border-none w-full text-left cursor-pointer text-sm transition-colors duration-200 hover:bg-red-50 hover:text-red-700"
                  onClick={handleLogout}
                >
                  <LogoutIcon className="w-[18px] h-[18px] flex-shrink-0" />
                  <span>{t('admin.header.logout')}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button 
            className="py-2 px-4 rounded-md cursor-pointer transition-all duration-200 font-medium text-sm bg-blue-500 text-white border border-blue-600 hover:bg-blue-600 hover:border-blue-700 active:bg-blue-700"
            onClick={() => navigate('/admin/login')}
          >
            {t('admin.header.login') || '로그인'}
          </button>
        )}
      </div>
    </header>
  );
}

