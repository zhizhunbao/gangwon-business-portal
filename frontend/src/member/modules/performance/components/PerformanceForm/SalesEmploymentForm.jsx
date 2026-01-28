/**
 * Sales and Employment Form
 *
 * 销售额与雇佣表单部分。
 * 遵循 dev-frontend_patterns skill 规范。
 */

import React from "react";
import { useTranslation } from "react-i18next";
import { Input, FileAttachments } from "@shared/components";

// 格式化金额（添加千位分隔符）
const formatAmount = (value) => {
  if (!value) return "";
  const numStr = value.toString().replace(/[^\d]/g, "");
  return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

// 解析金额（移除千位分隔符）
const parseAmount = (value) => {
  if (!value) return "";
  return value.toString().replace(/,/g, "");
};

const SalesEmploymentForm = ({ data, year, onChange, onUpload, uploading }) => {
  const { t } = useTranslation();

  const handleAmountChange = (field, value) => {
    const parsed = parseAmount(value);
    onChange(field, parsed);
  };

  return (
    <div className="space-y-8">
      {/* Sales */}
      <div>
        <h3 className="text-md font-semibold mb-4 pb-2 border-b border-gray-100 flex items-center justify-between">
          <span>{t("performance.salesEmploymentFields.sales", "매출액")}</span>
          <span className="text-sm font-normal text-gray-400">
            ({t("performance.salesEmploymentFields.unit.won", "원")})
          </span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label={t(
              "performance.salesEmploymentFields.previousYear",
              "전년도",
            )}
            value={formatAmount(data?.sales?.previousYear)}
            onChange={(e) =>
              handleAmountChange("salesEmployment.sales.previousYear", e.target.value)
            }
            placeholder="0"
          />
          <Input
            label={`${year}${t("performance.year", "년도")}`}
            value={formatAmount(data?.sales?.currentYear)}
            onChange={(e) =>
              handleAmountChange("salesEmployment.sales.currentYear", e.target.value)
            }
            placeholder="0"
          />
          <Input
            label={t(
              "performance.salesEmploymentFields.reportingDate",
              "작성 기준일",
            )}
            type="date"
            value={data?.sales?.reportingDate || ""}
            onChange={(e) =>
              onChange("salesEmployment.sales.reportingDate", e.target.value)
            }
          />
        </div>
      </div>

      {/* Export */}
      <div>
        <h3 className="text-md font-semibold mb-4 pb-2 border-b border-gray-100 flex items-center justify-between">
          <span>{t("performance.salesEmploymentFields.export", "수출액")}</span>
          <span className="text-sm font-normal text-gray-400">
            ({t("performance.salesEmploymentFields.unit.won", "원")})
          </span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label={t(
              "performance.salesEmploymentFields.previousYear",
              "전년도",
            )}
            value={formatAmount(data?.export?.previousYear)}
            onChange={(e) =>
              handleAmountChange("salesEmployment.export.previousYear", e.target.value)
            }
            placeholder="0"
          />
          <Input
            label={`${year}${t("performance.year", "년도")}`}
            value={formatAmount(data?.export?.currentYear)}
            onChange={(e) =>
              handleAmountChange("salesEmployment.export.currentYear", e.target.value)
            }
            placeholder="0"
          />
          <Input
            label={t(
              "performance.salesEmploymentFields.reportingDate",
              "작성 기준일",
            )}
            type="date"
            value={data?.export?.reportingDate || ""}
            onChange={(e) =>
              onChange("salesEmployment.export.reportingDate", e.target.value)
            }
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <Input
            label={t("performance.salesEmploymentFields.hskCode", "HSK 코드")}
            value={data?.export?.hskCode || ""}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9]/g, "").slice(0, 10);
              onChange("salesEmployment.export.hskCode", val);
            }}
            placeholder={t("performance.salesEmploymentFields.hskCodePlaceholder", "HSK코드 10자리")}
            maxLength={10}
          />
          <Input
            label={t(
              "performance.salesEmploymentFields.exportCountry1",
              "수출 국가 1",
            )}
            value={data?.export?.exportCountry1 || ""}
            onChange={(e) =>
              onChange("salesEmployment.export.exportCountry1", e.target.value)
            }
          />
          <Input
            label={t(
              "performance.salesEmploymentFields.exportCountry2",
              "수출 국가 2",
            )}
            value={data?.export?.exportCountry2 || ""}
            onChange={(e) =>
              onChange("salesEmployment.export.exportCountry2", e.target.value)
            }
          />
        </div>
      </div>

      {/* Employment */}
      <div>
        <h3 className="text-md font-semibold mb-4 pb-2 border-b border-gray-100 flex items-center justify-between">
          <span>
            {t("performance.salesEmploymentFields.employment", "고용 창출")}
          </span>
          <span className="text-sm font-normal text-gray-400">
            ({t("performance.salesEmploymentFields.unit.people", "명")})
          </span>
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <span className="text-sm font-medium pt-8">
              {t(
                "performance.salesEmploymentFields.currentEmployees",
                "현재 직원 수",
              )}
            </span>
            <Input
              label={t(
                "performance.salesEmploymentFields.previousYear",
                "전년도",
              )}
              value={data?.employment?.currentEmployees?.previousYear || ""}
              onChange={(e) =>
                onChange(
                  "salesEmployment.employment.currentEmployees.previousYear",
                  e.target.value,
                )
              }
              placeholder="0"
            />
            <Input
              label={`${year}${t("performance.year", "년도")}`}
              value={data?.employment?.currentEmployees?.currentYear || ""}
              onChange={(e) =>
                onChange(
                  "salesEmployment.employment.currentEmployees.currentYear",
                  e.target.value,
                )
              }
              placeholder="0"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <span className="text-sm font-medium pt-8">
              {t(
                "performance.salesEmploymentFields.newEmployees",
                "신규 고용 인원",
              )}
            </span>
            <Input
              label={t(
                "performance.salesEmploymentFields.previousYear",
                "전년도",
              )}
              value={data?.employment?.newEmployees?.previousYear || ""}
              onChange={(e) =>
                onChange(
                  "salesEmployment.employment.newEmployees.previousYear",
                  e.target.value,
                )
              }
              placeholder="0"
            />
            <Input
              label={`${year}${t("performance.year", "년도")}`}
              value={data?.employment?.newEmployees?.currentYear || ""}
              onChange={(e) =>
                onChange(
                  "salesEmployment.employment.newEmployees.currentYear",
                  e.target.value,
                )
              }
              placeholder="0"
            />
          </div>
        </div>
      </div>

      {/* Attachments */}
      <div>
        <h3 className="text-md font-semibold mb-4 pb-2 border-b border-gray-100">
          {t("performance.salesEmploymentFields.attachments", "증빙서류")}
        </h3>
        <FileAttachments
          attachments={data?.attachments || []}
          onChange={async (files) => {
            if (
              Array.isArray(files) &&
              files.length > 0 &&
              files[0] instanceof File
            ) {
              const uploaded = await onUpload(files);
              if (uploaded) {
                const current = data?.attachments || [];
                onChange("salesEmployment.attachments", [
                  ...current,
                  ...uploaded,
                ]);
              }
            } else {
              onChange("salesEmployment.attachments", files);
            }
          }}
          uploading={uploading}
        />
      </div>
    </div>
  );
};

export default SalesEmploymentForm;
