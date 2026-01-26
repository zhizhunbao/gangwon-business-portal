import { useTranslation } from "react-i18next";
import { Card, Badge } from "@shared/components";
import { formatDate } from "@shared/utils";

export default function ApplicationRecordsTable({
  applications,
  getStatusInfo,
  renderActionButtons,
}) {
  const { t } = useTranslation();

  return (
    <Card className="hidden md:block overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                {t("projects.applicationRecords.projectName", "项目名称")}
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                {t("projects.applicationRecords.applicationDate", "申请日期")}
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                {t("projects.applicationRecords.progressStatus", "进度状态")}
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                {t("projects.applicationRecords.processedDate", "处理日期")}
              </th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">
                {t("projects.applicationRecords.action", "操作")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {applications.map((application) => {
              const statusInfo = getStatusInfo(application.status);
              return (
                <tr
                  key={application.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-900 font-medium">
                      {application.projectTitle || "-"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">
                      {application.submittedAt
                        ? formatDate(application.submittedAt)
                        : "-"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={statusInfo.variant}>
                      {statusInfo.label}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">
                      {application.reviewedAt
                        ? formatDate(application.reviewedAt)
                        : "-"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {renderActionButtons(application)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
