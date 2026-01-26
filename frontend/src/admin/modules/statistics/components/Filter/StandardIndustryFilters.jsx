/*
 * StandardIndustryFilters - 标准产业分类 (KSIC) 筛选组件
 */
import { Select } from "@shared/components";
import { useTranslation } from "react-i18next";
import {
  KSIC_MAJOR_CATEGORY_KEYS,
  KSIC_SUB_CATEGORY_KEYS,
  translateOptions,
} from "@shared/data/industryClassification";

export const StandardIndustryFilters = ({
  codes = [],
  subCodes = [],
  onChange,
}) => {
  const { t } = useTranslation();

  const majorValue = codes && codes.length > 0 ? codes[0] : "";
  const subValue = subCodes && subCodes.length > 0 ? subCodes[0] : "";

  // 转换大类选项
  const majorOptions = translateOptions(KSIC_MAJOR_CATEGORY_KEYS, t);

  // 根据选择的大类获取中类选项
  const subCategories = majorValue
    ? KSIC_SUB_CATEGORY_KEYS[majorValue] || []
    : [];
  const subOptions = translateOptions(subCategories, t);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={majorValue}
        options={majorOptions}
        placeholder={t("statistics.filters.industry.major")}
        containerClassName="mb-0"
        className="w-48 h-9"
        onChange={(e) => {
          const val = e.target.value;
          // 切换大类时，同时重置中类
          onChange("majorIndustryCodes", val ? [val] : []);
          onChange("subIndustryCodes", []);
        }}
      />
      <Select
        value={subValue}
        options={subOptions}
        disabled={!majorValue}
        placeholder={t("statistics.filters.industry.medium")}
        containerClassName="mb-0"
        className="w-48 h-9"
        onChange={(e) => {
          const val = e.target.value;
          onChange("subIndustryCodes", val ? [val] : []);
        }}
      />
    </div>
  );
};
