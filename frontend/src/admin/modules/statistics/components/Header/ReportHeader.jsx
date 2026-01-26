/*
 * ReportHeader - 统计报告页头组件
 */
import { useTranslation } from "react-i18next";
import { Button } from "@shared/components";
export const ReportHeader = ({
  loading,
  exporting,
  onReset,
  onExport,
  onApply,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          {t("statistics.title")}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {t("statistics.subtitle")}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          disabled={loading}
          className="text-gray-600 border-gray-300"
        >
          {t("statistics.filters.reset")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          disabled={loading || exporting}
          className="text-gray-600 border-gray-300"
          loading={exporting}
        >
          {!exporting && (
            <svg
              className="-ml-1 mr-1.5 h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              ></path>
            </svg>
          )}
          {t("statistics.filters.export")}
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={onApply}
          disabled={loading}
          loading={loading}
          className="px-6 bg-blue-600 hover:bg-blue-700"
        >
          {t("statistics.filters.apply")}
        </Button>
      </div>
    </div>
  );
};
