/**
 * 项目详情返回按钮
 *
 * 遵循 dev-frontend_patterns skill 规范。
 */

import { useTranslation } from "react-i18next";
import { ArrowLeftIcon } from "@shared/components/Icons";

export function ProjectDetailBackButton({ onClick }) {
  const { t } = useTranslation();

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors mb-6 bg-transparent border-none cursor-pointer p-0"
    >
      <ArrowLeftIcon className="w-4 h-4" />
      <span>{t("common.backToList", "返回列表")}</span>
    </button>
  );
}
