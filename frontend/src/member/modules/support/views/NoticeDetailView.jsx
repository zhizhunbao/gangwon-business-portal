/**
 * 公告详情视图
 *
 * 遵循 dev-frontend_patterns skill 规范。
 */

import React from "react";
import { useNoticeDetail } from "../hooks/useNoticeDetail";
import NoticeDetailPage from "../components/NoticeDetailPage/NoticeDetailPage";
import { Banner } from "@shared/components";
import { BANNER_TYPES } from "@shared/utils/constants";
import SupportSubmenu from "../components/SupportSubmenu";

/**
 * 公告详情视图组件
 */
export default function NoticeDetailView() {
  const noticeDetailData = useNoticeDetail();

  return (
    <div className="flex flex-col w-full">
      <Banner
        bannerType={BANNER_TYPES.SUPPORT}
        sectionClassName="member-banner-section"
      />
      <SupportSubmenu />
      <NoticeDetailPage {...noticeDetailData} />
    </div>
  );
}
