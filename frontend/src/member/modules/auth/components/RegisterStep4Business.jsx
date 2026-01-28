import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import {
  STARTUP_TYPE_KEYS,
  KSIC_MAJOR_CATEGORY_KEYS,
  BUSINESS_FIELD_KEYS,
  MAIN_INDUSTRY_KSIC_MAJOR_KEYS,
  getSubCategoryKeysByMajor,
  getMainIndustryKsicCodesByMajor,
  translateOptions,
} from "@/shared/data/industryClassification";

export const RegisterStep4Business = ({
  formData,
  handleChange,
  setFormData,
}) => {
  const { t } = useTranslation();

  const [ksicSubOptions, setKsicSubOptions] = useState([]);
  const [mainIndustrySubOptions, setMainIndustrySubOptions] = useState([]);

  useEffect(() => {
    if (formData.ksicMajor) {
      const subOptions = getSubCategoryKeysByMajor(formData.ksicMajor);
      setKsicSubOptions(translateOptions(subOptions, t));
    } else {
      setKsicSubOptions([]);
      setFormData((prev) => ({ ...prev, ksicSub: "" }));
    }
  }, [formData.ksicMajor, t, setFormData]);

  useEffect(() => {
    if (formData.mainIndustryKsicMajor) {
      const subOptions = getMainIndustryKsicCodesByMajor(
        formData.mainIndustryKsicMajor
      );
      setMainIndustrySubOptions(translateOptions(subOptions, t));
    } else {
      setMainIndustrySubOptions([]);
      setFormData((prev) => ({ ...prev, mainIndustryKsicCodes: "" }));
    }
  }, [formData.mainIndustryKsicMajor, t, setFormData]);

  const startupTypeOptions = translateOptions(STARTUP_TYPE_KEYS, t);
  const ksicMajorOptions = translateOptions(KSIC_MAJOR_CATEGORY_KEYS, t);
  const businessFieldOptions = translateOptions(BUSINESS_FIELD_KEYS, t);
  const mainIndustryMajorOptions = translateOptions(
    MAIN_INDUSTRY_KSIC_MAJOR_KEYS,
    t
  );

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t("auth.startupType", "창업유형")}
        </label>
        <select
          name="startupType"
          value={formData.startupType || ""}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
        >
          <option value="">
            {t("auth.selectStartupType", "창업유형을 선택하세요")}
          </option>
          {startupTypeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t("auth.businessField", "사업 분야")}
        </label>
        <select
          name="businessField"
          value={formData.businessField || ""}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
        >
          <option value="">
            {t("auth.selectBusinessField", "사업 분야를 선택하세요")}
          </option>
          {businessFieldOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("auth.ksicMajor", "한국표준산업분류코드[대분류]")}
          </label>
          <select
            name="ksicMajor"
            value={formData.ksicMajor || ""}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
          >
            <option value="">
              {t("auth.selectKsicMajor", "대분류를 선택하세요")}
            </option>
            {ksicMajorOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("auth.ksicSub", "한국표준산업분류코드[중분류]")}
          </label>
          <select
            name="ksicSub"
            value={formData.ksicSub || ""}
            onChange={handleChange}
            disabled={!formData.ksicMajor}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">
              {formData.ksicMajor
                ? t("auth.selectKsicSub", "중분류를 선택하세요")
                : t("auth.selectKsicMajorFirst", "먼저 대분류를 선택하세요")}
            </option>
            {ksicSubOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("auth.mainIndustryKsicMajor", "주력산업 KSIC 코드")}
          </label>
          <select
            name="mainIndustryKsicMajor"
            value={formData.mainIndustryKsicMajor || ""}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
          >
            <option value="">
              {t(
                "auth.selectMainIndustryKsicMajor",
                "주력산업을 선택하세요"
              )}
            </option>
            {mainIndustryMajorOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("auth.mainIndustryKsicCodes", "주력산업 KSIC 세부 코드")}
          </label>
          <select
            name="mainIndustryKsicCodes"
            value={formData.mainIndustryKsicCodes || ""}
            onChange={handleChange}
            disabled={!formData.mainIndustryKsicMajor}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">
              {formData.mainIndustryKsicMajor
                ? t(
                    "auth.selectMainIndustryKsicCodes",
                    "세부 코드를 선택하세요"
                  )
                : t(
                    "auth.selectMainIndustryKsicMajorFirst",
                    "먼저 주력산업을 선택하세요"
                  )}
            </option>
            {mainIndustrySubOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t("auth.sales")}
        </label>
        <input
          type="text"
          name="sales"
          value={formData.sales}
          onChange={handleChange}
          placeholder="0"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t("auth.employeeCount")}
        </label>
        <input
          type="text"
          name="employeeCount"
          value={formData.employeeCount}
          onChange={handleChange}
          placeholder="0"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t("auth.websiteUrl")}
        </label>
        <input
          type="url"
          name="websiteUrl"
          value={formData.websiteUrl}
          onChange={handleChange}
          placeholder="https://example.com"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t("auth.mainBusiness")}
        </label>
        <textarea
          name="mainBusiness"
          value={formData.mainBusiness}
          onChange={handleChange}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t("auth.cooperationFields")}
        </label>
        <input
          type="text"
          value={formData.cooperationFields.join(", ")}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              cooperationFields: e.target.value
                .split(",")
                .map((v) => v.trim())
                .filter((v) => v),
            }))
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
        />
        <p className="mt-1 text-xs text-gray-500">
          {t("common.commaSeparatedHint", "여러 값은 쉼표로 구분해주세요")}
        </p>
      </div>
    </div>
  );
};
