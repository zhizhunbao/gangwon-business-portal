/**
 * Messages Component - Admin Portal
 * 站内信管理主组件
 */

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Tabs } from '@shared/components';
import MessageList from './MessageList';
import SendMessage from './SendMessage';
import BroadcastMessage from './BroadcastMessage';
import MessageAnalytics from './MessageAnalytics';

export default function Messages() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('list');

  const tabs = useMemo(() => [
    { key: 'list', label: t('admin.messages.tabs.list') },
    { key: 'send', label: t('admin.messages.tabs.send') },
    { key: 'broadcast', label: t('admin.messages.tabs.broadcast') },
    { key: 'analytics', label: t('admin.messages.tabs.analytics') }
  ], [t]);

  return (
    <div className="admin-messages">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-semibold text-gray-900 m-0">
          {t('admin.messages.title')}
        </h1>
      </div>

      <Card>
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        <div className="tab-content mt-6 p-6">
          {activeTab === 'list' && <MessageList />}
          {activeTab === 'send' && <SendMessage />}
          {activeTab === 'broadcast' && <BroadcastMessage />}
          {activeTab === 'analytics' && <MessageAnalytics />}
        </div>
      </Card>
    </div>
  );
}

