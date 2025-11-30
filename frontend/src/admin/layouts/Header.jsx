/**
 * Header Component - Admin Portal
 * 管理员端顶部导航 - Windster Style
 */

import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import useAuthStore from '@shared/stores/authStore';
import LanguageSwitcher from '@shared/components/LanguageSwitcher';
import {
  MenuIcon,
  BellIcon,
  SearchIcon,
  UserIcon,
  LogoutIcon,
  ChevronDownIcon,
  DocumentIcon,
  WarningIcon
} from '@shared/components';
import './Header.css';

export default function Header({ onToggleSidebar }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
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
      navigate('/admin/login', { replace: true });
    } catch (error) {
      console.error('Logout error:', error);
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
    <header className="admin-header">
      <div className="header-left">
        <button 
          className="sidebar-toggle"
          onClick={onToggleSidebar}
          aria-label="Toggle Sidebar"
        >
          <MenuIcon />
        </button>
        
        <Link to="/admin" className="header-logo">
          <span className="logo-text">{t('admin.header.title')}</span>
        </Link>
      </div>

      <div className="header-center">
        <div className="header-search">
          <SearchIcon className="search-icon" />
          <input
            type="text"
            placeholder={t('admin.header.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      <div className="header-right">
        {/* 语言切换 */}
        <LanguageSwitcher />

        {/* 日志 */}
        <Link 
          to="/admin/logs"
          className={`header-icon-btn ${location.pathname.startsWith('/admin/logs') ? 'active' : ''}`}
          title={t('admin.header.logs') || '应用日志'}
        >
          <DocumentIcon />
        </Link>

        {/* 异常 */}
        <Link 
          to="/admin/exceptions"
          className={`header-icon-btn ${location.pathname.startsWith('/admin/exceptions') ? 'active' : ''}`}
          title={t('admin.header.exceptions') || '应用异常'}
        >
          <WarningIcon />
        </Link>

        {/* 通知 */}
        <div className="notification-menu" ref={notificationsRef}>
          <button 
            className="header-icon-btn" 
            title={t('admin.header.notifications')}
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <BellIcon />
            {notifications.length > 0 && (
              <span className="notification-badge">{notifications.length}</span>
            )}
          </button>

          {showNotifications && (
            <div className="notification-dropdown">
              <div className="notification-header">
                <h3>{t('admin.header.notifications')}</h3>
              </div>
              <div className="notification-list">
                {notifications.length > 0 ? (
                  notifications.map((notification, index) => (
                    <div key={index} className="notification-item">
                      <div className="notification-content">
                        <p className="notification-title">{notification.title}</p>
                        <p className="notification-time">{notification.time}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="notification-empty">
                    {t('admin.header.noNotifications') || '暂无通知'}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 用户菜单 */}
        <div className="user-menu" ref={userMenuRef} data-open={showUserMenu}>
          <button 
            className="user-menu-trigger"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <div className="user-avatar">
              {user?.name?.charAt(0) || 'A'}
            </div>
            <span className="user-name">{user?.name || t('admin.header.admin')}</span>
            <ChevronDownIcon className="dropdown-arrow" />
          </button>

          {showUserMenu && (
            <div className="user-menu-dropdown">
              <div className="user-info">
                <div className="user-avatar-large">
                  {user?.name?.charAt(0) || 'A'}
                </div>
                <div className="user-details">
                  <div className="user-name-large">{user?.name || t('admin.header.admin')}</div>
                  <div className="user-email">{user?.email || ''}</div>
                </div>
              </div>
              
              <div className="menu-divider" />
              
              <Link 
                to="/admin/profile"
                className="menu-item"
                onClick={() => setShowUserMenu(false)}
              >
                <UserIcon className="menu-icon" />
                <span>{t('admin.header.profile')}</span>
              </Link>
              
              <div className="menu-divider" />
              
              <button 
                className="menu-item menu-item-danger"
                onClick={handleLogout}
              >
                <LogoutIcon className="menu-icon" />
                <span>{t('admin.header.logout')}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

