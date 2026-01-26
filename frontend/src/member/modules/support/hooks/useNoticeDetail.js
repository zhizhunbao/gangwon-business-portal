/**
 * 公告详情业务逻辑 Hook
 *
 * 遵循 dev-frontend_patterns skill 规范。
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supportService } from "../services/support.service";
import { ROUTES } from "@shared/utils/constants";

/**
 * 获取公告详情的 Hook
 */
export function useNoticeDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadNotice() {
      if (!id) return;

      setLoading(true);
      setError(null);
      try {
        const detail = await supportService.getNotice(id);
        if (detail) {
          setNotice({
            id: detail.id,
            title: detail.title,
            contentHtml: detail.contentHtml || "",
            date: detail.createdAt,
            important: detail.boardType === "notice",
            viewCount: detail.viewCount || detail.view_count || 0,
            attachments: detail.attachments || [],
          });
        } else {
          setError(t("common.notFound", "未找到该公告"));
        }
      } catch (err) {
        console.error("Failed to load notice:", err);
        setError(t("common.error", "加载失败"));
      } finally {
        setLoading(false);
      }
    }

    loadNotice();
  }, [id, t]);

  const handleBack = () => {
    navigate(ROUTES.MEMBER_SUPPORT_NOTICES);
  };

  const handleDownload = (attachment) => {
    const url = attachment.fileUrl;
    const fileName = attachment.fileName || "download";

    if (!url) {
      console.error("No file URL found for attachment:", attachment);
      return;
    }

    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return {
    notice,
    loading,
    error,
    handleBack,
    handleDownload,
  };
}
