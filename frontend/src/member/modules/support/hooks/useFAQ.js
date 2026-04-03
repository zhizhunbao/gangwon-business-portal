/**
 * FAQ 业务逻辑 Hook
 *
 * 遵循 dev-frontend_patterns skill 规范。
 */

import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supportService } from "../services/support.service";
import { useApiCache, usePagination } from "@shared/hooks";

/**
 * FAQ 逻辑控制 Hook
 */
export function useFAQ(pageSize = 10) {
  const { t } = useTranslation();
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [selectedCategory, setSelectedCategory] = useState("");
  const [filteredFaqs, setFilteredFaqs] = useState([]);

  const fetchFAQs = useCallback(async () => {
    const response = await supportService.listFAQs({});
    return response.items || [];
  }, []);

  const {
    data: allFaqs,
    loading,
    error,
    refresh: loadFAQs,
  } = useApiCache(fetchFAQs, "faq-list", {
    cacheDuration: 5 * 60 * 1000, // 5分钟缓存（FAQ 很少更新）
    enabled: true,
  });

  // 使用 useMemo 确保返回稳定的数组引用
  const stableAllFaqs = useMemo(() => allFaqs ?? [], [allFaqs]);

  // 获取所有分类
  const categories = useMemo(() => {
    const categorySet = new Set();
    stableAllFaqs.forEach((faq) => {
      if (faq.category) {
        categorySet.add(faq.category);
      }
    });
    return Array.from(categorySet);
  }, [stableAllFaqs]);

  // FAQ 分类翻译映射（支持韩文和英文两种 category key）
  const categoryTranslations = useMemo(
    () => ({
      // 韩文 category key
      회원가입: t("member.support.faqCategory.registration", "회원가입"),
      general: t("member.support.faqCategory.general", "일반"),
      성과관리: t("member.support.faqCategory.performance", "성과관리"),
      프로젝트: t("member.support.faqCategory.project", "지원사업"),
      기업프로필: t("member.support.faqCategory.profile", "기업프로필"),
      "문의/지원": t("member.support.faqCategory.support", "문의/지원"),
      기타: t("member.support.faqCategory.other", "기타"),
      // 영문 category key (관리자 FAQ 등록 시 사용)
      registration: t("member.support.faqCategory.registration", "회원가입"),
      performance: t("member.support.faqCategory.performance", "성과관리"),
      project: t("member.support.faqCategory.project", "지원사업"),
      technical: t("member.support.faqCategory.technical", "기술지원"),
      support: t("member.support.faqCategory.support", "문의/지원"),
      other: t("member.support.faqCategory.other", "기타"),
    }),
    [t],
  );

  // 分类选项
  const categoryOptions = useMemo(
    () => [
      { value: "", label: t("common.all", "전체") },
      ...categories.map((cat) => ({
        value: cat,
        label: categoryTranslations[cat] || cat,
      })),
    ],
    [categories, t, categoryTranslations],
  );

  // 按分类过滤
  const categoryFilteredFaqs = useMemo(() => {
    if (!selectedCategory) return stableAllFaqs;
    return stableAllFaqs.filter((faq) => faq.category === selectedCategory);
  }, [stableAllFaqs, selectedCategory]);

  // 最终过滤后的 FAQ
  const allFilteredFaqs =
    filteredFaqs.length > 0 ? filteredFaqs : categoryFilteredFaqs;

  // 使用共享的分页 hook
  const pagination = usePagination({ items: allFilteredFaqs, pageSize });
  const { resetPage } = pagination;

  const handleFilterChange = useCallback(
    (filtered) => {
      setFilteredFaqs(filtered);
      resetPage();
    },
    [resetPage],
  );

  // 分类筛选改变时重置页码
  const handleCategoryChange = useCallback(
    (value) => {
      setSelectedCategory(value);
      resetPage();
    },
    [resetPage],
  );

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  return {
    allFaqs: stableAllFaqs,
    filteredFaqs: pagination.paginatedItems,
    loading,
    expandedIds,
    selectedCategory,
    categories,
    categoryTranslations,
    categoryOptions,
    categoryFilteredFaqs,
    setSelectedCategory: handleCategoryChange,
    handleFilterChange,
    toggleExpand,
    loadFAQs,
    // 分页相关
    total: pagination.total,
    currentPage: pagination.currentPage,
    totalPages: pagination.totalPages,
    pageSize: pagination.pageSize,
    onPageChange: pagination.onPageChange,
  };
}
