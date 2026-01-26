/**
 * 申请记录筛选组件
 *
 * 遵循 dev-frontend_patterns skill 规范。
 */

import { useTranslation } from "react-i18next";
import { Card, SearchInput } from "@shared/components";

export function ApplicationRecordsFilter({
  allApplications,
  columns,
  onFilterChange,
  resultsCount,
}) {
  const { t } = useTranslation();

  return (
    <Card className="p-4 sm:p-5 lg:p-6 mb-4">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <SearchInput
          data={allApplications}
          columns={columns}
          onFilter={onFilterChange}
          placeholder={t(
            "projects.applicationRecords.searchPlaceholder",
            "按项目名称搜索",
          )}
          className="flex-1 min-w-[200px] max-w-md"
        />
        <div className="text-sm text-gray-600">
          {t("common.resultsCount", "共{{count}}条记录", {
            count: resultsCount,
          })}
        </div>
      </div>
    </Card>
  );
}
