/**
 * Intellectual Property Form
 *
 * 知识产权记录表单部分。
 * 遵循 dev-frontend_patterns skill 规范。
 */

import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Card,
  Button,
  Input,
  Select,
  FileAttachments,
} from "@shared/components";
import { PlusIcon, TrashIcon } from "@shared/components/Icons";

const IntellectualPropertyForm = ({
  data = [],
  onChange,
  onUpload,
  uploading,
}) => {
  const { t } = useTranslation();

  const handleAddField = () => {
    const newItem = {
      name: "",
      number: "",
      type: "",
      registrationType: "",
      country: "",
      overseasType: "",
      registrationDate: "",
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

  const ipTypeOptions = [
    {
      value: "patent",
      label: t("performance.intellectualPropertyFields.types.patent", "专利"),
    },
    {
      value: "trademark",
      label: t(
        "performance.intellectualPropertyFields.types.trademark",
        "商标权",
      ),
    },
    {
      value: "utility",
      label: t(
        "performance.intellectualPropertyFields.types.utility",
        "实用新型",
      ),
    },
    {
      value: "design",
      label: t("performance.intellectualPropertyFields.types.design", "设计"),
    },
    {
      value: "other",
      label: t("performance.intellectualPropertyFields.types.other", "其他"),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg">
        <h3 className="text-md font-semibold m-0">
          {t("performance.intellectualProperty", "지식재산권")}
        </h3>
        <Button variant="secondary" size="small" onClick={handleAddField}>
          <PlusIcon className="w-4 h-4 mr-1" />
          {t("common.add", "添加")}
        </Button>
      </div>

      {data.length === 0 && (
        <div className="text-center py-12 text-gray-400 border border-dashed border-gray-200 rounded-lg">
          {t("common.noData", "暂无数据")}
        </div>
      )}

      {data.map((item, index) => (
        <Card key={index} className="p-4">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input
              label={t(
                "performance.intellectualPropertyFields.name",
                "지식재산권명",
              )}
              value={item.name}
              onChange={(e) => handleItemChange(index, "name", e.target.value)}
            />
            <Input
              label={t(
                "performance.intellectualPropertyFields.number",
                "지식재산권번호",
              )}
              value={item.number}
              onChange={(e) =>
                handleItemChange(index, "number", e.target.value)
              }
            />
            <Select
              label={t("performance.intellectualPropertyFields.type", "유형")}
              value={item.type}
              onChange={(e) => handleItemChange(index, "type", e.target.value)}
              options={ipTypeOptions}
            />
            <Input
              label={t(
                "performance.intellectualPropertyFields.registrationDate",
                "등록/신청일",
              )}
              type="date"
              value={item.registrationDate}
              onChange={(e) =>
                handleItemChange(index, "registrationDate", e.target.value)
              }
            />
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <FileAttachments
              label={t(
                "performance.intellectualPropertyFields.proofDocument",
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

export default IntellectualPropertyForm;
