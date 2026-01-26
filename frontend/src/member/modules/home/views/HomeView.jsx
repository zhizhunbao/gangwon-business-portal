/**
 * 首页视图组件
 *
 * 遵循 dev-frontend_patterns skill 规范。
 */

import React from "react";
import { Banner } from "@shared/components";
import { BANNER_TYPES } from "@shared/utils/constants";
import HomePage from "../components/HomePage/HomePage";

/**
 * 首页视图 - 负责组合 Banner 和 HomePage
 */
export default function HomeView() {
  return (
    <div className="home-view w-full flex flex-col">
      {/* 主横幅(1) - 大尺寸，全宽 */}
      <Banner
        bannerType={BANNER_TYPES.MAIN_PRIMARY}
        sectionClassName="mb-16"
        height="400px"
        fullWidth={true}
      />

      <HomePage />
    </div>
  );
}
