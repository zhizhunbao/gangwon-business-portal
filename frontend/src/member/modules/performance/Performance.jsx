/**
 * Performance Page - Member Portal
 * 绩效管理主页面
 */

import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Banner, Submenu } from '@shared/components';
import { BANNER_TYPES } from '@shared/utils/constants';
import PerformanceListContent from './PerformanceListContent';
import PerformanceFormContent from './PerformanceFormContent';
import './Performance.css';

export default function Performance() {
  const { t } = useTranslation();
  const [currentHash, setCurrentHash] = useState(() => window.location.hash.replace('#', ''));

  // 监听 hash 变化
  useEffect(() => {
    const handleHashChange = () => {
      setCurrentHash(window.location.hash.replace('#', ''));
    };
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // Submenu 配置
  const submenuItems = [
    {
      key: 'performance-list',
      label: t('performance.title', '绩效管理'),
      hash: 'list',
      isTab: true
    },
    {
      key: 'performance-new',
      label: t('performance.createNew', '新增绩效'),
      hash: 'new',
      isTab: true
    }
  ];

  // 渲染当前激活的内容
  const renderContent = () => {
    const hash = currentHash || 'list';
    switch (hash) {
      case 'list':
        return <PerformanceListContent />;
      case 'new':
        return <PerformanceFormContent />;
      default:
        return <PerformanceListContent />;
    }
  };

  return (
    <div className="performance">
      <Banner
        bannerType={BANNER_TYPES.PERFORMANCE}
        sectionClassName="member-banner-section"
      />
      
      <Submenu items={submenuItems} renderLeft={() => null} />
      
      <div className="performance-tab-content">
        {renderContent()}
      </div>
    </div>
  );
}

