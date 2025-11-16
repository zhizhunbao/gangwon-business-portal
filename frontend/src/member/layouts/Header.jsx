/**
 * Header Component - Member Portal
 * 会员端顶部导航 - Windster Style
 */

import { useTranslation } from 'react-i18next';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState, useRef, useEffect, useMemo, memo } from 'react';
import useAuthStore from '@shared/stores/authStore';
import LanguageSwitcher from '@shared/components/LanguageSwitcher';
import {
  BellIcon,
  UserIcon,
  LogoutIcon,
  ChevronDownIcon,
  SupportIcon,
  DashboardIcon,
  FolderIcon,
  ChartIcon,
  DocumentIcon
} from '@shared/components';
import './Header.css';

function Header() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const userMenuRef = useRef(null);
  const notificationsRef = useRef(null);

  // 一级导航菜单 - 使用 useMemo 缓存，避免每次渲染都重新创建
  const mainMenuItems = useMemo(() => [
    {
      key: 'home',
      path: '/member/home',
      icon: DashboardIcon,
      label: t('menu.home'),
      exact: true
    },
    {
      key: 'about',
      path: '/member/about',
      icon: DocumentIcon,
      label: t('menu.about')
    },
    {
      key: 'projects',
      path: '/member/projects',
      icon: FolderIcon,
      label: t('menu.projects')
    },
    {
      key: 'performance',
      path: '/member/performance',
      icon: ChartIcon,
      label: t('menu.performance')
    },
    {
      key: 'support',
      path: '/member/support',
      icon: SupportIcon,
      label: t('menu.support')
    }
  ], [t]);

  // 使用 useMemo 缓存菜单激活状态计算
  const isMenuActive = useMemo(() => {
    return (item) => {
      if (item.exact) {
        return location.pathname === item.path;
      }
      return location.pathname.startsWith(item.path);
    };
  }, [location.pathname]);

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
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout API fails, clear local auth and redirect
      const { clearAuth } = useAuthStore.getState();
      clearAuth();
      navigate('/login', { replace: true });
    }
  };

  const notifications = [
    // 示例通知数据，可以从 API 获取
  ];

  return (
    <header className="member-header">
      <div className="header-left">
        <Link to="/member/home" className="header-logo">
          <span className="logo-text">{t('header.title')}</span>
        </Link>
      </div>

      <div className="header-center">
        <nav className="header-nav">
          <ul className="header-nav-list">
            {mainMenuItems.map((item) => {
              const Icon = item.icon;
              const active = isMenuActive(item);
              
              return (
                <li key={item.key} className="header-nav-item">
                  <NavLink
                    to={item.path}
                    end={item.exact}
                    className={({ isActive }) =>
                      `header-nav-link ${isActive || active ? 'active' : ''}`
                    }
                  >
                    <Icon className="header-nav-icon" />
                    <span className="header-nav-label">{item.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <div className="header-right">
        {/* 语言切换 */}
        <LanguageSwitcher variant="light" />

        {/* 通知 */}
        <div className="notification-menu" ref={notificationsRef}>
          <button 
            className="header-icon-btn" 
            title={t('header.notifications')}
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
                <h3>{t('header.notifications')}</h3>
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
                    {t('header.noNotifications')}
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
              {user?.companyName?.charAt(0) || user?.name?.charAt(0) || 'U'}
            </div>
            <span className="user-name">{user?.companyName || user?.name || t('common.appName')}</span>
            <ChevronDownIcon className="dropdown-arrow" />
          </button>

          {showUserMenu && (
            <div className="user-menu-dropdown">
              <div className="user-info">
                <div className="user-avatar-large">
                  {user?.companyName?.charAt(0) || user?.name?.charAt(0) || 'U'}
                </div>
                <div className="user-details">
                  <div className="user-name-large">{user?.companyName || user?.name || t('common.appName')}</div>
                  <div className="user-email">{user?.email || ''}</div>
                </div>
              </div>
              
              <div className="menu-divider" />
              
              <Link 
                to="/member/profile"
                className="menu-item"
                onClick={() => setShowUserMenu(false)}
              >
                <UserIcon className="menu-icon" />
                <span>{t('header.profile')}</span>
              </Link>
              
              <Link 
                to="/member/support" 
                className="menu-item"
                onClick={() => setShowUserMenu(false)}
              >
                <SupportIcon className="menu-icon" />
                <span>{t('header.support')}</span>
              </Link>
              
              <div className="menu-divider" />
              
              <button 
                className="menu-item menu-item-danger"
                onClick={handleLogout}
              >
                <LogoutIcon className="menu-icon" />
                <span>{t('header.logout')}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

// 使用 memo 包装组件，避免不必要的重渲染
export default memo(Header);

