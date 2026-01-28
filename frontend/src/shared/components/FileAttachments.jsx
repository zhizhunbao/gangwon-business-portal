/**
 * File Attachments Component
 * 文件附件管理组件 - 支持上传、预览、删除附件
 */

import { useTranslation } from 'react-i18next';
import { FileUploadButton } from '@shared/components';
import { DocumentIcon, TrashIcon } from '@shared/components/Icons';
import { cn } from '@shared/utils/helpers';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

export function FileAttachments({
  attachments = [],
  onChange,
  maxFiles = 5,
  maxFileSize = MAX_FILE_SIZE,
  accept = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.jpg,.jpeg,.png,.gif,.txt',
  uploading = false,
  disabled = false,
  label,
  error,
  className,
}) {
  const { t } = useTranslation();

  const handleFilesSelected = (files) => {
    if (!onChange) return;

    const validFiles = [];
    const errors = [];

    for (const file of files) {
      if (file.size > maxFileSize) {
        errors.push(t('fileAttachments.fileTooLarge', { name: file.name, max: formatFileSize(maxFileSize) }));
        continue;
      }
      validFiles.push(file);
    }

    if (errors.length > 0) {
      alert(errors.join('\n'));
    }

    if (validFiles.length > 0) {
      onChange(validFiles);
    }
  };

  const handleRemove = (index) => {
    if (!onChange || disabled) return;
    const newAttachments = attachments.filter((_, i) => i !== index);
    onChange(newAttachments, 'remove', index);
  };

  const handleDownload = async (attachment) => {
    const url = attachment.fileUrl || attachment.url;
    const fileName = attachment.originalName || attachment.fileName || attachment.name || 'download';
    
    if (!url) return;

    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed:', error);
      window.open(url, '_blank');
    }
  };

  const remainingSlots = maxFiles - attachments.length;
  const canUpload = remainingSlots > 0 && !disabled;

  return (
    <div className={cn('file-attachments', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}

      {/* 附件列表 */}
      {attachments.length > 0 && (
        <div className="space-y-2 mb-3">
          {attachments.map((attachment, index) => {
            const fileName = attachment.fileName || attachment.originalName || attachment.name || 'Unknown';
            const fileSize = attachment.fileSize || attachment.size;
            
            return (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <DocumentIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {fileName}
                      </span>
                      {fileSize && (
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          ({formatFileSize(fileSize)})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 ml-3">
                  <button
                    type="button"
                    onClick={() => handleDownload(attachment)}
                    className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                    title={t('common.download', '다운로드')}
                  >
                    {t('common.download', '다운로드')}
                  </button>
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => handleRemove(index)}
                      className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors"
                      title={t('common.remove', '제거')}
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 上传按钮 */}
      {canUpload && (
        <div className="flex items-center gap-3">
          <FileUploadButton
            onFilesSelected={handleFilesSelected}
            multiple={remainingSlots > 1}
            accept={accept}
            disabled={disabled}
            loading={uploading}
            label={t('fileAttachments.addFiles', '첨부파일 추가')}
            loadingLabel={t('fileAttachments.uploading', '업로드 중...')}
            variant="outline"
            size="small"
          />
          <span className="text-sm text-gray-500">
            {t('fileAttachments.remaining', { count: remainingSlots, max: maxFiles })}
          </span>
        </div>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}

      {/* 提示信息 */}
      <p className="mt-2 text-xs text-gray-500">
        {t('fileAttachments.hint', { max: formatFileSize(maxFileSize) })}
      </p>
    </div>
  );
}

export default FileAttachments;
