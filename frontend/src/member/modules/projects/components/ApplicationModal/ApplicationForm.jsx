/**
 * 申请表单组件
 *
 * 包含申请人信息、申请理由和附件上传。
 * 遵循 dev-frontend_patterns skill 规范。
 */

import { useTranslation } from "react-i18next";
import { Textarea, FileAttachments, Alert } from "@shared/components";

export default function ApplicationForm({
  user,
  project,
  formData,
  errors,
  formMessage,
  isViewMode,
  actualViewMode,
  canReapply,
  existingApplication,
  onUpdateField,
  onAttachmentsChange,
  uploading,
  submitting,
}) {
  const { t } = useTranslation();

  const { applicantName, applicantPhone, applicationReason, attachments } =
    formData;

  const handlePhoneChange = (e) => {
    const raw = e.target.value;
    const formatted = formatPhoneNumber(raw);
    onUpdateField("applicantPhone", formatted);
  };

  const formatPhoneNumber = (value) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 7)
      return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    if (numbers.length <= 10) {
      if (numbers.startsWith("02"))
        return `${numbers.slice(0, 2)}-${numbers.slice(2, 6)}-${numbers.slice(6)}`;
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6)}`;
    }
    if (numbers.startsWith("02"))
      return `${numbers.slice(0, 2)}-${numbers.slice(2, 6)}-${numbers.slice(6, 10)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
  };

  return (
    <div className="space-y-4">
      {/* View Mode Status (Existing Application) */}
      {isViewMode && existingApplication && !canReapply && (
        <div className="p-3 rounded-lg border bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-900">
              {t('projects.applicationStatus', '신청 상태')}:
            </span>
            <span className="px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-800">
              {t(
                `projects.applicationRecords.status.${existingApplication.status}`,
                existingApplication.status,
              )}
            </span>
          </div>
          {existingApplication.submittedAt && (
            <div className="mt-2 text-xs text-blue-700">
              {t('projects.submittedAt', '제출 시간')}:{" "}
              {new Date(existingApplication.submittedAt).toLocaleString()}
            </div>
          )}
        </div>
      )}

      {/* Company Info */}
      {user && (
        <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg text-sm">
          <div>
            <span className="text-gray-500">
              {t('projects.companyId', '기업 ID')}:{" "}
            </span>
            <span className="font-medium">
              {user.businessNumber || user.id}
            </span>
          </div>
          <div>
            <span className="text-gray-500">
              {t('projects.companyName', '기업명')}:{" "}
            </span>
            <span className="font-medium">{user.companyName || "-"}</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {formMessage && <Alert variant="error">{formMessage}</Alert>}

      {/* Applicant Info */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('projects.application.form.applicantName', '담당자 이름')}
            {!actualViewMode && <span className="text-red-500 ml-1">*</span>}
          </label>
          <input
            type="text"
            value={applicantName}
            onChange={(e) => onUpdateField("applicantName", e.target.value)}
            placeholder={t(
              "projects.application.form.applicantNamePlaceholder",
              "请输入申请人姓名",
            )}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
            disabled={actualViewMode}
            required={!actualViewMode}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('projects.application.form.applicantPhone', '담당자 전화번호')}
            {!actualViewMode && <span className="text-red-500 ml-1">*</span>}
          </label>
          <input
            type="tel"
            value={applicantPhone}
            onChange={handlePhoneChange}
            placeholder={t(
              "projects.application.form.applicantPhonePlaceholder",
              "请输入电话号码",
            )}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
            disabled={actualViewMode}
            required={!actualViewMode}
            maxLength={13}
          />
        </div>
      </div>

      {/* Application Reason */}
      <Textarea
        label={t('projects.application.form.reason', '신청 사유')}
        value={applicationReason}
        onChange={(e) => onUpdateField("applicationReason", e.target.value)}
        placeholder={t(
          "projects.application.form.reasonPlaceholder",
          "请详细说明申请此项目的原因（至少10个字符）",
        )}
        rows={6}
        required={!actualViewMode}
        error={errors.applicationReason}
        help={
          !actualViewMode
            ? `${applicationReason.length}/10 ${t('common.characters', '자')}`
            : ""
        }
        disabled={actualViewMode}
      />

      {/* Attachments */}
      <FileAttachments
        label={t('projects.application.form.attachments', '첨부파일')}
        attachments={attachments}
        onChange={onAttachmentsChange}
        maxFiles={5}
        uploading={uploading}
        disabled={actualViewMode || submitting}
      />
    </div>
  );
}
