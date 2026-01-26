/**
 * 项目列表项组件
 *
 * 显示单个项目的概览信息，包括标题、描述、状态、关联企业（如有）和操作按钮。
 * 遵循 dev-frontend_patterns skill 规范。
 */

import { useTranslation } from "react-i18next";
import { Badge, Button, Card } from "@shared/components";
import { formatDate } from "@shared/utils";
import { ProjectStatus } from "../../enums";
import { useProjectStatus } from "../../hooks/useProjectStatus";

export default function ProjectListItem({ project, onApply, onDetail }) {
  const { t } = useTranslation();
  const { getStatusInfo } = useProjectStatus();

  const statusInfo = project.status ? getStatusInfo(project.status) : null;

  return (
    <Card
      className="p-4 sm:p-5 lg:p-6 transition-shadow duration-200 ease-in-out hover:shadow-md cursor-pointer hover:border-blue-300"
      onClick={() => onDetail(project.id)}
    >
      <div className="flex justify-between items-start gap-4 mb-4 sm:mb-5 lg:mb-6 pb-4 border-b border-gray-200">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold text-gray-900 m-0 leading-snug mb-2 sm:mb-3 lg:mb-4 break-words">
            {project.title}
          </h2>
          <div className="flex flex-wrap gap-2 sm:gap-3 lg:gap-4 items-center">
            {statusInfo && (
              <Badge
                variant={statusInfo.variant}
                className="text-xs sm:text-sm"
              >
                {statusInfo.label}
              </Badge>
            )}
          </div>
        </div>
        <span className="text-sm text-gray-500 whitespace-nowrap flex-shrink-0">
          {project.startDate && project.endDate
            ? `${formatDate(project.startDate)} - ${formatDate(project.endDate)}`
            : project.createdAt
              ? formatDate(project.createdAt)
              : ""}
        </span>
      </div>

      <div className="mb-4 sm:mb-5 lg:mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {project.imageUrl && (
            <div className="flex-shrink-0 w-full md:w-48 lg:w-56">
              <img
                src={project.imageUrl}
                alt={project.title}
                className="w-full h-32 md:h-36 lg:h-40 object-cover rounded-lg"
              />
            </div>
          )}
          <div className="flex-1">
            <p className="text-[0.9375rem] text-gray-700 leading-relaxed m-0 whitespace-pre-line">
              {project.description || ""}
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 sm:pt-5 lg:pt-6 border-t border-gray-200">
        <Button
          onClick={(e) => {
            e.stopPropagation();
            onApply(project);
          }}
          variant="primary"
          disabled={project.status !== ProjectStatus.ACTIVE}
        >
          {project.status === ProjectStatus.ACTIVE
            ? t("projects.apply", "程序申请")
            : t("projects.notAvailable", "不可申请")}
        </Button>
      </div>
    </Card>
  );
}
