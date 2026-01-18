/**
 * Content Management Component - Admin Portal
 * 内容管理（横幅、弹窗、公告）
 */

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Tabs } from '@shared/components';
import BannerManagement from './BannerManagement';
import NoticeManagement from './NoticeManagement';
import FAQManagement from './FAQManagement';
import SystemInfoManagement from './SystemInfoManagement';
import LegalContentManagement from './LegalContentManagement';

export default function ContentManagement() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('banners');

  // 使用 useMemo 缓存 tabs 配置
  const tabs = useMemo(() => [
    { key: 'banners', label: t('admin.content.tabs.banners') },
    { key: 'notices', label: t('admin.content.tabs.notices') },
    { key: 'faq', label: t('admin.content.tabs.faq') },
    { key: 'systemInfo', label: t('admin.content.tabs.systemInfo') },
    { key: 'legal', label: t('admin.content.tabs.legal', '약관관리') }
  ], [t]);



  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-semibold text-gray-900 m-0">{t('admin.content.title')}</h1>
      </div>

      <Card>
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        <div className="mt-6 p-6">
          {activeTab === 'banners' && <BannerManagement />}
          {activeTab === 'notices' && <NoticeManagement />}
          {activeTab === 'faq' && <FAQManagement />}
          {activeTab === 'systemInfo' && <SystemInfoManagement />}
          {activeTab === 'legal' && <LegalContentManagement />}
        </div>
      </Card>
    </div>
  );
}