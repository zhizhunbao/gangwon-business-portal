/**
 * 项目模块 Banner
 *
 * 遵循 dev-frontend_patterns skill 规范。
 */

import { Banner } from "@shared/components";
import { BANNER_TYPES } from "@shared/utils/constants";

export function ProjectBanner({ sectionClassName }) {
  return (
    <Banner
      bannerType={BANNER_TYPES.PROJECTS}
      sectionClassName={sectionClassName}
    />
  );
}
