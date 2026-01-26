/**
 * 项目模块卡片组件
 *
 * 遵循 dev-frontend_patterns skill 规范。
 */

import { Card } from "@shared/components";

export function ProjectCard({ children, className }) {
  return <Card className={className}>{children}</Card>;
}
