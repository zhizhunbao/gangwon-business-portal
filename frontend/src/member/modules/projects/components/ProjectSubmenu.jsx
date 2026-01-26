/**
 * 项目模块子菜单
 *
 * 遵循 dev-frontend_patterns skill 规范。
 */

import { useTranslation } from "react-i18next";
import { Submenu } from "@shared/components";

export function ProjectSubmenu() {
  const { t } = useTranslation();

  const submenuItems = [
    {
      key: "project-list",
      label: t("projects.tabs.projectList", "사업 목록"),
      path: "/member/programs",
      activePaths: ["/member/programs", "/member/project"],
      isTab: true,
      exact: true,
    },
    {
      key: "application-records",
      label: t("projects.tabs.applicationRecords", "신청 기록"),
      path: "/member/programs/applications",
      activePaths: ["/member/programs/applications"],
      isTab: true,
    },
  ];

  return <Submenu items={submenuItems} renderLeft={() => null} />;
}
