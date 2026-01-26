/**
 * 项目详情内容组件
 *
 * 显示项目标题、元数据、图片和HTML内容。
 * 遵循 dev-frontend_patterns skill 规范。
 */

import { useTranslation } from "react-i18next";
import { Badge } from "@shared/components";
import { formatDate } from "@shared/utils";
import { useProjectStatus } from "../../hooks/useProjectStatus";

export default function ProjectDetailContent({ project }) {
  const { i18n } = useTranslation();
  const { getStatusInfo } = useProjectStatus();

  if (!project) return null;

  const badgeInfo = getStatusInfo(project.status);

  return (
    <>
      {/* 封面图片 */}
      {project.imageUrl && (
        <div className="w-full rounded-lg overflow-hidden mb-6">
          <img
            src={project.imageUrl}
            alt={project.title}
            className="w-full h-auto object-cover max-h-[400px]"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        </div>
      )}

      {/* 标题 */}
      <h1 className="text-xl md:text-2xl font-bold text-gray-900 m-0 mb-4">
        {project.title}
      </h1>

      {/* 元信息 */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 pb-4 border-b border-gray-200 mb-6">
        <Badge variant={badgeInfo.variant}>{badgeInfo.label}</Badge>
        {project.date && (
          <span>{formatDate(project.date, "yyyy-MM-dd", i18n.language)}</span>
        )}
      </div>

      {/* 内容 */}
      {project.contentHtml && (
        <div
          className="prose prose-sm md:prose max-w-none mb-6"
          dangerouslySetInnerHTML={{ __html: project.contentHtml }}
        />
      )}
    </>
  );
}
