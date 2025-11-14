/**
 * Dashboard Component - Admin Portal
 * 管理员仪表盘 - 包含三个子页面：企业现状、横幅管理、弹窗管理
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Tabs } from '@shared/components';

import CompanyStatus from './CompanyStatus';
import BannerManagement from './BannerManagement';
import PopupManagement from './PopupManagement';

import './Dashboard.css';

export default function Dashboard() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('companyStatus');

  const tabs = [
    {
      key: 'companyStatus',
      label: t('admin.dashboard.tabs.companyStatus')
    },
    {
      key: 'bannerManagement',
      label: t('admin.dashboard.tabs.bannerManagement')
    },
    {
      key: 'popupManagement',
      label: t('admin.dashboard.tabs.popupManagement')
    }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'companyStatus':
        return <CompanyStatus />;
      case 'bannerManagement':
        return <BannerManagement />;
      case 'popupManagement':
        return <PopupManagement />;
      default:
        return <CompanyStatus />;
    }
  };

  return (
    <div className="admin-dashboard">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">{t('admin.dashboard.title')}</h1>
      </div>

      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        className="dashboard-tabs"
      />

      <div className="dashboard-content">
        {renderTabContent()}
      </div>
    </div>
  );
}

