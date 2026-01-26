/**
 * 项目附件列表组件
 *
 * 显示并处理项目附件的下载。
 * 遵循 dev-frontend_patterns skill 规范。
 */

import { useTranslation } from "react-i18next";
import { DocumentIcon } from "@shared/components/Icons";

export default function ProjectAttachments({ attachments = [] }) {
  const { t } = useTranslation();

  if (!attachments || attachments.length === 0) {
    return null;
  }

  function handleDownload(attachment) {
    const url = attachment.fileUrl;
    const fileName = attachment.fileName || "download";

    if (!url) {
      console.error("No file URL found for attachment:", attachment);
      return;
    }

    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="border-t border-gray-200 pt-6 mt-6">
      <h4 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
        <DocumentIcon className="w-4 h-4" />
        {t("fileAttachments.attachments", "附件")} ({attachments.length})
      </h4>
      <div className="space-y-2">
        {attachments.map((attachment, index) => {
          const fileName = attachment.fileName || "Unknown";

          return (
            <button
              key={index}
              type="button"
              onClick={() => handleDownload(attachment)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-blue-50 rounded-lg transition-colors text-left group border-none cursor-pointer"
            >
              <DocumentIcon className="w-5 h-5 text-gray-400 group-hover:text-blue-600 flex-shrink-0" />
              <span className="flex-1 text-sm text-gray-700 group-hover:text-blue-600 truncate">
                {fileName}
              </span>
              <span className="text-xs text-gray-500 group-hover:text-blue-600">
                {t("common.download", "下载")}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
