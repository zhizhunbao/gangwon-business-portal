/**
 * 项目详情业务逻辑 Hook
 *
 * 处理项目详情获取、返回列表和申请跳转。
 * 遵循 dev-frontend_patterns skill 规范。
 */

import { useParams, useNavigate } from "react-router-dom";
import { ROUTES } from "@shared/utils/constants";
import { useProjectDetail } from "./useProjectDetail";

export function useProjectDetailView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { project, loading, error } = useProjectDetail(id);

  function handleBack() {
    navigate(ROUTES.MEMBER_PROJECTS);
  }

  function handleApply(projectId) {
    navigate(`${ROUTES.MEMBER_PROJECTS}?apply=${projectId}`);
  }

  return {
    project,
    loading,
    error,
    handleBack,
    handleApply,
  };
}
