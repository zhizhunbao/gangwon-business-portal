/*
 * StatisticsReportView - 统计报告主视图
 */
import { useTranslation } from "react-i18next";
import { useStatistics } from "../hooks/useStatistics";
import { useStatisticsFilters } from "../hooks/useStatisticsFilters";
import { FilterPanel } from "../components/Filter/FilterPanel";
import { FilterSummary } from "../components/Filter/FilterSummary";
import { ReportHeader } from "../components/Header/ReportHeader";
import { StatisticsTable } from "../components/Report/StatisticsTable";
import { ReportError } from "../components/Report/ReportError";

export const StatisticsReportView = () => {
  const { t } = useTranslation();

  // 1. 业务数据 Hooks
  const {
    data,
    params,
    loading,
    error,
    exporting,
    applyFilters,
    resetParams,
    changePage,
    changePageSize,
    changeSort,
    exportToExcel,
    totalItems,
    currentPage,
    totalPages,
  } = useStatistics();

  // 2. 筛选条件 UI Hooks
  const { filters, updateFilter, resetFilters, getFiltersSummary } =
    useStatisticsFilters();

  // 3. 交互处理器
  const handleReset = () => {
    resetFilters();
    resetParams();
  };

  const handleExport = async () => {
    const success = await exportToExcel();
    if (success) {
      alert(t("statistics.messages.exportSuccess"));
    }
  };

  return (
    <div className="w-full">
      {/* 1. 页头：参照标准行政管理页头 */}
      <ReportHeader
        loading={loading}
        exporting={exporting}
        onReset={handleReset}
        onExport={handleExport}
        onApply={() => applyFilters(filters)}
      />

      <main className="w-full space-y-5">
        {/* 2. 筛选面板：高度整合的紧凑卡片 */}
        <FilterPanel filters={filters} onFilterChange={updateFilter} />

        {/* 3. 结果汇总与表格 */}
        <div className="space-y-3">
          {/* 这里模仿业绩管理的“统计信息/摘要”条 */}
          <div className="flex justify-between items-center px-0.5">
            <FilterSummary summary={getFiltersSummary()} />
            {data.items.length > 0 && (
              <div className="text-[12px] text-gray-500 font-medium">
                {t('common.total', '합계')}{" "}
                <span className="text-blue-600 font-bold mx-0.5">
                  {totalItems}
                </span>{" "}
                {t('common.count', '건')}
              </div>
            )}
          </div>

          <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
            <ReportError
              message={error}
              onRetry={() => applyFilters(filters)}
            />

            {!error && (
              <StatisticsTable
                data={data.items}
                loading={loading}
                error={error}
                sortBy={params.sortBy}
                sortOrder={params.sortOrder}
                onSort={changeSort}
                page={currentPage}
                pageSize={params.pageSize}
                total={totalItems}
                totalPages={totalPages}
                onPageChange={changePage}
                onPageSizeChange={changePageSize}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
