/**
 * 公告事项列表视图
 *
 * 遵循 dev-frontend_patterns skill 规范。
 */

import React from "react";
import { useNotices } from "../hooks/useNotices";
import NoticesPage from "../components/NoticesPage/NoticesPage";
import { Banner } from "@shared/components";
import { BANNER_TYPES } from "@shared/utils/constants";
import SupportSubmenu from "../components/SupportSubmenu";

/**
 * 公告事项列表视图组件
 */
export default function NoticesView() {
  const noticesData = useNotices();

  return (
    <div className="flex flex-col w-full">
      <Banner
        bannerType={BANNER_TYPES.SUPPORT}
        sectionClassName="member-banner-section"
      />
      <SupportSubmenu />
      <NoticesPage {...noticesData} />
    </div>
  );
}
