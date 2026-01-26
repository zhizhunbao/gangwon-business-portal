/**
 * Company Profile Header
 *
 * 企业信息页面头部。
 * 遵循 dev-frontend_patterns skill 规范。
 */

import React from "react";
import { useTranslation } from "react-i18next";
import { Button, Badge } from "@shared/components";

const CompanyProfileHeader = ({
  isEditing,
  onEdit,
  onSave,
  onCancel,
  saving,
  approvalStatus,
}) => {
  const { t } = useTranslation();

  return (
    <div className="mb-6 sm:mb-8 lg:mb-10 flex justify-between items-center gap-4 sm:gap-6 min-h-[48px]">
      <div className="flex items-center gap-3 sm:gap-4">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 m-0">
          {t("performance.companyInfo.title", "企业信息")}
        </h1>
        {approvalStatus && (
          <Badge
            variant={
              approvalStatus === "approved"
                ? "success"
                : approvalStatus === "pending"
                  ? "warning"
                  : approvalStatus === "rejected"
                    ? "danger"
                    : "gray"
            }
            className="text-xs sm:text-sm"
          >
            {approvalStatus === "approved" && t("member.approved", "已批准")}
            {approvalStatus === "pending" && t("member.pending", "审核中")}
            {approvalStatus === "rejected" && t("member.rejected", "已驳回")}
          </Badge>
        )}
      </div>
      {!isEditing ? (
        <button
          onClick={onEdit}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50"
          disabled={saving}
        >
          {t("common.edit", "编辑")}
        </button>
      ) : (
        <div className="flex gap-3 sm:gap-4 flex-shrink-0">
          <Button onClick={onSave} variant="primary" disabled={saving}>
            {t("common.save", "保存")}
          </Button>
          <Button onClick={onCancel} variant="secondary" disabled={saving}>
            {t("common.cancel", "取消")}
          </Button>
        </div>
      )}
    </div>
  );
};

export default CompanyProfileHeader;
