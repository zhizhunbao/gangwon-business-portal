/**
 * FAQ 业务逻辑 Hook
 *
 * 遵循 dev-frontend_patterns skill 规范。
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supportService } from "../services/support.service";

/**
 * FAQ 逻辑控制 Hook
 */
export function useFAQ() {
  const { t } = useTranslation();
  const [allFaqs, setAllFaqs] = useState([]);
  const [filteredFaqs, setFilteredFaqs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [selectedCategory, setSelectedCategory] = useState("");

  const handleFilterChange = useCallback((filtered) => {
    setFilteredFaqs(filtered);
  }, []);

  const loadFAQs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await supportService.listFAQs({});
      setAllFaqs(response.items);
      setFilteredFaqs(response.items);
    } catch (error) {
      console.error("Failed to load FAQs:", error);
      setAllFaqs([]);
      setFilteredFaqs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFAQs();
  }, [loadFAQs]);

  // 获取所有分类
  const categories = useMemo(() => {
    const categorySet = new Set();
    allFaqs.forEach((faq) => {
      if (faq.category) {
        categorySet.add(faq.category);
      }
    });
    return Array.from(categorySet);
  }, [allFaqs]);

  // FAQ 分类翻译映射
  const categoryTranslations = useMemo(
    () => ({
      회원가입: t("support.faqCategory.registration", "会员注册"),
      general: t("support.faqCategory.general", "一般"),
      성과관리: t("support.faqCategory.performance", "业绩管理"),
      프로젝트: t("support.faqCategory.project", "项目"),
      기업프로필: t("support.faqCategory.profile", "企业资料"),
      "문의/지원": t("support.faqCategory.support", "咨询/支持"),
      기타: t("support.faqCategory.other", "其他"),
    }),
    [t],
  );

  // 分类选项
  const categoryOptions = useMemo(
    () => [
      { value: "", label: t("common.all", "全部") },
      ...categories.map((cat) => ({
        value: cat,
        label: categoryTranslations[cat] || cat,
      })),
    ],
    [categories, t, categoryTranslations],
  );

  // 按分类过滤
  const categoryFilteredFaqs = useMemo(() => {
    if (!selectedCategory) return allFaqs;
    return allFaqs.filter((faq) => faq.category === selectedCategory);
  }, [allFaqs, selectedCategory]);

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
    allFaqs,
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
    loadFAQs,
  };
}
