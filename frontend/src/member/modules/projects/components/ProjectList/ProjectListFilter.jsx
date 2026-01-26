/**
 * 项目列表筛选组件
 *
 * 遵循 dev-frontend_patterns skill 规范。
 */

import { useTranslation } from "react-i18next";
import { Card, SearchInput } from "@shared/components";

export function ProjectListFilter({
  allProjects,
  columns,
  onFilterChange,
  resultsCount,
}) {
  const { t } = useTranslation();

  return (
    <Card className="p-4 sm:p-5 lg:p-6 mb-4">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <SearchInput
          data={allProjects}
          columns={columns}
          onFilter={onFilterChange}
          placeholder={t("projects.searchPlaceholder", "按标题/内容搜索")}
          className="flex-1 min-w-[200px] max-w-md"
          debounceMs={300}
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
