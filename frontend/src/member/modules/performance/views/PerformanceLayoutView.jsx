/**
 * Performance Layout View
 *
 * 成果管理模块布局容器。
 * 遵循 dev-frontend_patterns skill 规范。
 */

import React from "react";
import { useTranslation } from "react-i18next";
import { Outlet } from "react-router-dom";
import { Banner, Submenu } from "@shared/components";
import { BANNER_TYPES } from "@shared/utils/constants";
import { PageContainer } from "@member/layouts";

const PerformanceLayoutView = () => {
  const { t } = useTranslation();

  const submenuItems = [
    {
      key: "company-info",
      label: t("performance.companyInfo.title", "企业信息"),
      path: "/member/performance/company-info",
      isTab: true,
    },
    {
      key: "performance-input",
      label: t("performance.input", "成果输入"),
      path: "/member/performance/edit",
      isTab: true,
    },
    {
      key: "performance-query",
      label: t("performance.query", "成果查询"),
      path: "/member/performance/list",
      isTab: true,
    },
  ];

  return (
    <div className="performance-module w-full flex flex-col relative">
      <Banner
        bannerType={BANNER_TYPES.PERFORMANCE}
        sectionClassName="member-banner-section"
      />

      <Submenu items={submenuItems} renderLeft={() => null} />

      <PageContainer>
        <div className="w-full">
          <Outlet />
        </div>
      </PageContainer>
    </div>
  );
};

export default PerformanceLayoutView;
