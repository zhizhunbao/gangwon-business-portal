/**
 * FAQ 筛选组件
 *
 * 遵循 dev-frontend_patterns skill 规范。
 */

import React from "react";
import { useTranslation } from "react-i18next";
import { SearchInput } from "@shared/components";

export default function FAQFilter({
  categoryFilteredFaqs,
  columns,
  handleFilterChange,
  categories,
  selectedCategory,
  setSelectedCategory,
  categoryOptions,
}) {
  const { t } = useTranslation();

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center gap-4">
        <SearchInput
          data={categoryFilteredFaqs}
          columns={columns}
          onFilter={handleFilterChange}
          placeholder={t("support.faqSearchPlaceholder", "搜索问题或答案...")}
          className="flex-1 min-w-[200px] max-w-md"
        />
        {categories.length > 0 && (
          <div className="w-full sm:w-48">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            >
              {categoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
