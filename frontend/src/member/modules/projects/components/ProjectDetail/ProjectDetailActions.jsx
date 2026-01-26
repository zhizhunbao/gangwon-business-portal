/**
 * 项目详情操作组件
 *
 * 显示项目相关的操作按钮（如申请）。
 * 遵循 dev-frontend_patterns skill 规范。
 */

import { useTranslation } from "react-i18next";
import { Button } from "@shared/components";
import { ProjectStatus } from "../../enums";

export default function ProjectDetailActions({ project, onApply }) {
  const { t } = useTranslation();

  if (!project || project.status !== ProjectStatus.ACTIVE) {
    return null;
  }

  return (
    <div className="border-t border-gray-200 pt-6 mt-6">
      <Button onClick={() => onApply(project.id)} className="w-full md:w-auto">
        {t("projects.apply", "申请该项目")}
      </Button>
    </div>
  );
}
