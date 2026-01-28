/**
 * 申请弹窗主组件
 *
 * 负责申请流程的状态管理和逻辑控制。
 * 遵循 dev-frontend_patterns skill 规范。
 */

import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { Modal, Button } from "@shared/components";
import { useAuthStore } from "@shared/stores";
import { useProjectApplication } from "../../hooks/useProjectApplication";
import ProjectSummary from "./ProjectSummary";
import ApplicationForm from "./ApplicationForm";

export default function ApplicationModal({
  isOpen,
  onClose,
  project,
  onSuccess,
}) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { uploadFile, submitApplication, submitting, uploading } =
    useProjectApplication();

  const [formData, setFormData] = useState({
    applicantName: "",
    applicantPhone: "",
    applicationReason: "",
    attachments: [],
  });

  const [formError, setFormError] = useState("");
  const [formMessage, setFormMessage] = useState(null);

  const isViewMode = project?.viewMode || false;
  const existingApplication = project?.existingApplication;
  const canReapply =
    existingApplication &&
    ["cancelled", "rejected"].includes(existingApplication.status);
  const actualViewMode = isViewMode && !canReapply;

  // Initialize form data
  useEffect(() => {
    if (isOpen) {
      if (actualViewMode && existingApplication) {
        setFormData({
          applicantName: existingApplication.applicantName || "",
          applicantPhone: existingApplication.applicantPhone || "",
          applicationReason: existingApplication.applicationReason || "",
          attachments: existingApplication.attachments || [],
        });
      } else {
        setFormData({
          applicantName:
            user?.contactPersonName ||
            user?.contact_person_name ||
            user?.representative ||
            "",
          applicantPhone:
            user?.contactPersonPhone ||
            user?.contact_person_phone ||
            user?.phone ||
            "",
          applicationReason: "",
          attachments: [],
        });
      }
      setFormError("");
      setFormMessage(null);
    }
  }, [isOpen, actualViewMode, existingApplication, user]);

  const handleUpdateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formError) setFormError("");
    if (formMessage) setFormMessage(null);
  };

  const handleAttachmentsChange = async (files, action, index) => {
    if (action === "remove" && index !== undefined) {
      setFormData((prev) => ({
        ...prev,
        attachments: prev.attachments.filter((_, i) => i !== index),
      }));
      return;
    }

    try {
      const uploadedFiles = [];
      for (const file of files) {
        const result = await uploadFile(file);
        if (result) uploadedFiles.push(result);
      }
      setFormData((prev) => ({
        ...prev,
        attachments: [...prev.attachments, ...uploadedFiles],
      }));
    } catch (error) {
      const errorMsg =
        error?.message ||
        t('fileAttachments.uploadError', '파일 업로드 실패, 다시 시도해주세요');
      setFormMessage(errorMsg);
    }
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      setFormMessage(t('common.loginRequired', '먼저 로그인해주세요'));
      return;
    }

    if (!project?.id) {
      setFormMessage(t('projects.projectNotFound', '사업을 찾을 수 없습니다'));
      return;
    }

    const { applicantName, applicantPhone, applicationReason, attachments } =
      formData;

    const trimmedName = applicantName.trim();
    if (!trimmedName) {
      setFormError(
        t('projects.application.applicantNameRequired', '담당자 이름을 입력해주세요'),
      );
      setFormMessage(
        t('projects.application.validationError', '필수 항목을 확인한 뒤 다시 시도해주세요.'),
      );
      return;
    }

    const trimmedPhone = applicantPhone.trim();
    if (!trimmedPhone) {
      setFormError(
        t('projects.application.applicantPhoneRequired', '담당자 전화번호를 입력해주세요'),
      );
      setFormMessage(
        t('projects.application.validationError', '필수 항목을 확인한 뒤 다시 시도해주세요.'),
      );
      return;
    }

    const trimmedReason = applicationReason.trim();
    if (!trimmedReason || trimmedReason.length < 10) {
      setFormError(
        t('projects.application.reasonMinLength', '신청 사유는 최소 10자 이상 입력해주세요'),
      );
      setFormMessage(
        t('projects.application.validationError', '필수 항목을 확인한 뒤 다시 시도해주세요.'),
      );
      return;
    }

    try {
      await submitApplication(project.id, {
        applicantName: trimmedName,
        applicantPhone: trimmedPhone,
        applicationReason: trimmedReason,
        attachments: attachments,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setFormMessage(err.message);
    }
  };

  if (!project) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        actualViewMode
          ? t("projects.applicationDetail", "신청 상세")
          : canReapply
            ? t("projects.reapply", "재신청")
            : t("projects.apply", "프로그램 신청")
      }
      size="lg"
    >
      <div className="space-y-4">
        <ProjectSummary project={project} />

        <ApplicationForm
          user={user}
          project={project}
          formData={formData}
          errors={{ applicationReason: formError }}
          formMessage={formMessage}
          isViewMode={isViewMode}
          actualViewMode={actualViewMode}
          canReapply={canReapply}
          existingApplication={existingApplication}
          onUpdateField={handleUpdateField}
          onAttachmentsChange={handleAttachmentsChange}
          uploading={uploading}
          submitting={submitting}
        />

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button onClick={onClose} variant="secondary">
            {actualViewMode
              ? t("common.close", "닫기")
              : t("common.cancel", "취소")}
          </Button>
          {!actualViewMode && (
            <Button
              onClick={handleSubmit}
              variant="primary"
              disabled={
                !formData.applicantName.trim() ||
                !formData.applicantPhone.trim() ||
                formData.applicationReason.trim().length < 10 ||
                submitting
              }
            >
              {submitting
                ? t("common.submitting", "제출 중...")
                : canReapply
                  ? t("projects.resubmit", "재제출")
                  : t("common.submit", "제출")}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
