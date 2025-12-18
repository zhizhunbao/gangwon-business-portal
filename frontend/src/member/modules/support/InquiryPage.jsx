/**
 * Inquiry Page - Member Portal
 * 1:1 문의 작성 페이지
 */

import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Banner, Submenu } from '@shared/components';
import { BANNER_TYPES } from '@shared/utils/constants';
import { PageContainer } from '@member/layouts';
import InquiryForm from './InquiryForm';

export default function InquiryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleSubmitSuccess = () => {
    // 提交成功后跳转到咨询历史页面
    navigate('/member/support/inquiry-history');
  };

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
          <InquiryForm onSubmitSuccess={handleSubmitSuccess} />
        </div>
      </PageContainer>
    </div>
  );
}
