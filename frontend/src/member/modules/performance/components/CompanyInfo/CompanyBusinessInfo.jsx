/**
 * Company Business Info
 *
 * 企业经营信息部分。
 * 遵循 dev-frontend_patterns skill 规范。
 */

import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, Input, Select, Badge } from "@shared/components";
import {
  STARTUP_TYPE_KEYS,
  KSIC_MAJOR_CATEGORY_KEYS,
  getSubCategoryKeysByMajor,
  BUSINESS_FIELD_KEYS,
  MAIN_INDUSTRY_KSIC_MAJOR_KEYS,
  getMainIndustryKsicCodesByMajor,
  translateOptions,
} from "../../enum";

const CompanyBusinessInfo = ({
  data,
  isEditing,
  onChange,
  onCooperationChange,
  onParticipationChange,
}) => {
  const { t, i18n } = useTranslation();

  // Options
  const startupTypeOptions = useMemo(
    () => translateOptions(STARTUP_TYPE_KEYS, t),
    [t, i18n.language],
  );
  const ksicMajorOptions = useMemo(
    () => translateOptions(KSIC_MAJOR_CATEGORY_KEYS, t),
    [t, i18n.language],
  );
  const ksicSubOptions = useMemo(() => {
    const subKeys = getSubCategoryKeysByMajor(data.ksicMajor);
    return translateOptions(subKeys, t);
  }, [data.ksicMajor, t, i18n.language]);

  const mainIndustryKsicMajorOptions = useMemo(
    () => translateOptions(MAIN_INDUSTRY_KSIC_MAJOR_KEYS, t),
    [t, i18n.language],
  );
  const mainIndustryKsicCodeOptions = useMemo(() => {
    const codeKeys = getMainIndustryKsicCodesByMajor(
      data.mainIndustryKsicMajor,
    );
    return translateOptions(codeKeys, t);
  }, [data.mainIndustryKsicMajor, t, i18n.language]);

  const businessFieldOptions = useMemo(
    () => translateOptions(BUSINESS_FIELD_KEYS, t),
    [t, i18n.language],
  );

  const cooperationFieldOptions = [
    {
      value: "field1",
      label: t(
        "performance.companyInfo.profile.cooperationFields.field1",
        "技术合作",
      ),
    },
    {
      value: "field2",
      label: t(
        "performance.companyInfo.profile.cooperationFields.field2",
        "市场拓展",
      ),
    },
    {
      value: "field3",
      label: t(
        "performance.companyInfo.profile.cooperationFields.field3",
        "人才培养",
      ),
    },
  ];

  const participationProgramOptions = [
    {
      value: "startup_center_university",
      label: t(
        "performance.companyInfo.profile.participationPrograms.startupCenterUniversity",
        "创业中心大学",
      ),
    },
    {
      value: "global_business",
      label: t(
        "performance.companyInfo.profile.participationPrograms.globalBusiness",
        "全球事业",
      ),
    },
    {
      value: "rise_business",
      label: t(
        "performance.companyInfo.profile.participationPrograms.riseBusiness",
        "RISE 事业",
      ),
    },
    {
      value: "none",
      label: t(
        "performance.companyInfo.profile.participationPrograms.none",
        "无",
      ),
    },
  ];

  return (
    <Card className="shadow-sm p-0">
      <div className="flex items-center gap-3 border-b border-gray-100 p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-gray-900 m-0">
          {t("performance.companyInfo.sections.businessInfo", "经营信息")}
        </h2>
      </div>
      <div className="p-6 sm:p-8 space-y-8">
        {/* Industry Classification */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Select
            label={t("performance.companyInfo.fields.startupType", "企业类型")}
            value={data.startupType}
            onChange={(e) => onChange("startupType", e.target.value)}
            options={startupTypeOptions}
            disabled={!isEditing}
          />
          <Select
            label={t(
              "performance.companyInfo.fields.businessField",
              "业务领域",
            )}
            value={data.businessField}
            onChange={(e) => onChange("businessField", e.target.value)}
            options={businessFieldOptions}
            disabled={!isEditing}
          />
          <Select
            label={t("performance.companyInfo.fields.ksicMajor", "KSIC 大类")}
            value={data.ksicMajor}
            onChange={(e) => onChange("ksicMajor", e.target.value)}
            options={ksicMajorOptions}
            disabled={!isEditing}
          />
          <Select
            label={t("performance.companyInfo.fields.ksicSub", "KSIC 小类")}
            value={data.ksicSub}
            onChange={(e) => onChange("ksicSub", e.target.value)}
            options={ksicSubOptions}
            disabled={!isEditing}
          />
        </div>

        {/* Main Industry */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Select
            label={t(
              "performance.companyInfo.fields.mainIndustryKsicMajor",
              "主要行业 KSIC 大类",
            )}
            value={data.mainIndustryKsicMajor}
            onChange={(e) => onChange("mainIndustryKsicMajor", e.target.value)}
            options={mainIndustryKsicMajorOptions}
            disabled={!isEditing}
          />
          <Select
            label={t(
              "performance.companyInfo.fields.mainIndustryKsicCodes",
              "主要行业 KSIC 代码",
            )}
            value={data.mainIndustryKsicCodes}
            onChange={(e) => onChange("mainIndustryKsicCodes", e.target.value)}
            options={mainIndustryKsicCodeOptions}
            disabled={!isEditing}
          />
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label={t("performance.companyInfo.fields.revenue", "年销售额 (元)")}
            value={data.revenue}
            onChange={(e) => onChange("revenue", e.target.value)}
            disabled={!isEditing}
            placeholder="0"
          />
          <Input
            label={t(
              "performance.companyInfo.fields.employeeCount",
              "员工人数",
            )}
            value={data.employeeCount}
            onChange={(e) => onChange("employeeCount", e.target.value)}
            disabled={!isEditing}
            placeholder="0"
          />
        </div>

        {/* Checkboxes for cooperation fields */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {t(
              "performance.companyInfo.fields.cooperationFields",
              "合作需求领域",
            )}
          </label>
          <div className="flex flex-wrap gap-3">
            {isEditing ? (
              cooperationFieldOptions.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={data.cooperationFields?.includes(opt.value)}
                    onChange={(e) =>
                      onCooperationChange(opt.value, e.target.checked)
                    }
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">{opt.label}</span>
                </label>
              ))
            ) : data.cooperationFields?.length > 0 ? (
              data.cooperationFields.map((val) => {
                const opt = cooperationFieldOptions.find(
                  (o) => o.value === val,
                );
                return (
                  <span
                    key={val}
                    className="px-3 py-1.5 text-sm font-medium text-primary-700 bg-primary-50 border border-primary-100 rounded-md"
                  >
                    {opt ? opt.label : val}
                  </span>
                );
              })
            ) : (
              <span className="text-sm text-gray-400">
                {t("common.notSet", "未设置")}
              </span>
            )}
          </div>
        </div>

        {/* Participation Programs */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {t(
              "performance.companyInfo.fields.participationPrograms",
              "参与项目",
            )}
          </label>
          <div className="flex flex-wrap gap-3">
            {isEditing ? (
              participationProgramOptions.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={data.participationPrograms?.includes(opt.value)}
                    onChange={(e) =>
                      onParticipationChange(opt.value, e.target.checked)
                    }
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">{opt.label}</span>
                </label>
              ))
            ) : data.participationPrograms?.length > 0 ? (
              data.participationPrograms.map((val) => {
                const opt = participationProgramOptions.find(
                  (o) => o.value === val,
                );
                return (
                  <span
                    key={val}
                    className="px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 border border-green-100 rounded-md"
                  >
                    {opt ? opt.label : val}
                  </span>
                );
              })
            ) : (
              <span className="text-sm text-gray-400">
                {t("common.notSet", "未设置")}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default CompanyBusinessInfo;
