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
      publicDisclosure: "",
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
      label: t('performance.intellectualPropertyFields.types.patent', '특허'),
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
      label: t('performance.intellectualPropertyFields.types.design', '디자인'),
    },
    {
      value: "other",
      label: t('performance.intellectualPropertyFields.types.other', '기타'),
    },
  ];

  const registrationTypeOptions = [
    {
      value: "application",
      label: t("performance.intellectualPropertyFields.registrationTypes.application", "신청"),
    },
    {
      value: "registered",
      label: t("performance.intellectualPropertyFields.registrationTypes.registered", "등록"),
    },
  ];

  const overseasTypeOptions = [
    {
      value: "domestic",
      label: t("performance.intellectualPropertyFields.overseasTypes.domestic", "국내"),
    },
    {
      value: "overseas",
      label: t("performance.intellectualPropertyFields.overseasTypes.overseas", "해외"),
    },
  ];

  const publicDisclosureOptions = [
    {
      value: "yes",
      label: t("common.yes", "예"),
    },
    {
      value: "no",
      label: t("common.no", "아니오"),
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
          {t('common.add', '추가')}
        </Button>
      </div>

      {data.length === 0 && (
        <div className="text-center py-12 text-gray-400 border border-dashed border-gray-200 rounded-lg">
          {t('common.noData', '데이터가 없습니다')}
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
            <Select
              label={t("performance.intellectualPropertyFields.registrationType", "등록 구분")}
              value={item.registrationType}
              onChange={(e) => handleItemChange(index, "registrationType", e.target.value)}
              options={registrationTypeOptions}
            />
            <Input
              label={t("performance.intellectualPropertyFields.country", "국가")}
              value={item.country}
              onChange={(e) => handleItemChange(index, "country", e.target.value)}
              placeholder={t("performance.intellectualPropertyFields.countryPlaceholder", "예: 대한민국")}
            />
            <Select
              label={t("performance.intellectualPropertyFields.overseasType", "해외신청구분")}
              value={item.overseasType}
              onChange={(e) => handleItemChange(index, "overseasType", e.target.value)}
              options={overseasTypeOptions}
            />
            <Select
              label={t("performance.intellectualPropertyFields.publicDisclosure", "공개희망 여부")}
              value={item.publicDisclosure}
              onChange={(e) => handleItemChange(index, "publicDisclosure", e.target.value)}
              options={publicDisclosureOptions}
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
