/**
 * 项目详情错误态
 *
 * 遵循 dev-frontend_patterns skill 规范。
 */

import { useTranslation } from "react-i18next";
import { Card, Button } from "@shared/components";

export function ProjectDetailError({ error, onBack }) {
  const { t } = useTranslation();

  return (
    <Card className="p-8 text-center">
      <p className="text-red-500 mb-4">
        {error || t("common.notFound", "未找到该项目")}
      </p>
      <button
        onClick={onBack}
        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
      >
        {t("common.back", "返回")}
      </button>
    </Card>
  );
}
