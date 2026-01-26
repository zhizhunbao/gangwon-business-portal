/**
 * Company Representative Info
 *
 * 企业法人信息部分。
 * 遵循 dev-frontend_patterns skill 规范。
 */

import React from "react";
import { useTranslation } from "react-i18next";
import { Card, Input, Select } from "@shared/components";

const CompanyRepresentativeInfo = ({ data, isEditing, onChange, errors }) => {
  const { t } = useTranslation();

  const genderOptions = [
    { value: "male", label: t("common.gender.male", "男") },
    { value: "female", label: t("common.gender.female", "女") },
  ];

  return (
    <Card className="shadow-sm p-0">
      <div className="flex items-center gap-3 border-b border-gray-100 p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-gray-900 m-0">
          {t("performance.companyInfo.sections.representativeInfo", "法人信息")}
        </h2>
      </div>
      <div className="p-6 sm:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label={t(
              "performance.companyInfo.fields.representative",
              "法人姓名",
            )}
            value={data.representative}
            onChange={(e) => onChange("representative", e.target.value)}
            disabled={!isEditing}
            required
            error={errors.representative}
          />
          <Input
            label={t(
              "performance.companyInfo.fields.representativeBirthDate",
              "出生日期",
            )}
            type="date"
            value={data.representativeBirthDate}
            onChange={(e) =>
              onChange("representativeBirthDate", e.target.value)
            }
            disabled={!isEditing}
          />
          <Select
            label={t(
              "performance.companyInfo.fields.representativeGender",
              "性别",
            )}
            value={data.representativeGender}
            onChange={(e) => onChange("representativeGender", e.target.value)}
            options={genderOptions}
            disabled={!isEditing}
          />
          <Input
            label={t(
              "performance.companyInfo.fields.representativePhone",
              "联系电话",
            )}
            value={data.representativePhone}
            onChange={(e) => onChange("representativePhone", e.target.value)}
            disabled={!isEditing}
          />
        </div>
      </div>
    </Card>
  );
};

export default CompanyRepresentativeInfo;
