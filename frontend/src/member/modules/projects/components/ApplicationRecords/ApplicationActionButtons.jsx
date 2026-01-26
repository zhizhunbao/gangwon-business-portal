/**
 * 申请记录操作按钮组组件
 *
 * 根据申请状态渲染相应的操作按钮（取消、查看原因、提交资料）。
 * 遵循 dev-frontend_patterns skill 规范。
 */

import { useTranslation } from "react-i18next";
import { useApplicationStatus } from "../../hooks/useApplicationStatus";

export default function ApplicationActionButtons({
  application,
  onCancel,
  onViewReason,
  onSupplement,
}) {
  const { t } = useTranslation();
  const { getStatusInfo } = useApplicationStatus();
  const statusInfo = getStatusInfo(application.status);
  const buttons = [];

  if (statusInfo.canCancel) {
    buttons.push(
      <button
        key="cancel"
        className="text-red-600 hover:text-red-900 font-medium text-sm transition-colors border-none bg-transparent cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          onCancel(application);
        }}
      >
        {t("projects.applicationRecords.cancelApplication", "取消申请")}
      </button>,
    );
  }

  if (statusInfo.showRejectionReason) {
    buttons.push(
      <button
        key="rejection"
        className="text-primary-600 hover:text-primary-900 font-medium text-sm transition-colors border-none bg-transparent cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          onViewReason(application);
        }}
      >
        {t("projects.applicationRecords.viewReason", "查看原因")}
      </button>,
    );
  }

  if (statusInfo.needsSupplement) {
    buttons.push(
      <button
        key="supplement"
        className="text-primary-600 hover:text-primary-900 font-medium text-sm transition-colors border-none bg-transparent cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          onSupplement(application);
        }}
      >
        {t("projects.applicationRecords.submitMaterials", "提交资料")}
      </button>,
    );
  }

  if (buttons.length === 0) {
    return (
      <div className="flex justify-center">
        <span className="text-gray-400 text-sm">-</span>
      </div>
    );
  }

  return (
    <div className="flex flex-row justify-center gap-2">
      {buttons.map((button, index) => (
        <span key={index} className="flex items-center gap-2">
          {button}
          {index < buttons.length - 1 && (
            <span className="text-gray-300">|</span>
          )}
        </span>
      ))}
    </div>
  );
}
