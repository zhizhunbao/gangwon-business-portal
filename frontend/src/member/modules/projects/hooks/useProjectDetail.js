/**
 * 获取项目详情 Hook
 *
 * 封装获取单个项目详情的业务逻辑。
 * 遵循 dev-frontend_patterns skill 规范。
 */

import { useState, useEffect, useCallback } from "react";
import { projectService } from "../services/project.service";
import { useTranslation } from "react-i18next";

export function useProjectDetail(id) {
  const { t } = useTranslation();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProject = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError(null);
    try {
      const detail = await projectService.getProject(id);
      if (detail) {
        setProject(detail);
      } else {
        setError(t("common.notFound", "未找到该公告"));
      }
    } catch (err) {
      console.error("Failed to load project:", err);
      setError(t("common.error", "加载失败"));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  return {
    project,
    loading,
    error,
    refresh: fetchProject,
  };
}
