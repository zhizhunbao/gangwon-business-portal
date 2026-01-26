/**
 * 公告事项列表页面组件 (内容组件)
 *
 * 遵循 dev-frontend_patterns skill 规范。
 */

import React from "react";
import { useTranslation } from "react-i18next";
import { PageContainer } from "@member/layouts";
import { Card, Pagination, Loading } from "@shared/components";
import { DocumentIcon } from "@shared/components/Icons";

import NoticeListItem from "./NoticeListItem";

/**
 * 公告事项列表页面内容组件
 */
export default function NoticesPage({
  notices,
  loading,
  error,
  currentPage,
  totalPages,
  total,
  handlePageChange,
  handleNoticeClick,
  loadNotices,
}) {
  const { t } = useTranslation();

  console.log("[NoticesPage] Render props:", {
    noticesCount: notices?.length,
    loading,
    error,
    currentPage,
  });

  const getBadgeInfo = (notice) => {
    return {
      variant: notice.important ? "danger" : "gray",
      text: notice.important
        ? t("home.notices.important", "重要")
        : t("home.notices.normal", "一般"),
    };
  };

  return (
    <PageContainer className="pb-8" fullWidth={false}>
      <div className="mb-6 border-b border-gray-100 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">
          {t("home.notices.title")}
        </h1>
        <p className="text-gray-600 mt-2 text-sm">
          {t("support.notices.description", "查看最新公告和重要通知")}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-16">
          <Loading />
        </div>
      ) : error ? (
        <Card className="p-8 text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={loadNotices}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            {t("common.retry", "重试")}
          </button>
        </Card>
      ) : notices.length > 0 ? (
        <div className="space-y-3">
          {notices.map((notice) => (
            <NoticeListItem
              key={notice.id}
              notice={notice}
              getBadgeInfo={getBadgeInfo}
              handleNoticeClick={handleNoticeClick}
            />
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center text-gray-500">
          <DocumentIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="m-0">{t("home.notices.empty", "暂无公告")}</p>
        </Card>
      )}

      {totalPages > 1 && (
        <div className="mt-8 flex justify-center">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}

      {total > 0 && (
        <div className="mt-4 text-center text-sm text-gray-500">
          {t("common.totalItems", "共 {{count}} 条", { count: total })}
        </div>
      )}
    </PageContainer>
  );
}
