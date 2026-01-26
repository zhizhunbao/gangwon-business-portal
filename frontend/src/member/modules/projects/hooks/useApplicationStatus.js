/**
 * 申请状态 Hook
 *
 * 提供申请状态的翻译和样式映射。
 * 遵循 dev-frontend_patterns skill 规范。
 */

import { useTranslation } from "react-i18next";
import { useCallback } from "react";
import { ApplicationStatus } from "../enums";

export function useApplicationStatus() {
  const { t } = useTranslation();

  const getStatusInfo = useCallback(
    (status) => {
      const statusMap = {
        [ApplicationStatus.PENDING]: {
          label: t("projects.applicationRecords.status.pending", "等待受理"),
          variant: "warning",
          canCancel: true,
        },
        [ApplicationStatus.SUBMITTED]: {
          label: t("projects.applicationRecords.status.submitted", "已受理"),
          variant: "info",
          canCancel: true,
        },
        [ApplicationStatus.UNDER_REVIEW]: {
          label: t("projects.applicationRecords.status.under_review", "审核中"),
          variant: "primary",
          canCancel: true,
        },
        [ApplicationStatus.REVIEWING]: {
          label: t("projects.applicationRecords.status.reviewing", "审核中"),
          variant: "primary",
          canCancel: true,
        },
        [ApplicationStatus.NEEDS_SUPPLEMENT]: {
          label: t(
            "projects.applicationRecords.status.needs_supplement",
            "需补充资料",
          ),
          variant: "warning",
          needsSupplement: true,
          canCancel: false,
        },
        [ApplicationStatus.APPROVED]: {
          label: t("projects.applicationRecords.status.approved", "已通过"),
          variant: "success",
          canCancel: false,
        },
        [ApplicationStatus.REJECTED]: {
          label: t("projects.applicationRecords.status.rejected", "已驳回"),
          variant: "danger",
          canCancel: false,
          showRejectionReason: true,
        },
        [ApplicationStatus.CANCELLED]: {
          label: t("projects.applicationRecords.status.cancelled", "已取消"),
          variant: "gray",
          canCancel: false,
        },
      };

      return (
        statusMap[status] || {
          label: status,
          variant: "gray",
          canCancel: false,
        }
      );
    },
    [t],
  );

  return { getStatusInfo };
}
