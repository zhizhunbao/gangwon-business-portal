/**
 * Performance Page - Member Portal
 * 成果管理主页面 - 使用独立路由
 */

import { useTranslation } from 'react-i18next';
import { useLocation, Outlet } from 'react-router-dom';
import { Banner, Submenu } from '@shared/components';
import { BANNER_TYPES } from '@shared/utils/constants';
import { PageContainer } from '@member/layouts';

export default function Performance() {
  const { t } = useTranslation();
  const location = useLocation();

  // Submenu 配置：企业信息、成果输入、成果查询
  const submenuItems = [
    {
      key: 'company-info',
      label: t('performance.companyInfo.title', '企业信息'),
      path: '/member/performance/company-info',
      isTab: true
    },
    {
      key: 'performance-input',
      label: t('performance.input', '成果输入'),
      path: '/member/performance/edit',
      isTab: true
    },
    {
      key: 'performance-query',
      label: t('performance.query', '成果查询'),
      path: '/member/performance/list',
      isTab: true
    }
  ];

  return (
    <div className="performance w-full max-w-full flex flex-col p-0 m-0 overflow-x-hidden relative">
      <Banner
        bannerType={BANNER_TYPES.PERFORMANCE}
        sectionClassName="member-banner-section"
      />
      
      <Submenu items={submenuItems} renderLeft={() => null} />
      
      <PageContainer>
        <div className="w-full">
          <Outlet />
        </div>
      </PageContainer>
    </div>
  );
}

