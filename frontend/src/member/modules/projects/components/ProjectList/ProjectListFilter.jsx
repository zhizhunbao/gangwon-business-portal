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
          placeholder={t('projects.searchPlaceholder', '사업명 또는 키워드로 검색')}
          className="flex-1 min-w-[200px] max-w-md"
          debounceMs={300}
        />
        <div className="text-sm text-gray-600">
          {t("common.resultsCount", "총 {{count}}건", {
            count: resultsCount,
          })}
        </div>
      </div>
    </Card>
  );
}
