/**
 * FAQ 视图
 *
 * 遵循 dev-frontend_patterns skill 规范。
 */

import React from "react";
import { useFAQ } from "../hooks/useFAQ";
import FAQPage from "../components/FAQPage/FAQPage";
import { Banner } from "@shared/components";
import { BANNER_TYPES } from "@shared/utils/constants";
import SupportSubmenu from "../components/SupportSubmenu";

/**
 * FAQ 视图组件
 */
export default function FAQView() {
  const faqData = useFAQ();

  return (
    <div className="flex flex-col w-full">
      <Banner
        bannerType={BANNER_TYPES.SUPPORT}
        sectionClassName="member-banner-section"
      />
      <SupportSubmenu />
      <FAQPage {...faqData} />
    </div>
  );
}
