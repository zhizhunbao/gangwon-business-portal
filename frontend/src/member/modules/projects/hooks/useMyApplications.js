/**
 * 获取我的申请记录 Hook
 *
 * 封装获取用户申请记录的业务逻辑。
 * 遵循 dev-frontend_patterns skill 规范。
 */

import { useState, useEffect, useCallback } from "react";
import { projectService } from "../services/project.service";

export function useMyApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: 1,
        pageSize: 100,
      };
      const response = await projectService.getMyApplications(params);
      if (response && response.items) {
        setApplications(response.items);
      } else {
        setApplications([]);
      }
    } catch (err) {
      console.error("Failed to load applications:", err);
      setError("Failed to load applications");
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const cancelApplication = useCallback(
    async (applicationId) => {
      try {
        await projectService.cancelApplication(applicationId);
        await fetchApplications(); // Refresh list
        return true;
      } catch (error) {
        console.error("Failed to cancel application:", error);
        return false;
      }
    },
    [fetchApplications],
  );

  return {
    applications,
    loading,
    error,
    refresh: fetchApplications,
    cancelApplication,
  };
}
