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
        // Reset or prepopulate for new application
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
        t("fileAttachments.uploadError", "文件上传失败，请重试");
      setFormMessage(errorMsg);
    }
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      setFormMessage(t("common.loginRequired", "请先登录"));
      return;
    }

    if (!project?.id) {
      setFormMessage(t("projects.projectNotFound", "项目不存在"));
      return;
    }

    const { applicantName, applicantPhone, applicationReason, attachments } =
      formData;

    const trimmedName = applicantName.trim();
    if (!trimmedName) {
      setFormError(
        t("projects.application.applicantNameRequired", "请输入申请人姓名"),
      );
      setFormMessage(
        t("projects.application.validationError", "请补全必填信息后再试"),
      );
      return;
    }

    const trimmedPhone = applicantPhone.trim();
    if (!trimmedPhone) {
      setFormError(
        t("projects.application.applicantPhoneRequired", "请输入申请人电话"),
      );
      setFormMessage(
        t("projects.application.validationError", "请补全必填信息后再试"),
      );
      return;
    }

    const trimmedReason = applicationReason.trim();
    if (!trimmedReason || trimmedReason.length < 10) {
      setFormError(
        t("projects.application.reasonMinLength", "申请理由至少需要10个字符"),
      );
      setFormMessage(
        t("projects.application.validationError", "请补全必填信息后再试"),
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
          ? t("projects.applicationDetail", "申请详情")
          : canReapply
            ? t("projects.reapply", "重新申请")
            : t("projects.apply", "程序申请")
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
              ? t("common.close", "关闭")
              : t("common.cancel", "取消")}
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
                ? t("common.submitting", "提交中...")
                : canReapply
                  ? t("projects.resubmit", "重新提交")
                  : t("common.submit", "提交")}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
