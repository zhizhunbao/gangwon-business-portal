/**
 * 项目列表内容组件
 *
 * 处理加载中、无数据及列表渲染。
 * 遵循 dev-frontend_patterns skill 规范。
 */

import { useTranslation } from "react-i18next";
import { Card } from "@shared/components";
import ProjectListItem from "./ProjectListItem";

export function ProjectList({
  projects,
  loading,
  hasProjects,
  onApply,
  onDetail,
}) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <Card>
        <div className="text-center py-12 px-4">
          <p className="text-base text-gray-500 m-0">
            {t("common.loading", "加载中...")}
          </p>
        </div>
      </Card>
    );
  }

  if (projects.length === 0) {
    return (
      <Card>
        <div className="text-center py-12 px-4">
          <p className="text-base text-gray-500 m-0">
            {!hasProjects
              ? t("common.noData", "暂无数据")
              : t("common.noSearchResults", "没有找到匹配的结果")}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-5 lg:gap-6">
      {projects.map((project) => (
        <ProjectListItem
          key={project.id}
          project={project}
          onApply={onApply}
          onDetail={onDetail}
        />
      ))}
    </div>
  );
}
