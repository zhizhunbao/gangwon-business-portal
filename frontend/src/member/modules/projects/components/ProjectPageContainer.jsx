/**
 * 项目模块页面布局容器
 *
 * 遵循 dev-frontend_patterns skill 规范。
 */

import { PageContainer } from "@member/layouts";

export function ProjectPageContainer({ children, className, fullWidth }) {
  return (
    <PageContainer className={className} fullWidth={fullWidth}>
      {children}
    </PageContainer>
  );
}
