/**
 * About View - System Information
 * 系统介绍页面视图
 *
 * 遵循 dev-frontend_patterns skill 规范。
 */

import { Banner } from "@shared/components";
import { PageContainer } from "@member/layouts";
import { BANNER_TYPES } from "@shared/utils/constants";
import { useSystemInfo } from "../hooks/useSystemInfo";
import { SystemInfoDisplay } from "../components";

const AboutView = () => {
  const { htmlContent, loading, error } = useSystemInfo();

  return (
    <div className="about-view w-full flex flex-col">
      <Banner
        bannerType={BANNER_TYPES.ABOUT}
        sectionClassName="mb-16"
        height="400px"
        fullWidth={true}
      />

      <PageContainer className="pb-8" fullWidth={false}>
        <SystemInfoDisplay
          content={htmlContent}
          loading={loading}
          error={error}
        />
      </PageContainer>
    </div>
  );
};

export default AboutView;
