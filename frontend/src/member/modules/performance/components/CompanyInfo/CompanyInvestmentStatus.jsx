/**
 * Company Investment Status
 *
 * 企业投资状态部分。
 * 遵循 dev-frontend_patterns skill 规范。
 */

import React from "react";
import { useTranslation } from "react-i18next";
import { Card, Input, Select } from "@shared/components";

const CompanyInvestmentStatus = ({ data, isEditing, onChange }) => {
  const { t } = useTranslation();

  const investmentOptions = [
    { value: true, label: t("common.yes", "是") },
    { value: false, label: t("common.no", "否") },
  ];

  const status = data.investmentStatus || {
    hasInvestment: false,
    amount: "",
    institution: "",
  };

  return (
    <Card className="shadow-sm p-0">
      <div className="flex items-center gap-3 border-b border-gray-100 p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-gray-900 m-0">
          {t("performance.companyInfo.sections.investmentStatus", "投资状态")}
        </h2>
      </div>
      <div className="p-6 sm:p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Select
            label={t(
              "performance.companyInfo.fields.hasInvestment",
              "是否有投资",
            )}
            value={status.hasInvestment}
            onChange={(e) =>
              onChange("hasInvestment", e.target.value === "true")
            }
            options={investmentOptions}
            disabled={!isEditing}
          />
          {status.hasInvestment && (
            <>
              <Input
                label={t(
                  "performance.companyInfo.fields.investmentAmount",
                  "投资金额",
                )}
                value={status.amount}
                onChange={(e) => onChange("amount", e.target.value)}
                disabled={!isEditing}
                placeholder="0"
              />
              <Input
                label={t(
                  "performance.companyInfo.fields.investmentInstitution",
                  "投资机构",
                )}
                value={status.institution}
                onChange={(e) => onChange("institution", e.target.value)}
                disabled={!isEditing}
              />
            </>
          )}
        </div>
      </div>
    </Card>
  );
};

export default CompanyInvestmentStatus;
