/**
 * Notification Detail Page - Member Portal
 * 通知详情页面
 */

import { useTranslation } from 'react-i18next';
import { Banner, Submenu } from '@shared/components';
import { BANNER_TYPES } from '@shared/utils/constants';
import { PageContainer } from '@member/layouts';
import NotificationDetail from './NotificationDetail';

export default function NotificationDetailPage() {
  const { t } = useTranslation();

  return (
    <div className="notifications w-full max-w-full flex flex-col p-0 m-0 overflow-x-hidden relative">
      <Banner
        bannerType={BANNER_TYPES.SUPPORT}
        sectionClassName="member-banner-section"
      />
      <Submenu
        items={[
          {
            key: 'support-faq',
            path: '/member/support/faq',
            exact: true,
            label: t('support.faq')
          },
          {
            key: 'support-inquiry',
            path: '/member/support/inquiry',
            exact: true,
            label: t('support.inquiry')
          },
          {
            key: 'support-inquiry-history',
            path: '/member/support/inquiry-history',
            exact: true,
            label: t('support.inquiryHistory')
          },
          {
            key: 'support-notifications',
            path: '/member/support/notifications',
            exact: false,
            activePaths: ['/member/support/notifications'],
            label: t('support.notifications')
          }
        ]}
        className="support-submenu bg-white/95 shadow-sm border-b border-gray-100 sticky top-0 z-10 backdrop-blur-sm"
        headerSelector=".member-header"
      />
      <PageContainer>
        <div className="animate-fade-in py-8">
          <NotificationDetail />
        </div>
      </PageContainer>
    </div>
  );
}
