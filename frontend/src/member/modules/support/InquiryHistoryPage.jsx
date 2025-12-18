/**
 * Inquiry History Page - Member Portal
 * 1:1 문의 내역 페이지
 */

import { useTranslation } from 'react-i18next';
import { Banner, Submenu } from '@shared/components';
import { BANNER_TYPES } from '@shared/utils/constants';
import { PageContainer } from '@member/layouts';
import InquiryHistory from './InquiryHistory';

export default function InquiryHistoryPage() {
  const { t } = useTranslation();

  return (
    <div className="support w-full max-w-full flex flex-col p-0 m-0 overflow-x-hidden relative">
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
          }
        ]}
        className="support-submenu bg-white/95 shadow-sm border-b border-gray-100 sticky top-0 z-10 backdrop-blur-sm"
        headerSelector=".member-header"
      />
      <PageContainer>
        <div className="w-full">
          <InquiryHistory />
        </div>
      </PageContainer>
    </div>
  );
}
