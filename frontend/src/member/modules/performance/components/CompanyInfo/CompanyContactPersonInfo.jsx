/**
 * Company Contact Person Info
 *
 * 企业负责人信息部分。
 * 遵循 dev-frontend_patterns skill 规范。
 */

import React from "react";
import { useTranslation } from "react-i18next";
import { Card, Input } from "@shared/components";

const CompanyContactPersonInfo = ({ data, isEditing, onChange, errors }) => {
  const { t } = useTranslation();

  return (
    <Card className="shadow-sm p-0">
      <div className="flex items-center gap-3 border-b border-gray-100 p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-gray-900 m-0">
          {t("performance.companyInfo.sections.contactPerson", "负责人信息")}
        </h2>
      </div>
      <div className="p-6 sm:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label={t(
              "performance.companyInfo.fields.contactPersonName",
              "负责人姓名",
            )}
            value={data.contactPersonName}
            onChange={(e) => onChange("contactPersonName", e.target.value)}
            disabled={!isEditing}
          />
          <Input
            label={t(
              "performance.companyInfo.fields.contactPersonDepartment",
              "部门",
            )}
            value={data.contactPersonDepartment}
            onChange={(e) =>
              onChange("contactPersonDepartment", e.target.value)
            }
            disabled={!isEditing}
          />
          <Input
            label={t(
              "performance.companyInfo.fields.contactPersonPosition",
              "职位",
            )}
            value={data.contactPersonPosition}
            onChange={(e) => onChange("contactPersonPosition", e.target.value)}
            disabled={!isEditing}
          />
          <Input
            label={t(
              "performance.companyInfo.fields.contactPersonPhone",
              "联系电话",
            )}
            value={data.contactPersonPhone}
            onChange={(e) => onChange("contactPersonPhone", e.target.value)}
            disabled={!isEditing}
          />
        </div>
      </div>
    </Card>
  );
};

export default CompanyContactPersonInfo;
