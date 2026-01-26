/**
 * 项目详情加载态
 *
 * 遵循 dev-frontend_patterns skill 规范。
 */

import { Loading } from "@shared/components";

export function ProjectDetailLoading() {
  return (
    <div className="flex justify-center items-center py-16">
      <Loading />
    </div>
  );
}
