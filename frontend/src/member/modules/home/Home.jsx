/**
 * Home Page - Member Portal
 * 企业会员首页
 */

import { useTranslation } from 'react-i18next';
import { useState, useEffect, useMemo } from 'react';
import { Banner, Submenu } from '@shared/components';
import { BANNER_TYPES } from '@shared/utils/constants';
import Stats from './Stats';
import QuickLinks from './QuickLinks';
import NoticesList from './NoticesList';
import NewsList from './NewsList';
import './Home.css';

export default function Home() {
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

  // Submenu 配置 - 使用 useMemo 缓存，避免每次渲染都重新创建
  const submenuItems = useMemo(() => [
    {
      key: 'stats',
      label: t('home.stats.title', '我的概览'),
      hash: 'stats',
      isTab: true
    },
    {
      key: 'quickLinks',
      label: t('home.quickLinks.title', '快捷入口'),
      hash: 'quickLinks',
      isTab: true
    },
    {
      key: 'notices',
      label: t('home.notices.title', '最新公告'),
      hash: 'notices',
      isTab: true
    },
    {
      key: 'news',
      label: t('home.news.title', '新闻资料'),
      hash: 'news',
      isTab: true
    }
  ], [t]);

  // 渲染当前激活的内容 - 使用 useMemo 缓存，避免不必要的重新渲染
  const renderContent = useMemo(() => {
    const hash = currentHash || 'stats';
    switch (hash) {
      case 'stats':
        return <Stats />;
      case 'quickLinks':
        return <QuickLinks />;
      case 'notices':
        return <NoticesList />;
      case 'news':
        return <NewsList />;
      default:
        return <Stats />;
    }
  }, [currentHash]);

  return (
    <div className="home">
      <Banner
        bannerType={BANNER_TYPES.MAIN_PRIMARY}
        sectionClassName="member-banner-section"
      />
      
      <Submenu items={submenuItems} renderLeft={() => null} />
      
      <div className="home-tab-content">
        {renderContent}
      </div>
    </div>
  );
}

