/*
 * FilterSummary - 已选筛选条件摘要组件
 */
import { useTranslation } from "react-i18next";

export const FilterSummary = ({ summary }) => {
  const { t } = useTranslation();

  if (!summary || summary.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 px-1">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mr-1">
        {t("statistics.filters.title")}:
      </span>
      {summary.map((item, index) => (
        <span
          key={index}
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 shadow-sm"
        >
          {item}
        </span>
      ))}
    </div>
  );
};
