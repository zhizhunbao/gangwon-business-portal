/**
 * 最新公告预览 Hook
 *
 * 遵循 dev-frontend_patterns skill 规范。
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { formatDate } from "@shared/utils";
import { homeService } from "../services/home.service";
import { ROUTES } from "@shared/utils/constants";

/**
 * 处理最新公告预览逻辑的 Hook
 */
export function useNoticesPreview() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadNotices = useCallback(async () => {
    setLoading(true);
    try {
      const response = await homeService.getLatestNotices();
      const noticesData = Array.isArray(response)
        ? response
        : response.items || [];

      if (Array.isArray(noticesData) && noticesData.length > 0) {
        const formattedNotices = noticesData.slice(0, 4).map((n) => ({
          id: n.id,
          title: n.title,
          date: n.createdAt ? formatDate(n.createdAt) : "",
          important: n.boardType === "notice",
          attachments: n.attachments || [],
        }));
        setNotices(formattedNotices);
      } else {
        setNotices([]);
      }
    } catch (error) {
      console.error("Load notices error:", error);
      setNotices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotices();
  }, [loadNotices]);

  const getBadgeInfo = useCallback(
    (notice) => {
      return {
        variant: notice.important ? "danger" : "gray",
        text: notice.important
          ? t("home.notices.important", "重要")
          : t("home.notices.normal", "一般"),
      };
    },
    [t],
  );

  const handleNoticeClick = useCallback(
    (noticeId) => {
      navigate(`${ROUTES.MEMBER_SUPPORT_NOTICES}/${noticeId}`);
    },
    [navigate],
  );

  return {
    notices,
    loading,
    getBadgeInfo,
    handleNoticeClick,
    t,
  };
}
