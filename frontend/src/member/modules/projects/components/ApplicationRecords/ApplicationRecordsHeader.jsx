/**
 * 申请记录页头部
 *
 * 遵循 dev-frontend_patterns skill 规范。
 */

import { useTranslation } from "react-i18next";

export function ApplicationRecordsHeader() {
  const { t } = useTranslation();

  return (
    <div className="mb-6 sm:mb-8 lg:mb-10 min-h-[48px] flex items-center">
      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 m-0">
        {t("projects.applicationRecords.title", "申请记录")}
      </h1>
    </div>
  );
}
