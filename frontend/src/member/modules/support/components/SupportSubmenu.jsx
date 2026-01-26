/**
 * Support 模块共用二级导航组件
 *
 * 遵循 dev-frontend_patterns skill 规范。
 */

import React from "react";
import { useTranslation } from "react-i18next";
import { Submenu } from "@shared/components";
import { ROUTES } from "@shared/utils/constants";

export default function SupportSubmenu() {
  const { t } = useTranslation();

  const items = [
    {
      key: "support-notices",
      path: ROUTES.MEMBER_NOTICES,
      label: t("home.notices.title"),
      activePaths: [ROUTES.MEMBER_NOTICES],
    },
    {
      key: "support-faq",
      path: "/member/support/faq",
      label: t("support.faq"),
      activePaths: ["/member/support/faq"],
    },
    {
      key: "support-inquiry",
      path: "/member/support/inquiry",
      label: t("support.inquiry"),
      activePaths: ["/member/support/inquiry"],
      exact: true,
    },
    {
      key: "support-inquiry-history",
      path: "/member/support/inquiry-history",
      label: t("support.inquiryHistory"),
      activePaths: ["/member/support/inquiry-history"],
    },
  ];

  return (
    <Submenu
      items={items}
      className="support-submenu bg-white shadow-sm border-b border-gray-100"
    />
  );
}
