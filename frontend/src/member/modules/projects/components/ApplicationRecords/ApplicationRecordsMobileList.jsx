/**
 * 申请记录移动端列表组件
 *
 * 负责在移动端视图下渲染申请记录列表，包含状态展示和操作按钮。
 * 遵循 dev-frontend_patterns skill 规范。
 */
import { useTranslation } from "react-i18next";
import { Card, Badge } from "@shared/components";
import { formatDate } from "@shared/utils";

export default function ApplicationRecordsMobileList({
  applications,
  getStatusInfo,
  renderActionButtons,
}) {
  const { t } = useTranslation();

  return (
    <div className="md:hidden flex flex-col gap-4">
      {applications.map((application) => {
        const statusInfo = getStatusInfo(application.status);
        return (
          <Card key={application.id} className="p-4">
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-base font-semibold text-gray-900 flex-1 pr-2">
                {application.projectTitle || "-"}
              </h3>
              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
            </div>
            <div className="space-y-2 text-sm text-gray-600 mb-4">
              <div className="flex justify-between">
                <span>
                  {t("projects.applicationRecords.applicationDate", "申请日期")}
                  :
                </span>
                <span>
                  {application.submittedAt
                    ? formatDate(application.submittedAt)
                    : "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>
                  {t("projects.applicationRecords.processedDate", "处理日期")}:
                </span>
                <span>
                  {application.reviewedAt
                    ? formatDate(application.reviewedAt)
                    : "-"}
                </span>
              </div>
            </div>
            {renderActionButtons(application, true)}
          </Card>
        );
      })}
    </div>
  );
}
