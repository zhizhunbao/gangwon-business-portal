/**
 * 公告列表业务逻辑 Hook
 *
 * 遵循 dev-frontend_patterns skill 规范。
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supportService } from "../services/support.service";
import { ROUTES } from "@shared/utils/constants";
import { formatDateTime } from "@shared/utils";

/**
 * 获取公告列表的 Hook
 */
export function useNotices(pageSize = 20) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);

  const loadNotices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await supportService.listNotices({
        page: currentPage,
        pageSize: pageSize,
      });

      const noticesData = response.items || [];
      if (Array.isArray(noticesData)) {
        const formattedNotices = noticesData.map((n) => ({
          id: n.id,
          title: n.title,
          date: n.createdAt
            ? formatDateTime(n.createdAt, "yyyy-MM-dd HH:mm", i18n.language)
            : "",
          important: n.boardType === "notice",
          attachments: n.attachments || [],
        }));
        setNotices(formattedNotices);
        setTotalPages(response.totalPages || 0);
        setTotal(response.total || 0);
      } else {
        setNotices([]);
      }
    } catch (err) {
      console.error("Failed to load notices:", err);
      setError(t("common.error", "加载失败"));
    } finally {
      setLoading(false);
    }
  }, [currentPage, i18n.language, t, pageSize]);

  useEffect(() => {
    loadNotices();
  }, [loadNotices]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNoticeClick = (noticeId) => {
    navigate(`${ROUTES.MEMBER_SUPPORT_NOTICES}/${noticeId}`);
  };

  return {
    notices,
    loading,
    error,
    currentPage,
    totalPages,
    total,
    handlePageChange,
    handleNoticeClick,
    loadNotices,
  };
}
