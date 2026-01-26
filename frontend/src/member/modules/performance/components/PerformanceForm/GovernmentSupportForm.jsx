/**
 * Government Support Form
 *
 * 政府支援记录表单部分。
 * 遵循 dev-frontend_patterns skill 规范。
 */

import React from "react";
import { useTranslation } from "react-i18next";
import { Card, Button, Input, FileAttachments } from "@shared/components";
import { PlusIcon, TrashIcon } from "@shared/components/Icons";

const GovernmentSupportForm = ({
  data = [],
  onChange,
  onUpload,
  uploading,
}) => {
  const { t } = useTranslation();

  const handleAddField = () => {
    const newItem = {
      projectName: "",
      startupProjectName: "",
      startDate: "",
      endDate: "",
      supportAmount: "",
      supportOrganization: "",
      attachments: [],
    };
    onChange([...data, newItem]);
  };

  const handleRemoveField = (index) => {
    onChange(data.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...data];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg">
        <h3 className="text-md font-semibold m-0">
          {t("performance.governmentSupport", "정부지원")}
        </h3>
        <Button variant="secondary" size="small" onClick={handleAddField}>
          <PlusIcon className="w-4 h-4 mr-1" />
          {t("performance.governmentSupportFields.add", "添加")}
        </Button>
      </div>

      {data.length === 0 && (
        <div className="text-center py-12 text-gray-400 border border-dashed border-gray-200 rounded-lg">
          {t("common.noData", "暂无数据")}
        </div>
      )}

      {data.map((item, index) => (
        <Card key={index} className="p-4 relative">
          <div className="flex justify-between items-center mb-4">
            <span className="text-primary-600 font-bold">#{index + 1}</span>
            <Button
              variant="ghost"
              size="small"
              onClick={() => handleRemoveField(index)}
              className="text-red-500 hover:bg-red-50"
            >
              <TrashIcon className="w-4 h-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={t(
                "performance.governmentSupportFields.projectName",
                "실행 프로젝트명",
              )}
              value={item.projectName}
              onChange={(e) =>
                handleItemChange(index, "projectName", e.target.value)
              }
            />
            <Input
              label={t(
                "performance.governmentSupportFields.startupProjectName",
                "창업 프로젝트명",
              )}
              value={item.startupProjectName}
              onChange={(e) =>
                handleItemChange(index, "startupProjectName", e.target.value)
              }
            />
            <Input
              label={t(
                "performance.governmentSupportFields.supportOrganization",
                "지원 기관명",
              )}
              value={item.supportOrganization}
              onChange={(e) =>
                handleItemChange(index, "supportOrganization", e.target.value)
              }
            />
            <Input
              label={`${t("performance.governmentSupportFields.supportAmount", "지원 금액")} (${t("performance.governmentSupportFields.supportAmountUnit", "천원")})`}
              value={item.supportAmount}
              onChange={(e) =>
                handleItemChange(index, "supportAmount", e.target.value)
              }
              placeholder="0"
            />
            <Input
              label={t(
                "performance.governmentSupportFields.startDate",
                "시작일",
              )}
              type="date"
              value={item.startDate}
              onChange={(e) =>
                handleItemChange(index, "startDate", e.target.value)
              }
            />
            <Input
              label={t("performance.governmentSupportFields.endDate", "종료일")}
              type="date"
              value={item.endDate}
              onChange={(e) =>
                handleItemChange(index, "endDate", e.target.value)
              }
            />
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <FileAttachments
              label={t(
                "performance.governmentSupportFields.proofDocument",
                "증빙서류",
              )}
              attachments={item.attachments || []}
              onChange={async (files) => {
                if (
                  Array.isArray(files) &&
                  files.length > 0 &&
                  files[0] instanceof File
                ) {
                  const uploaded = await onUpload(files);
                  if (uploaded) {
                    handleItemChange(index, "attachments", [
                      ...(item.attachments || []),
                      ...uploaded,
                    ]);
                  }
                } else {
                  handleItemChange(index, "attachments", files);
                }
              }}
              uploading={uploading}
            />
          </div>
        </Card>
      ))}
    </div>
  );
};

export default GovernmentSupportForm;
