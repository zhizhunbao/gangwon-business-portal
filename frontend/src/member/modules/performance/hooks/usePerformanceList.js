/**
 * Performance List Hook
 *
 * 处理成果列表的业务逻辑。
 * 遵循 dev-frontend_patterns skill 规范。
 */

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { performanceService } from "../services/performance.service";

export const usePerformanceList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [performances, setPerformances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [messageVariant, setMessageVariant] = useState("success");
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });
  const [filters, setFilters] = useState({ year: "", quarter: "", status: "" });
  const [commentModal, setCommentModal] = useState({
    open: false,
    comments: [],
    status: "",
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });

  const loadPerformances = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = {
          page,
          pageSize: pagination.pageSize,
        };
        if (filters.year) params.year = filters.year;
        if (filters.quarter) params.quarter = filters.quarter;
        if (filters.status) params.status = filters.status;

        const response = await performanceService.listRecords(params);
        setPerformances(response.items || []);
        setPagination((prev) => ({
          ...prev,
          page: response.page || page,
          total: response.total || 0,
          totalPages: response.totalPages || 0,
        }));
      } catch (error) {
        console.error("Load performances error:", error);
      } finally {
        setLoading(false);
      }
    },
    [filters, pagination.pageSize],
  );

  useEffect(() => {
    loadPerformances(1);
  }, [filters]);

  const handlePageChange = (newPage) => {
    loadPerformances(newPage);
  };

  const confirmDelete = async () => {
    try {
      await performanceService.deleteRecord(deleteConfirm.id);
      setMessageVariant("success");
      setMessage(t("message.deleteSuccess", "删除成功"));
      setDeleteConfirm({ open: false, id: null });
      loadPerformances(pagination.page);
    } catch (error) {
      console.error("Delete performance error:", error);
      setMessageVariant("error");
      setMessage(t("message.deleteFailed", "删除失败"));
    }
  };

  const getLatestReviewComments = (record) => {
    if (!record.reviews || record.reviews.length === 0) return [];
    const sortedReviews = [...record.reviews].sort(
      (a, b) => new Date(b.reviewedAt) - new Date(a.reviewedAt),
    );
    return sortedReviews.filter((r) => r.comments);
  };

  const showComments = (record) => {
    const reviews = getLatestReviewComments(record) || [];
    setCommentModal({ open: true, comments: reviews, status: record.status });
  };

  const setFilterField = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  return {
    performances,
    loading,
    message,
    setMessage,
    messageVariant,
    deleteConfirm,
    setDeleteConfirm,
    filters,
    setFilterField,
    commentModal,
    setCommentModal,
    pagination,
    handlePageChange,
    confirmDelete,
    showComments,
    getLatestReviewComments,
    navigate,
  };
};
