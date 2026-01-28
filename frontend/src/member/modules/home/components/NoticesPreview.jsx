/**
 * 公告事项预览组件
 *
 * 遵循 dev-frontend_patterns skill 规范。
 */

import React from "react";
import HomePreview from "@shared/components/HomePreview";
import { ROUTES } from "@shared/utils/constants";
import { useNoticesPreview } from "../hooks/useNoticesPreview";

/**
 * 公告事项展示组件
 */
export default function NoticesPreview() {
  const { notices, loading, getBadgeInfo, handleNoticeClick, t } =
    useNoticesPreview();

  return (
    <HomePreview
      title={t('home.notices.title', '공지사항')}
      viewAllLink={ROUTES.MEMBER_SUPPORT_NOTICES}
      items={notices}
      loading={loading}
      emptyMessage={t('home.notices.empty', '공고가 없습니다')}
      onItemClick={handleNoticeClick}
      getBadgeInfo={getBadgeInfo}
      showModal={false}
    />
  );
}
