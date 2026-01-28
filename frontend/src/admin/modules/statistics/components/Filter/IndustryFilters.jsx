/*
 * IndustryFilters - 江原道主导产业筛选组件 (大类与细分联动)
 */
import { Select } from "@shared/components";
import { useTranslation } from "react-i18next";
import {
  MAIN_INDUSTRY_KSIC_MAJOR_KEYS,
  MAIN_INDUSTRY_KSIC_CODES,
  translateOptions,
} from "@shared/data/industryClassification";

export const IndustryFilters = ({ codes = [], subCodes = [], onChange }) => {
  const { t } = useTranslation();

  const majorValue = codes && codes.length > 0 ? codes[0] : "";
  const subValue = subCodes && subCodes.length > 0 ? subCodes[0] : "";

  // 转换大类选项
  const majorOptions = translateOptions(MAIN_INDUSTRY_KSIC_MAJOR_KEYS, t);

  // 根据大类获取细分选项
  const subCategories = majorValue
    ? MAIN_INDUSTRY_KSIC_CODES[majorValue] || []
    : [];
  const subOptions = translateOptions(subCategories, t);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={majorValue}
        options={majorOptions}
        placeholder={t("member.mainIndustryKsicMajor", "주력산업 KSIC 코드")}
        containerClassName="mb-0"
        className="w-48 h-9"
        onChange={(e) => {
          const val = e.target.value;
          onChange("gangwonIndustryCodes", val ? [val] : []);
          onChange("gangwonIndustrySubCodes", []);
        }}
      />
      <Select
        value={subValue}
        options={subOptions}
        disabled={!majorValue}
        placeholder={
          t("member.mainIndustryKsicCodes", "주력산업 KSIC 세부 코드")
        }
        containerClassName="mb-0"
        className="w-48 h-9"
        onChange={(e) => {
          const val = e.target.value;
          onChange("gangwonIndustrySubCodes", val ? [val] : []);
        }}
      />
    </div>
  );
};
