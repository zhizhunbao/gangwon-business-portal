/**
 * 支援事业预览 Hook
 *
 * 遵循 dev-frontend_patterns skill 规范。
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { homeService } from "../services/home.service";
import { formatDate } from "@shared/utils";
import { ROUTES } from "@shared/utils/constants";

/**
 * 处理支援事业预览逻辑的 Hook
 */
export function useProjectPreview() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const response = await homeService.listProjects({
        page: 1,
        pageSize: 4,
      });

      if (response.items) {
        const formattedProjects = response.items.map((p) => ({
          id: p.id,
          title: p.title,
          date: formatDate(p.createdAt, "yyyy-MM-dd", i18n.language),
          status: p.status || "active",
          imageUrl: p.imageUrl,
          attachments: p.attachments || [],
        }));
        setProjects(formattedProjects);
      }
    } catch (error) {
      console.error("Load projects error:", error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [i18n.language]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const getBadgeInfo = useCallback(
    (project) => {
      const statusMap = {
        active: {
          text: t("projects.status.active", "进行中"),
          variant: "success",
        },
        inactive: {
          text: t("projects.status.inactive", "已结束"),
          variant: "secondary",
        },
        archived: {
          text: t("projects.status.archived", "已归档"),
          variant: "secondary",
        },
      };
      return statusMap[project.status] || statusMap.active;
    },
    [t],
  );

  const handleProjectClick = useCallback(
    (projectId) => {
      navigate(`${ROUTES.MEMBER_PROJECTS}/${projectId}`);
    },
    [navigate],
  );

  return {
    projects,
    loading,
    getBadgeInfo,
    handleProjectClick,
    t,
  };
}
