/**
 * 项目详情业务逻辑 Hook
 *
 * 处理项目详情获取、返回列表和申请跳转。
 * 遵循 dev-frontend_patterns skill 规范。
 */

import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ROUTES } from "@shared/utils/constants";
import { useProjectDetail } from "./useProjectDetail";
import { useProjectApplication } from "./useProjectApplication";
import ApplicationModal from "../components/ApplicationModal/index.jsx";

export function useProjectDetailView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { project, loading, error } = useProjectDetail(id);
  const { checkExistingApplication } = useProjectApplication();
  
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  function handleBack() {
    navigate(ROUTES.MEMBER_PROJECTS);
  }

  const handleApply = useCallback(
    async (projectId) => {
      if (!project) return;

      let projectToOpen = { ...project };
      const existingApplication = await checkExistingApplication(projectId);
      
      if (existingApplication) {
        projectToOpen = {
          ...project,
          existingApplication,
          viewMode: true,
        };
      }

      setSelectedProject(projectToOpen);
      setShowApplicationModal(true);
    },
    [project, checkExistingApplication],
  );

  const handleApplicationSuccess = useCallback(() => {
    setSelectedProject(null);
    setShowApplicationModal(false);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowApplicationModal(false);
    setSelectedProject(null);
  }, []);

  return {
    project,
    loading,
    error,
    handleBack,
    handleApply,
    showApplicationModal,
    selectedProject,
    handleApplicationSuccess,
    handleCloseModal,
    ApplicationModal,
  };
}
