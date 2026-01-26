/**
 * 支援事业公告预览组件
 *
 * 遵循 dev-frontend_patterns skill 规范。
 */

import React from "react";
import HomePreview from "@shared/components/HomePreview";
import { ROUTES } from "@shared/utils/constants";
import { useProjectPreview } from "../hooks/useProjectPreview";

/**
 * 支援事业预览展示组件
 */
export default function ProjectPreview() {
  const { projects, loading, getBadgeInfo, handleProjectClick, t } =
    useProjectPreview();

  return (
    <HomePreview
      title={t("home.news.title")}
      viewAllLink={ROUTES.MEMBER_PROJECTS}
      items={projects}
      loading={loading}
      emptyMessage={t("home.news.empty")}
      getBadgeInfo={getBadgeInfo}
      onItemClick={handleProjectClick}
      showModal={false}
    />
  );
}
