/**
 * Reports Component - Admin Portal
 * 统计报表 - 专注于报表生成和数据导出，不重复 Dashboard 的统计展示功能
 */

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Tabs } from '@shared/components';
import CustomReport from './CustomReport';
import ReportTemplates from './ReportTemplates';

export default function Reports() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('custom');

  const tabs = useMemo(() => [
    { key: 'custom', label: t('admin.reports.tabs.custom') },
    { key: 'templates', label: t('admin.reports.tabs.templates') }
  ], [t]);

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-semibold text-gray-900 m-0 mb-1">
          {t('admin.reports.title')}
        </h1>
        <p className="text-gray-600 text-sm m-0">
          {t('admin.reports.description')}
        </p>
      </div>

      <Card>
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        <div className="tab-content mt-6 p-6">
          {activeTab === 'custom' && <CustomReport />}
          {activeTab === 'templates' && <ReportTemplates />}
        </div>
      </Card>
    </div>
  );
}

