/**
 * 申请记录列表组件
 *
 * 处理加载中、无数据及列表渲染。
 * 遵循 dev-frontend_patterns skill 规范。
 */

import { useTranslation } from "react-i18next";
import { Card } from "@shared/components";
import ApplicationRecordsTable from "./ApplicationRecordsTable";
import ApplicationRecordsMobileList from "./ApplicationRecordsMobileList";

export function ApplicationRecordsList({
  applications,
  loading,
  hasApplications,
  getStatusInfo,
  renderActionButtons,
}) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <Card>
        <div className="text-center py-12 px-4">
          <p className="text-base text-gray-500 m-0">
            {t("projects.applicationRecords.loading", "加载中...")}
          </p>
        </div>
      </Card>
    );
  }

  if (applications.length === 0) {
    return (
      <Card>
        <div className="text-center py-12 px-4">
          <p className="text-base text-gray-500 m-0">
            {!hasApplications
              ? t("projects.applicationRecords.noRecords", "暂无申请记录")
              : t("common.noSearchResults", "没有找到匹配的结果")}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <ApplicationRecordsTable
        applications={applications}
        getStatusInfo={getStatusInfo}
        renderActionButtons={renderActionButtons}
      />
      <ApplicationRecordsMobileList
        applications={applications}
        getStatusInfo={getStatusInfo}
        renderActionButtons={renderActionButtons}
      />
    </>
  );
}
