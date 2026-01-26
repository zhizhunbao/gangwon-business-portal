/**
 * 咨询历史表格组件
 *
 * 遵循 dev-frontend_patterns skill 规范。
 */

import React from "react";
import { useTranslation } from "react-i18next";
import { formatDateTime } from "@shared/utils";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell,
} from "@shared/components/Table";
import { Badge, Button } from "@shared/components";

export default function InquiryHistoryTable({
  loading,
  filteredThreads,
  allThreads,
  openDetailModal,
  navigate,
  getStatusBadge,
  getCategoryBadge,
}) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="text-center py-12 px-4">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-base text-gray-500 m-0">{t("common.loading")}</p>
      </div>
    );
  }

  if (filteredThreads.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <p className="text-base text-gray-500 m-0 mb-4">
          {allThreads.length === 0
            ? t("support.noInquiries", "暂无咨询记录")
            : t("support.noMatchingInquiries", "没有找到匹配的咨询")}
        </p>
        {allThreads.length === 0 && (
          <Button
            variant="primary"
            onClick={() => navigate("/member/support/inquiry")}
          >
            {t("support.createFirstInquiry")}
          </Button>
        )}
      </div>
    );
  }

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeader>{t("support.subject")}</TableHeader>
          <TableHeader>{t("support.categoryLabel")}</TableHeader>
          <TableHeader>{t("support.statusLabel")}</TableHeader>
          <TableHeader>{t("support.createdDate")}</TableHeader>
          <TableHeader>{t("support.lastReply")}</TableHeader>
          <TableHeader>{t("support.messageCount")}</TableHeader>
          <TableHeader>{t("common.actions")}</TableHeader>
        </TableRow>
      </TableHead>
      <TableBody>
        {filteredThreads.map((thread) => (
          <TableRow key={thread.id}>
            <TableCell className="whitespace-normal min-w-[300px]">
              <span className="font-medium">{thread.subject}</span>
            </TableCell>
            <TableCell>{getCategoryBadge(thread.category)}</TableCell>
            <TableCell>{getStatusBadge(thread.status)}</TableCell>
            <TableCell className="text-gray-600 text-sm whitespace-nowrap">
              {thread.createdAt ? formatDateTime(thread.createdAt) : "-"}
            </TableCell>
            <TableCell className="text-gray-600 text-sm whitespace-nowrap">
              {thread.lastMessageAt
                ? formatDateTime(thread.lastMessageAt)
                : "-"}
            </TableCell>
            <TableCell className="text-gray-600 text-sm">
              {thread.messageCount || 0}
            </TableCell>
            <TableCell>
              <button
                onClick={() => openDetailModal(thread.id)}
                className="text-primary-600 hover:text-primary-900 font-medium text-sm bg-transparent border-none"
              >
                {t("common.view")}
              </button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
