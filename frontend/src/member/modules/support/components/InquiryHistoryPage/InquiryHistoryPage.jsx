/**
 * 咨询历史页面组件 (内容组件)
 *
 * 遵循 dev-frontend_patterns skill 规范。
 */

import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardBody, Badge } from "@shared/components";
import { PageContainer } from "@member/layouts";
import ThreadDetailModal from "@shared/components/ThreadDetailModal";

import InquiryHistoryFilter from "./InquiryHistoryFilter";
import InquiryHistoryTable from "./InquiryHistoryTable";

/**
 * 咨询历史页面主体渲染组件 (内容)
 */
export default function InquiryHistoryPage(props) {
  const { t } = useTranslation();
  const {
    allThreads,
    filteredThreads,
    loading,
    selectedThreadId,
    statusFilter,
    setStatusFilter,
    handleFilterChange,
    openDetailModal,
    closeDetailModal,
    loadThreads,
    navigate,
  } = props;

  const statusOptions = useMemo(
    () => [
      { value: "", label: t("common.all") },
      { value: "open", label: t("support.status.open") },
      { value: "resolved", label: t("support.status.resolved") },
      { value: "closed", label: t("support.status.closed") },
    ],
    [t],
  );

  const getStatusBadge = (status) => {
    const variants = {
      open: "success",
      resolved: "info",
      closed: "secondary",
    };
    return (
      <Badge variant={variants[status] || "default"}>
        {t(`support.status.${status}`, status)}
      </Badge>
    );
  };

  const getCategoryBadge = (category) => {
    if (!category) return null;
    const categoryMap = {
      support: { variant: "info", label: t("support.category.support") },
      performance: {
        variant: "warning",
        label: t("support.category.performance"),
      },
      general: { variant: "secondary", label: t("support.category.general") },
    };
    const config = categoryMap[category] || categoryMap.general;
    return (
      <Badge variant={config.variant} size="sm">
        {config.label}
      </Badge>
    );
  };

  const filterColumns = useMemo(
    () => [
      { key: "subject", render: (value) => value || "" },
      {
        key: "category",
        render: (value) =>
          value ? t(`support.category.${value}`, value) : "-",
      },
      { key: "status", render: (value) => t(`support.status.${value}`, value) },
    ],
    [t],
  );

  return (
    <PageContainer className="pb-8">
      <div className="w-full">
        <div className="mb-6 border-b border-gray-100 pb-4">
          <h1 className="text-2xl font-bold text-gray-900">
            {t("support.inquiryHistory")}
          </h1>
        </div>

        <InquiryHistoryFilter
          allThreads={allThreads}
          columns={filterColumns}
          handleFilterChange={handleFilterChange}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          statusOptions={statusOptions}
        />

        <Card>
          <CardBody>
            <InquiryHistoryTable
              loading={loading}
              filteredThreads={filteredThreads}
              allThreads={allThreads}
              openDetailModal={openDetailModal}
              navigate={navigate}
              getStatusBadge={getStatusBadge}
              getCategoryBadge={getCategoryBadge}
            />
          </CardBody>
        </Card>
      </div>

      <ThreadDetailModal
        threadId={selectedThreadId}
        isOpen={selectedThreadId !== null}
        onClose={closeDetailModal}
        onMessageSent={loadThreads}
      />
    </PageContainer>
  );
}
