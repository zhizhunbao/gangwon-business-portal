/**
 * 项目状态 Hook
 *
 * 提供项目状态的翻译和样式映射。
 * 遵循 dev-frontend_patterns skill 规范。
 */

import { useTranslation } from "react-i18next";
import { useCallback } from "react";
import { ProjectStatus } from "../enums";

export function useProjectStatus() {
  const { t } = useTranslation();

  const getStatusInfo = useCallback(
    (status) => {
      const statusMap = {
        [ProjectStatus.ACTIVE]: {
          label: t("projects.status.active", "进行中"),
          variant: "success",
        },
        [ProjectStatus.INACTIVE]: {
          label: t("projects.status.inactive", "未激活"),
          variant: "gray",
        },
        [ProjectStatus.ARCHIVED]: {
          label: t("projects.status.archived", "已归档"),
          variant: "gray",
        },
        [ProjectStatus.RECRUITING]: {
          label: t("projects.status.recruiting", "招募中"),
          variant: "success",
        },
        [ProjectStatus.ONGOING]: {
          label: t("projects.status.ongoing", "进行中"),
          variant: "primary",
        },
        [ProjectStatus.CLOSED]: {
          label: t("projects.status.closed", "已截止"),
          variant: "gray",
        },
      };
      return statusMap[status] || { label: status, variant: "gray" };
    },
    [t],
  );

  return { getStatusInfo };
}
