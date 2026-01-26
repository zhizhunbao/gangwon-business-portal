/**
 * 公告详情页面组件 (内容组件)
 *
 * 遵循 dev-frontend_patterns skill 规范。
 */

import React from "react";
import { useTranslation } from "react-i18next";
import { formatDateTime } from "@shared/utils";
import { PageContainer } from "@member/layouts";
import { Card, Badge, Loading, Button } from "@shared/components";
import { ArrowLeftIcon, EyeIcon } from "@shared/components/Icons";

import NoticeAttachmentList from "./NoticeAttachmentList";

/**
 * 公告详情页面组件 (内容)
 */
export default function NoticeDetailPage({
  notice,
  loading,
  error,
  handleBack,
  handleDownload,
}) {
  const { t, i18n } = useTranslation();

  if (loading) {
    return (
      <PageContainer className="pb-8" fullWidth={false}>
        <div className="flex justify-center items-center py-16">
          <Loading />
        </div>
      </PageContainer>
    );
  }

  if (error || !notice) {
    return (
      <PageContainer className="pb-8" fullWidth={false}>
        <Card className="p-8 text-center">
          <p className="text-red-500 mb-4">
            {error || t("common.notFound", "未找到该公告")}
          </p>
          <Button onClick={handleBack}>{t("common.back", "返回")}</Button>
        </Card>
      </PageContainer>
    );
  }

  const badgeInfo = {
    variant: notice.important ? "danger" : "gray",
    text: notice.important
      ? t("home.notices.important", "重要")
      : t("home.notices.normal", "一般"),
  };

  return (
    <PageContainer className="pb-8" fullWidth={false}>
      <button
        onClick={handleBack}
        className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors mb-6 bg-transparent border-none cursor-pointer p-0"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        <span>{t("common.backToList", "返回列表")}</span>
      </button>

      <Card className="p-6 md:p-8">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 m-0 mb-4">
          {notice.title}
        </h1>

        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 pb-4 border-b border-gray-200 mb-6">
          <Badge variant={badgeInfo.variant}>{badgeInfo.text}</Badge>
          {notice.date && (
            <span>
              {formatDateTime(notice.date, "yyyy-MM-dd HH:mm", i18n.language)}
            </span>
          )}
          {notice.viewCount !== undefined && (
            <span className="flex items-center gap-1">
              <EyeIcon className="w-4 h-4" />
              {t("admin.content.notices.views", "浏览")}: {notice.viewCount}
            </span>
          )}
        </div>

        {notice.contentHtml && (
          <div
            className="prose prose-sm md:prose max-w-none mb-6"
            dangerouslySetInnerHTML={{ __html: notice.contentHtml }}
          />
        )}

        <NoticeAttachmentList
          attachments={notice.attachments}
          handleDownload={handleDownload}
        />
      </Card>
    </PageContainer>
  );
}
