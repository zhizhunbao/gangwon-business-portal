/**
 * FAQ 页面组件 (内容组件)
 *
 * 遵循 dev-frontend_patterns skill 规范。
 */

import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardBody } from "@shared/components";
import { PageContainer } from "@member/layouts";

import FAQFilter from "./FAQFilter";
import FAQItem from "./FAQItem";

/**
 * FAQ 页面主体渲染组件 (内容)
 */
export default function FAQPage(props) {
  const { t } = useTranslation();
  const {
    filteredFaqs,
    loading,
    expandedIds,
    selectedCategory,
    categories,
    categoryTranslations,
    categoryOptions,
    categoryFilteredFaqs,
    setSelectedCategory,
    handleFilterChange,
    toggleExpand,
  } = props;

  // 定义搜索列
  const columns = useMemo(
    () => [
      {
        key: "question",
        render: (value, row) => row.question || row.title || "",
      },
      {
        key: "answer",
        render: (value, row) => row.answer || row.content || "",
      },
      {
        key: "category",
        render: (value) => categoryTranslations[value] || value || "",
      },
    ],
    [categoryTranslations],
  );

  return (
    <PageContainer className="pb-8">
      <div className="w-full">
        <div className="mb-6 border-b border-gray-100 pb-4">
          <h1 className="text-2xl font-bold text-gray-900">
            {t("support.faq", "FAQ")}
          </h1>
        </div>

        <FAQFilter
          categoryFilteredFaqs={categoryFilteredFaqs}
          columns={columns}
          handleFilterChange={handleFilterChange}
          categories={categories}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          categoryOptions={categoryOptions}
        />

        <Card>
          <CardBody>
            <p className="text-sm text-gray-600 mb-4">
              {t("common.resultsCount", "共{{count}}条记录", {
                count: filteredFaqs.length,
              })}
            </p>

            {loading ? (
              <div className="text-center py-12 text-gray-500">
                {t("common.loading", "加载中...")}
              </div>
            ) : filteredFaqs.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                {t("support.noFaqResults", "没有找到匹配的问题")}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredFaqs.map((faq) => (
                  <FAQItem
                    key={faq.id}
                    faq={faq}
                    isExpanded={expandedIds.has(faq.id)}
                    toggleExpand={toggleExpand}
                    categoryTranslations={categoryTranslations}
                  />
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </PageContainer>
  );
}
