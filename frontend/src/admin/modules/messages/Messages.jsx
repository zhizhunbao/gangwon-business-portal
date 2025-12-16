/**
 * Messages Component - Admin Portal
 * 站内信管理主组件
 */

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Tabs } from '@shared/components';
import MessageList from './MessageList';
import SendMessage from './SendMessage';

export default function Messages() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('list');

  const tabs = useMemo(() => [
    { key: 'list', label: t('admin.messages.tabs.list', '消息列表') },
    { key: 'send', label: t('admin.messages.tabs.send', '发送消息') }
  ], [t]);

  return (
    <div className="admin-messages">
      <Card>
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        <div className="tab-content mt-6">
          {activeTab === 'list' && <MessageList />}
          {activeTab === 'send' && <SendMessage />}
        </div>
      </Card>
    </div>
  );
}

