/**
 * 咨询表单业务逻辑 Hook
 *
 * 遵循 dev-frontend_patterns skill 规范。
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supportService } from "../services/support.service";
import { useUpload } from "@shared/hooks";

const MAX_ATTACHMENTS = 3;

/**
 * 咨询表单逻辑控制 Hook
 */
export function useInquiry({ onSubmitSuccess } = {}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    category: "general",
    subject: "",
    content: "",
    attachments: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // 使用统一的上传 hook
  const { uploading: isUploading, uploadAttachments } = useUpload({
    onError: (err) => setError(err.message || t("common.uploadFailed")),
  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  const handleFilesSelected = async (files) => {
    if (files.length === 0) return;

    const remainingSlots = MAX_ATTACHMENTS - formData.attachments.length;
    if (remainingSlots <= 0) {
      setError(t("support.maxAttachmentsReached", { max: MAX_ATTACHMENTS }));
      return;
    }

    const filesToUpload = files.slice(0, remainingSlots);
    setError(null);

    const uploadedFiles = await uploadAttachments(filesToUpload);
    if (uploadedFiles) {
      setFormData((prev) => ({
        ...prev,
        attachments: [...prev.attachments, ...uploadedFiles],
      }));
    }
  };

  const handleRemoveAttachment = (index) => {
    setFormData((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!formData.subject || !formData.content) {
      setError(t("support.fillAllFields"));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const threadAttachments = formData.attachments.map((att) => {
        const fileUrl = att.fileUrl || att.url;
        const fileName =
          att.originalName || att.name || att.fileName || "attachment";
        const fileSize = att.fileSize || att.size || 0;

        let mimeType = att.mimeType || "application/octet-stream";
        if (!mimeType || mimeType === "application/octet-stream") {
          const ext = fileName.split(".").pop()?.toLowerCase();
          const mimeMap = {
            pdf: "application/pdf",
            doc: "application/msword",
            docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            xls: "application/vnd.ms-excel",
            xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            jpg: "image/jpeg",
            jpeg: "image/jpeg",
            png: "image/png",
            gif: "image/gif",
          };
          mimeType = mimeMap[ext] || "application/octet-stream";
        }

        return {
          fileName,
          fileUrl,
          fileSize,
          mimeType,
        };
      });

      await supportService.createThread({
        category: formData.category,
        subject: formData.subject,
        content: formData.content,
        attachments: threadAttachments,
      });

      setSuccess(t("support.submitSuccess"));
      setFormData({
        category: "general",
        subject: "",
        content: "",
        attachments: [],
      });

      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
    } catch (err) {
      setError(t("support.submitFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    formData,
    isSubmitting,
    isUploading,
    error,
    success,
    MAX_ATTACHMENTS,
    handleChange,
    handleFilesSelected,
    handleRemoveAttachment,
    handleSubmit,
    setError,
    setSuccess,
  };
}
