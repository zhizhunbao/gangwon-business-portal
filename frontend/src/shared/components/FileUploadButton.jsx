/**
 * FileUploadButton Component
 * 通用文件上传按钮组件
 */

import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Button from './Button';
import { UploadIcon } from './Icons';
import { cn } from '@shared/utils/helpers';

/**
 * @param {Object} props
 * @param {Function} props.onFilesSelected - 文件选择回调 (files: File[]) => void
 * @param {boolean} props.multiple - 是否允许多选
 * @param {string} props.accept - 允许的文件类型
 * @param {boolean} props.disabled - 是否禁用
 * @param {boolean} props.loading - 是否上传中
 * @param {string} props.label - 按钮文字
 * @param {string} props.loadingLabel - 上传中文字
 * @param {string} props.variant - 按钮样式 (primary/secondary/outline/text)
 * @param {string} props.size - 按钮大小 (small/medium/large)
 * @param {boolean} props.showIcon - 是否显示图标
 * @param {string} props.className - 自定义样式
 * @param {React.ReactNode} props.children - 自定义内容
 */
export default function FileUploadButton({
  onFilesSelected,
  multiple = false,
  accept = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif',
  disabled = false,
  loading = false,
  label,
  loadingLabel,
  variant = 'outline',
  size = 'small',
  showIcon = true,
  className,
  children
}) {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);

  const handleClick = () => {
    if (!disabled && !loading) {
      fileInputRef.current?.click();
    }
  };

  const handleChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0 && onFilesSelected) {
      onFilesSelected(files);
    }
    // 清空input，允许重复选择同一文件
    e.target.value = '';
  };

  const buttonLabel = loading 
    ? (loadingLabel || t('common.uploading', '上传中...'))
    : (label || t('common.upload', '上传'));

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        onChange={handleChange}
        className="hidden"
        disabled={disabled || loading}
      />
      <Button
        type="button"
        variant={variant}
        size={size}
        disabled={disabled || loading}
        onClick={handleClick}
        className={cn(className)}
      >
        {children || (
          <>
            {showIcon && <UploadIcon className="w-4 h-4 mr-2" />}
            {buttonLabel}
          </>
        )}
      </Button>
    </>
  );
}
