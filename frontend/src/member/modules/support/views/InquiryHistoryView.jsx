/**
 * 咨询历史视图
 *
 * 遵循 dev-frontend_patterns skill 规范。
 */

import React from "react";
import { useInquiryHistory } from "../hooks/useInquiryHistory";
import InquiryHistoryPage from "../components/InquiryHistoryPage/InquiryHistoryPage";
import { Banner } from "@shared/components";
import { BANNER_TYPES } from "@shared/utils/constants";
import SupportSubmenu from "../components/SupportSubmenu";

/**
 * 咨询历史视图组件
 */
export default function InquiryHistoryView() {
  const historyData = useInquiryHistory();

  return (
    <div className="flex flex-col w-full">
      <Banner
        bannerType={BANNER_TYPES.SUPPORT}
        sectionClassName="member-banner-section"
      />
      <SupportSubmenu />
      <InquiryHistoryPage {...historyData} />
    </div>
  );
}
