/**
 * SystemInfoDisplay Component
 * 用于展示系统介绍的富文本内容，包含加载和错误状态处理
 *
 * 遵循 dev-frontend_patterns skill 规范。
 */

import { useTranslation } from "react-i18next";
import { Loading, Card } from "@shared/components";

/**
 * SystemInfoDisplay - 系统信息展示组件
 * @param {Object} props
 * @param {string} props.content - HTML 内容
 * @param {boolean} props.loading - 加载状态
 * @param {string} props.error - 错误信息
 */
export function SystemInfoDisplay({ content, loading, error }) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loading text={t("about.loading", "加载中...")} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 px-8">
        <div className="text-lg text-red-600 mb-2">
          {t("about.error", "加载失败")}
        </div>
        <p className="text-gray-500">{error}</p>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="text-center py-20 bg-gray-50 rounded-lg border border-gray-100">
        <p className="text-gray-500 text-lg">
          {t("about.noContent", "暂无内容")}
        </p>
      </div>
    );
  }

  return (
    <Card className="p-8 md:p-12 shadow-sm">
      <div
        className="prose prose-lg max-w-none prose-headings:font-bold prose-a:text-blue-600 prose-img:rounded-lg"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </Card>
  );
}

export default SystemInfoDisplay;
