/**
 * Sidebar Component - Admin Portal
 * 管理员端侧边导航 - Windster Style
 */

import { useTranslation } from 'react-i18next';
import { NavLink, useLocation } from 'react-router-dom';
import { useState } from 'react';
import {
  DashboardIcon,
  UsersIcon,
  ChartIcon,
  FolderIcon,
  DocumentIcon,
  SettingsIcon,
  ReportIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from '@shared/components';
import './Sidebar.css';

export default function Sidebar({ collapsed }) {
  const { t } = useTranslation();
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState([]);

  const menuItems = [
    {
      key: 'dashboard',
      path: '/admin',
      icon: DashboardIcon,
      label: t('admin.menu.dashboard'),
      exact: true
    },
    {
      key: 'members',
      path: '/admin/members',
      icon: UsersIcon,
      label: t('admin.menu.members')
    },
    {
      key: 'performance',
      path: '/admin/performance',
      icon: ChartIcon,
      label: t('admin.menu.performance')
    },
    {
      key: 'projects',
      path: '/admin/projects',
      icon: FolderIcon,
      label: t('admin.menu.projects')
    },
    {
      key: 'content',
      path: '/admin/content',
      icon: DocumentIcon,
      label: t('admin.menu.content')
    },
    {
      key: 'reports',
      path: '/admin/reports',
      icon: ReportIcon,
      label: t('admin.menu.reports')
    },
    {
      key: 'settings',
      path: '/admin/settings',
      icon: SettingsIcon,
      label: t('admin.menu.settings')
    }
  ];

  const toggleExpanded = (key) => {
    setExpandedItems(prev =>
      prev.includes(key)
        ? prev.filter(item => item !== key)
        : [...prev, key]
    );
  };

  const isActive = (item) => {
    if (item.exact) {
      return location.pathname === item.path;
    }
    return location.pathname.startsWith(item.path);
  };

  return (
    <aside className={`admin-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <nav className="sidebar-nav">
        <ul className="nav-list">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            const hasSubmenu = item.submenu && item.submenu.length > 0;
            const isExpanded = expandedItems.includes(item.key);

            return (
              <li key={item.key} className="nav-item">
                {hasSubmenu ? (
                  <>
                    <button
                      className={`nav-link ${active ? 'active' : ''}`}
                      onClick={() => !collapsed && toggleExpanded(item.key)}
                      title={collapsed ? item.label : undefined}
                    >
                      <span className="nav-icon">
                        <Icon />
                      </span>
                      {!collapsed && (
                        <>
                          <span className="nav-label">{item.label}</span>
                          <span className="nav-chevron">
                            {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
                          </span>
                        </>
                      )}
                    </button>
                    {!collapsed && isExpanded && (
                      <ul className="nav-submenu">
                        {item.submenu.map((subItem) => (
                          <li key={subItem.key} className="nav-subitem">
                            <NavLink
                              to={subItem.path}
                              className={({ isActive }) =>
                                `nav-sublink ${isActive ? 'active' : ''}`
                              }
                            >
                              {subItem.label}
                            </NavLink>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <NavLink
                    to={item.path}
                    end={item.exact}
                    className={({ isActive }) =>
                      `nav-link ${isActive ? 'active' : ''}`
                    }
                    title={collapsed ? item.label : undefined}
                  >
                    <span className="nav-icon">
                      <Icon />
                    </span>
                    {!collapsed && <span className="nav-label">{item.label}</span>}
                  </NavLink>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

