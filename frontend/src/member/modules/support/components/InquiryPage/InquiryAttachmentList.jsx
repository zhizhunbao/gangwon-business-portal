/**
 * 咨询附件列表组件
 *
 * 遵循 dev-frontend_patterns skill 规范。
 */

import React from "react";
import { useTranslation } from "react-i18next";
import { TrashIcon, DocumentIcon } from "@shared/components/Icons";
import { FileUploadButton } from "@shared/components";

export default function InquiryAttachmentList({
  attachments,
  MAX_ATTACHMENTS,
  isUploading,
  handleFilesSelected,
  handleRemoveAttachment,
}) {
  const { t } = useTranslation();

  const formatFileSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {t("support.attachments")}
        <span className="font-normal text-gray-500 ml-2">
          ({attachments.length}/{MAX_ATTACHMENTS})
        </span>
      </label>

      {attachments.length > 0 && (
        <div className="space-y-2 mb-3">
          {attachments.map((att, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex items-center gap-3 min-w-0">
                <DocumentIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">
                    {att.originalName || att.name}
                  </p>
                  {(att.fileSize || att.size) && (
                    <p className="text-xs text-gray-500">
                      {formatFileSize(att.fileSize || att.size)}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveAttachment(index)}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors bg-transparent border-none"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {attachments.length < MAX_ATTACHMENTS && (
        <div>
          <FileUploadButton
            onFilesSelected={handleFilesSelected}
            multiple
            loading={isUploading}
            label={t("support.addAttachment")}
            loadingLabel={t("common.uploading")}
          />
          <p className="text-xs text-gray-500 mt-2">
            {t("support.attachmentHint")}
          </p>
        </div>
      )}
    </div>
  );
}
