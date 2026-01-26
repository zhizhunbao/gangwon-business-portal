/**
 * 咨询提交页面组件 (内容组件)
 *
 * 遵循 dev-frontend_patterns skill 规范。
 */

import React from "react";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardBody,
  Alert,
  Input,
  Select,
  Textarea,
  Button,
} from "@shared/components";
import { PageContainer } from "@member/layouts";

import InquiryAttachmentList from "./InquiryAttachmentList";

const INQUIRY_CATEGORY_OPTIONS = [
  { value: "general" },
  { value: "support" },
  { value: "performance" },
];

/**
 * 咨询提交页面主体渲染组件 (内容)
 */
export default function InquiryPage(props) {
  const { t } = useTranslation();
  const {
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
  } = props;

  const categoryOptions = INQUIRY_CATEGORY_OPTIONS.map((opt) => ({
    value: opt.value,
    label: t(`support.category.${opt.value}`, opt.value),
  }));

  return (
    <PageContainer className="pb-8">
      <div className="w-full">
        <div className="mb-6 border-b border-gray-100 pb-4">
          <h1 className="text-2xl font-bold text-gray-900">
            {t("support.newInquiry")}
          </h1>
        </div>

        <Card>
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="error" onClose={() => setError(null)}>
                  {error}
                </Alert>
              )}
              {success && (
                <Alert variant="success" onClose={() => setSuccess(null)}>
                  {success}
                </Alert>
              )}

              <Select
                label={t("support.categoryLabel")}
                value={formData.category}
                onChange={(e) => handleChange("category", e.target.value)}
                options={categoryOptions}
                required
              />

              <Input
                label={t("support.subjectLabel")}
                value={formData.subject}
                onChange={(e) => handleChange("subject", e.target.value)}
                placeholder={t("support.subjectPlaceholder")}
                required
              />

              <Textarea
                label={t("support.contentLabel")}
                value={formData.content}
                onChange={(e) => handleChange("content", e.target.value)}
                rows={8}
                placeholder={t("support.contentPlaceholder")}
                required
              />

              <InquiryAttachmentList
                attachments={formData.attachments}
                MAX_ATTACHMENTS={MAX_ATTACHMENTS}
                isUploading={isUploading}
                handleFilesSelected={handleFilesSelected}
                handleRemoveAttachment={handleRemoveAttachment}
              />

              <div className="pt-4">
                <Button
                  type="submit"
                  disabled={
                    isSubmitting || !formData.subject || !formData.content
                  }
                >
                  {isSubmitting ? t("common.submitting") : t("common.submit")}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      </div>
    </PageContainer>
  );
}
