/**
 * 获取项目列表 Hook
 *
 * 封装获取项目列表的业务逻辑。
 * 遵循 dev-frontend_patterns skill 规范。
 */

import { useState, useEffect, useCallback } from "react";
import { projectService } from "../services/project.service";

export function useProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: 1,
        pageSize: 100,
        status: "active",
      };

      const response = await projectService.listProjects(params);
      if (response && response.items) {
        setProjects(response.items);
      } else {
        setProjects([]);
      }
    } catch (err) {
      console.error("Failed to load projects:", err);
      setError("Failed to load projects");
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return {
    projects,
    loading,
    error,
    refresh: fetchProjects,
  };
}
