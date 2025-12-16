/**
 * Content Management Component - Admin Portal
 * 内容管理（横幅、弹窗、公告、新闻资料）
 */

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Tabs } from '@shared/components';
import BannerManagement from './BannerManagement';
import NoticeManagement from './NoticeManagement';
import NewsManagement from './NewsManagement';

export default function ContentManagement() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('banners');

  // 使用 useMemo 缓存 tabs 配置
  const tabs = useMemo(() => [
    { key: 'banners', label: t('admin.content.tabs.banners') },
    { key: 'notices', label: t('admin.content.tabs.notices') },
    { key: 'news', label: t('admin.content.tabs.news') }
  ], [t]);



  return (
    <div className="p-0">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-gray-900 m-0">{t('admin.content.title')}</h1>
      </div>

      <Card>
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        <div className="py-6">
          {activeTab === 'banners' && <BannerManagement />}
          {activeTab === 'notices' && <NoticeManagement />}
          {activeTab === 'news' && <NewsManagement />}
        </div>
      </Card>
    </div>
  );
}

