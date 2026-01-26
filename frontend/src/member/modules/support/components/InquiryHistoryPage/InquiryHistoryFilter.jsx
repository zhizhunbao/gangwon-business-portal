/**
 * 咨询历史筛选组件
 *
 * 遵循 dev-frontend_patterns skill 规范。
 */

import React from "react";
import { useTranslation } from "react-i18next";
import { Card, SearchInput } from "@shared/components";

export default function InquiryHistoryFilter({
  allThreads,
  columns,
  handleFilterChange,
  statusFilter,
  setStatusFilter,
  statusOptions,
}) {
  const { t } = useTranslation();

  return (
    <Card className="p-4 sm:p-5 lg:p-6 mb-4">
      <div className="flex flex-wrap items-center gap-4">
        <SearchInput
          data={allThreads}
          columns={columns}
          onFilter={handleFilterChange}
          placeholder={t("support.searchPlaceholder", "搜索标题")}
          className="flex-1 min-w-[200px] max-w-md"
        />
        <div className="w-full sm:w-48 sm:flex-shrink-0">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </Card>
  );
}
