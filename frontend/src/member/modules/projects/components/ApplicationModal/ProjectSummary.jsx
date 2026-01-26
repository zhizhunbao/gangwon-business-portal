/**
 * 申请项目摘要组件
 *
 * 显示申请弹窗顶部的项目信息摘要。
 * 遵循 dev-frontend_patterns skill 规范。
 */

import { useTranslation } from "react-i18next";
import { Badge } from "@shared/components";
import { DocumentIcon } from "@shared/components/Icons";
import { useProjectStatus } from "../../hooks/useProjectStatus";

export default function ProjectSummary({ project }) {
  const { getStatusInfo } = useProjectStatus();

  if (!project) return null;

  return (
    <div className="flex items-center gap-3 p-3 bg-primary-50 rounded-lg border border-primary-200">
      <DocumentIcon className="w-5 h-5 text-primary-600 flex-shrink-0" />
      <span className="flex-1 font-medium text-gray-900">{project.title}</span>
      {project.status && (
        <Badge
          variant={getStatusInfo(project.status).variant}
          className="text-xs"
        >
          {getStatusInfo(project.status).label}
        </Badge>
      )}
    </div>
  );
}
