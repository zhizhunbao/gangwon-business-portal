/**
 * Sales and Employment Form
 *
 * 销售额与雇佣表单部分。
 * 遵循 dev-frontend_patterns skill 规范。
 */

import React from "react";
import { useTranslation } from "react-i18next";
import { Input, FileAttachments } from "@shared/components";

const SalesEmploymentForm = ({ data, year, onChange, onUpload, uploading }) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-8">
      {/* Sales */}
      <div>
        <h3 className="text-md font-semibold mb-4 pb-2 border-b border-gray-100 flex items-center justify-between">
          <span>{t("performance.salesEmploymentFields.sales", "销售额")}</span>
          <span className="text-sm font-normal text-gray-400">
            ({t("performance.salesEmploymentFields.unit.won", "元")})
          </span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label={t(
              "performance.salesEmploymentFields.previousYear",
              "前一年度",
            )}
            value={data?.sales?.previousYear || ""}
            onChange={(e) =>
              onChange("salesEmployment.sales.previousYear", e.target.value)
            }
            placeholder="0"
          />
          <Input
            label={`${year}${t("performance.year", "年度")}`}
            value={data?.sales?.currentYear || ""}
            onChange={(e) =>
              onChange("salesEmployment.sales.currentYear", e.target.value)
            }
            placeholder="0"
          />
          <Input
            label={t(
              "performance.salesEmploymentFields.reportingDate",
              "编写基准日",
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
          <span>{t("performance.salesEmploymentFields.export", "出口额")}</span>
          <span className="text-sm font-normal text-gray-400">
            ({t("performance.salesEmploymentFields.unit.won", "元")})
          </span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label={t(
              "performance.salesEmploymentFields.previousYear",
              "前一年度",
            )}
            value={data?.export?.previousYear || ""}
            onChange={(e) =>
              onChange("salesEmployment.export.previousYear", e.target.value)
            }
            placeholder="0"
          />
          <Input
            label={`${year}${t("performance.year", "年度")}`}
            value={data?.export?.currentYear || ""}
            onChange={(e) =>
              onChange("salesEmployment.export.currentYear", e.target.value)
            }
            placeholder="0"
          />
          <Input
            label={t(
              "performance.salesEmploymentFields.reportingDate",
              "编写基准日",
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
            label={t("performance.salesEmploymentFields.hskCode", "HSK 代码")}
            value={data?.export?.hskCode || ""}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9]/g, "").slice(0, 10);
              onChange("salesEmployment.export.hskCode", val);
            }}
            placeholder="HSK코드 10자리"
            maxLength={10}
          />
          <Input
            label={t(
              "performance.salesEmploymentFields.exportCountry1",
              "出口国家 1",
            )}
            value={data?.export?.exportCountry1 || ""}
            onChange={(e) =>
              onChange("salesEmployment.export.exportCountry1", e.target.value)
            }
          />
          <Input
            label={t(
              "performance.salesEmploymentFields.exportCountry2",
              "出口国家 2",
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
            {t("performance.salesEmploymentFields.employment", "雇佣创造")}
          </span>
          <span className="text-sm font-normal text-gray-400">
            ({t("performance.salesEmploymentFields.unit.people", "名")})
          </span>
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <span className="text-sm font-medium pt-8">
              {t(
                "performance.salesEmploymentFields.currentEmployees",
                "现有员工数",
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
              label={`${year}${t("performance.year", "年度")}`}
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
                "新雇佣人数",
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
              label={`${year}${t("performance.year", "年度")}`}
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
          {t("performance.salesEmploymentFields.attachments", "证明文件")}
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
