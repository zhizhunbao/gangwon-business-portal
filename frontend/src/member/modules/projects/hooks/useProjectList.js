/**
 * 项目列表业务逻辑 Hook
 *
 * 处理项目拉取、筛选、搜索、申请弹窗状态及申请逻辑。
 * 遵循 dev-frontend_patterns skill 规范。
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useProjects } from "./useProjects";
import { useProjectApplication } from "./useProjectApplication";
import { useProjectStatus } from "./useProjectStatus";
import { ProjectStatus } from "../enums";
import { formatDate } from "@shared/utils";

export function useProjectList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { projects: allProjects, loading, refresh } = useProjects();
  const { checkExistingApplication } = useProjectApplication();
  const { getStatusInfo } = useProjectStatus();

  // Local state for filtering and modal
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  // Initialize filtered projects when data loads
  useEffect(() => {
    setFilteredProjects(allProjects);
  }, [allProjects]);

  const handleFilterChange = useCallback((filtered) => {
    setFilteredProjects(filtered);
  }, []);

  const checkAndOpenModal = useCallback(
    async (project) => {
      let projectToOpen = { ...project };

      const existingApplication = await checkExistingApplication(project.id);
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
    [checkExistingApplication],
  );

  const handleApply = useCallback(
    (project) => {
      checkAndOpenModal(project);
    },
    [checkAndOpenModal],
  );

  const handleApplicationSuccess = useCallback(() => {
    setSelectedProject(null);
    setShowApplicationModal(false);
    refresh();
  }, [refresh]);

  const handleCloseModal = useCallback(() => {
    setShowApplicationModal(false);
    setSelectedProject(null);
  }, []);

  const handleDetail = useCallback(
    (projectId) => {
      // 导航到详情页，路径可以是 /member/project/:id 或 /member/programs/:id
      // 这里统一优先使用 /member/project 路径，因为它在 SideBar 中更常用
      navigate(`/member/project/${projectId}`);
    },
    [navigate],
  );

  const columns = useMemo(
    () => [
      {
        key: "title",
        render: (value) => value || "",
      },
      {
        key: "description",
        render: (value) => value || "",
      },
      {
        key: "status",
        render: (value) => {
          const statusInfo = getStatusInfo(value);
          return statusInfo.label;
        },
      },
      {
        key: "targetCompanyName",
        render: (value) => value || "",
      },
      {
        key: "targetBusinessNumber",
        render: (value) => value || "",
      },
      {
        key: "startDate",
        render: (value) => (value ? formatDate(value) : ""),
      },
      {
        key: "endDate",
        render: (value) => (value ? formatDate(value) : ""),
      },
      {
        key: "actions",
        render: (_, row) => {
          if (row.status === ProjectStatus.ACTIVE) {
            return t("projects.apply", "程序申请");
          }
          return t("projects.notAvailable", "不可申请");
        },
      },
    ],
    [getStatusInfo, t],
  );

  return {
    allProjects,
    filteredProjects,
    loading,
    showApplicationModal,
    selectedProject,
    columns,
    handleFilterChange,
    handleApply,
    handleDetail,
    handleApplicationSuccess,
    handleCloseModal,
  };
}
