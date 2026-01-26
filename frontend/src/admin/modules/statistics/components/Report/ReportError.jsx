/*
 * ReportError - 统计报告错误展示组件
 */
import { useTranslation } from "react-i18next";

/**
 * ReportError - 统计报告错误展示组件
 *
 * @param {Object} props
 * @param {string} props.message - 错误信息
 * @param {Function} props.onRetry - 点击重试按钮的回调
 */
export const ReportError = ({ message, onRetry }) => {
  const { t } = useTranslation();

  if (!message) return null;

  return (
    <div className="p-8 text-center bg-red-50 rounded-lg border border-red-100 mx-4 my-4">
      <div className="text-red-600 mb-4 flex items-center justify-center gap-2">
        <span className="text-xl">⚠️</span>
        <span className="font-medium">{message}</span>
      </div>
      <button
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm text-sm"
        onClick={onRetry}
      >
        {t("statistics.filters.apply")}
      </button>
    </div>
  );
};
