/**
 * FAQ 项目组件
 *
 * 遵循 dev-frontend_patterns skill 规范。
 */

import React from "react";
import { useTranslation } from "react-i18next";
import {
  EyeIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@shared/components/Icons";

export default function FAQItem({
  faq,
  isExpanded,
  toggleExpand,
  categoryTranslations,
}) {
  const { t } = useTranslation();

  return (
    <div
      className={`border rounded-lg overflow-hidden transition-all ${
        isExpanded ? "border-primary-300 shadow-sm" : "border-gray-200"
      }`}
    >
      <div
        className={`flex items-center justify-between gap-4 p-4 cursor-pointer hover:bg-gray-50 ${
          isExpanded ? "bg-primary-50" : ""
        }`}
        onClick={() => toggleExpand(faq.id)}
      >
        <div className="flex-1 min-w-0">
          <h3 className="m-0 text-base font-medium text-gray-900 truncate">
            Q: {faq.question || faq.title}
          </h3>
          {faq.category && (
            <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
              {categoryTranslations[faq.category] || faq.category}
            </span>
          )}
        </div>
        <button className="flex-shrink-0 p-1 bg-transparent border-none">
          {isExpanded ? (
            <ChevronUpIcon className="w-5 h-5 text-primary-600" />
          ) : (
            <ChevronDownIcon className="w-5 h-5 text-gray-400" />
          )}
        </button>
      </div>
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <p className="m-0 text-gray-700 leading-relaxed pt-4 whitespace-pre-wrap">
            A: {faq.answer || faq.content}
          </p>
          {faq.views !== undefined && (
            <div className="flex items-center gap-2 mt-3 pt-3 text-sm text-gray-500 border-t border-gray-100">
              <EyeIcon className="w-4 h-4 text-gray-400" />
              <span>
                {faq.views} {t("support.viewsLabel", "次浏览")}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
