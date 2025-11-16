/**
 * About Page - Member Portal
 * 系统介绍
 */

import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback } from 'react';
import { Banner, Submenu } from '@shared/components';
import { BANNER_TYPES } from '@shared/utils/constants';
import Overview from './Overview';
import Features from './Features';
import Workflow from './Workflow';
import Contact from './Contact';
import './About.css';

// 选项卡类型
const TAB_TYPES = {
  OVERVIEW: 'overview',
  FEATURES: 'features',
  WORKFLOW: 'workflow',
  CONTACT: 'contact'
};

export default function About() {
  const { t } = useTranslation();
  
  // 从 URL hash 获取当前激活的选项卡
  const getActiveTabFromHash = useCallback(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash && Object.values(TAB_TYPES).includes(hash)) {
      return hash;
    }
    // 默认显示第一个选项卡
    return TAB_TYPES.OVERVIEW;
  }, []);

  const [activeTab, setActiveTab] = useState(getActiveTabFromHash);

  // 监听 URL hash 变化，更新激活的选项卡
  useEffect(() => {
    const handleHashChange = () => {
      const newTab = getActiveTabFromHash();
      setActiveTab(newTab);
    };

    // 初始设置
    handleHashChange();

    // 监听 hash 变化
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [getActiveTabFromHash]);

  // 渲染当前激活的组件内容
  const renderActiveContent = () => {
    switch (activeTab) {
      case TAB_TYPES.OVERVIEW:
        return <Overview />;
      case TAB_TYPES.FEATURES:
        return <Features />;
      case TAB_TYPES.WORKFLOW:
        return <Workflow />;
      case TAB_TYPES.CONTACT:
        return <Contact />;
      default:
        return <Overview />;
    }
  };

  // 获取 submenu 配置
  const getSubmenuItems = () => {
    return [
      {
        key: 'about-overview',
        hash: 'overview',
        label: t('about.tabs.overview', '系统概述'),
        isTab: true,
        basePath: '/member/about'
      },
      {
        key: 'about-features',
        hash: 'features',
        label: t('about.tabs.features', '主要功能'),
        isTab: true,
        basePath: '/member/about'
      },
      {
        key: 'about-workflow',
        hash: 'workflow',
        label: t('about.tabs.workflow', '使用流程'),
        isTab: true,
        basePath: '/member/about'
      },
      {
        key: 'about-contact',
        hash: 'contact',
        label: t('about.tabs.contact', '联系方式'),
        isTab: true,
        basePath: '/member/about'
      }
    ];
  };

  return (
    <div className="about">
      <Banner
        bannerType={BANNER_TYPES.ABOUT}
        sectionClassName="member-banner-section"
      />
      <Submenu items={getSubmenuItems()} renderLeft={() => null} />
      {/* 显示当前激活的子组件内容 - 选项卡由 Submenu 控制 */}
      <div className="about-tab-content">
        {renderActiveContent()}
      </div>
    </div>
  );
}

