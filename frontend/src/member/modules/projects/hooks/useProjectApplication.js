/**
 * 项目申请逻辑 Hook
 *
 * 封装项目申请相关的逻辑，包括文件上传和提交申请。
 * 遵循 dev-frontend_patterns skill 规范。
 */

import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { projectService } from "../services/project.service";
import { uploadService } from "@shared/services";

export function useProjectApplication() {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const checkExistingApplication = useCallback(async (projectId) => {
    try {
      const response = await projectService.getMyApplications({
        page: 1,
        pageSize: 100,
      });
      return response.items?.find((app) => app.projectId === projectId);
    } catch (error) {
      console.error("Failed to check existing application:", error);
      return undefined;
    }
  }, []);

  const uploadFile = useCallback(async (file) => {
    setUploading(true);
    try {
      // Assuming uploadPublic signature
      const result = await uploadService.uploadPublic(file, () => {});
      return {
        fileName: file.name,
        fileSize: file.size,
        fileUrl: result.fileUrl || result.url,
        filePath: result.filePath || result.path,
      };
    } catch (error) {
      console.error("Upload error:", error);
      throw error;
    } finally {
      setUploading(false);
    }
  }, []);

  const submitApplication = useCallback(
    async (projectId, data) => {
      setSubmitting(true);
      try {
        await projectService.applyToProject(projectId, data);
        return true;
      } catch (error) {
        console.error("Application submission error:", error);
        // Handle i18nKey from backend if exists
        const i18nKey = error?.i18nKey;
        const message = i18nKey
          ? t(i18nKey)
          : error?.message ||
            t("common.unknownError", "发生未知错误，请稍后再试");
        throw new Error(message);
      } finally {
        setSubmitting(false);
      }
    },
    [t],
  );

  return {
    submitting,
    uploading,
    checkExistingApplication,
    uploadFile,
    submitApplication,
  };
}
