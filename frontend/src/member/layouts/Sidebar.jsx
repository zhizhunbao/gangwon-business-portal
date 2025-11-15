/**
 * Sidebar Component - Member Portal
 * 会员端侧边导航 - Windster Style
 */

import { useTranslation } from 'react-i18next';
import { NavLink, useLocation } from 'react-router-dom';
import {
  DashboardIcon,
  FolderIcon,
  ChartIcon,
  SupportIcon,
  DocumentIcon
} from '@shared/components';
import './Sidebar.css';

export default function Sidebar({ collapsed }) {
  const { t } = useTranslation();
  const location = useLocation();

  const menuItems = [
    {
      key: 'home',
      path: '/member',
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
  ];

  const isActive = (item) => {
    if (item.exact) {
      return location.pathname === item.path;
    }
    return location.pathname.startsWith(item.path);
  };

  return (
    <aside className={`member-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <nav className="sidebar-nav">
        <ul className="nav-list">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);

            return (
              <li key={item.key} className="nav-item">
                <NavLink
                  to={item.path}
                  end={item.exact}
                  className={({ isActive }) =>
                    `nav-link ${isActive || active ? 'active' : ''}`
                  }
                  title={collapsed ? item.label : undefined}
                >
                  <span className="nav-icon">
                    <Icon />
                  </span>
                  {!collapsed && <span className="nav-label">{item.label}</span>}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

