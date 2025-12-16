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
  AuditLogIcon,
  EnvelopeIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from '@shared/components';

export default function Sidebar({ collapsed, mobileOpen = false, onClose }) {
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
      key: 'messages',
      path: '/admin/messages',
      icon: EnvelopeIcon,
      label: t('admin.menu.messages', '站内信')
    },
    {
      key: 'reports',
      path: '/admin/reports',
      icon: ReportIcon,
      label: t('admin.menu.reports')
    },
    {
      key: 'auditLogs',
      path: '/admin/audit-logs',
      icon: AuditLogIcon,
      label: t('admin.menu.auditLogs')
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

  const handleLinkClick = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <aside className={`fixed top-16 left-0 bottom-0 w-64 bg-white text-gray-900 overflow-y-auto overflow-x-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] z-[999] border-r border-gray-200 shadow-[2px_0_4px_rgba(0,0,0,0.02)] scrollbar-thin scrollbar-track-gray-50 scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-400 ${
      collapsed ? 'w-[60px]' : ''
    } ${
      mobileOpen ? 'translate-x-0' : '-translate-x-full'
    } md:translate-x-0 md:transition-transform md:shadow-[2px_0_8px_rgba(0,0,0,0.15)]`}>
      <nav className="py-4">
        <ul className="list-none p-0 m-0">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            const hasSubmenu = item.submenu && item.submenu.length > 0;
            const isExpanded = expandedItems.includes(item.key);

            return (
              <li key={item.key} className="m-0">
                {hasSubmenu ? (
                  <>
                    <button
                      className={`flex items-center gap-4 py-3 px-6 text-gray-500 no-underline transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] relative text-sm rounded-md my-1 mx-2 ${
                        active 
                          ? 'bg-blue-50 text-blue-600 font-medium shadow-[0_1px_3px_0_rgba(37,99,235,0.1)] before:content-[""] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-[60%] before:bg-gradient-to-b before:from-blue-600 before:to-blue-500 before:rounded-r-sm' 
                          : 'hover:bg-gray-100 hover:text-gray-900'
                      } ${collapsed ? 'p-4 justify-center' : ''}`}
                      onClick={() => !collapsed && toggleExpanded(item.key)}
                      title={collapsed ? item.label : undefined}
                    >
                      <span className="flex items-center justify-center min-w-6 w-6 h-6 flex-shrink-0">
                        <Icon className="w-full h-full" />
                      </span>
                      {!collapsed && (
                        <>
                          <span className="text-[15px] whitespace-nowrap overflow-hidden text-ellipsis">{item.label}</span>
                          <span className={`ml-auto flex items-center opacity-60 transition-transform duration-200 ${active ? 'opacity-100' : ''}`}>
                            {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
                          </span>
                        </>
                      )}
                    </button>
                    {!collapsed && isExpanded && (
                      <ul className="list-none p-0 m-0 bg-gray-50 border-l-2 border-gray-200 ml-6 pl-2 animate-[slideDown_0.2s_ease-out]">
                        {item.submenu.map((subItem) => (
                          <li key={subItem.key} className="m-0">
                            <NavLink
                              to={subItem.path}
                              className={({ isActive }) =>
                                `block py-2 px-4 text-gray-500 no-underline text-sm rounded-md my-1 transition-all duration-200 ${
                                  isActive 
                                    ? 'bg-blue-50 text-blue-600 font-medium' 
                                    : 'hover:bg-gray-100 hover:text-gray-900'
                                }`
                              }
                              onClick={handleLinkClick}
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
                      `flex items-center gap-4 py-3 px-6 text-gray-500 no-underline transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] relative text-sm rounded-md my-1 mx-2 ${
                        isActive 
                          ? 'bg-blue-50 text-blue-600 font-medium shadow-[0_1px_3px_0_rgba(37,99,235,0.1)] before:content-[""] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-[60%] before:bg-gradient-to-b before:from-blue-600 before:to-blue-500 before:rounded-r-sm' 
                          : 'hover:bg-gray-100 hover:text-gray-900'
                      } ${collapsed ? 'p-4 justify-center' : ''}`
                    }
                    title={collapsed ? item.label : undefined}
                    onClick={handleLinkClick}
                  >
                    <span className="flex items-center justify-center min-w-6 w-6 h-6 flex-shrink-0">
                      <Icon className="w-full h-full" />
                    </span>
                    {!collapsed && <span className="text-[15px] whitespace-nowrap overflow-hidden text-ellipsis">{item.label}</span>}
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

