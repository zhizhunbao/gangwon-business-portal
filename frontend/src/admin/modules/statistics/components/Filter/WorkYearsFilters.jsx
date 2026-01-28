/*
 * WorkYearsFilters - 企业工龄筛选组件
 */
import { Select } from "@shared/components";
import { useTranslation } from "react-i18next";
import { WORK_YEARS_OPTIONS } from "../../enum";

export const WorkYearsFilters = ({ minWorkYears, maxWorkYears, onChange }) => {
  const { t } = useTranslation();

  // 简单映射到预设范围
  const selectedValue =
    WORK_YEARS_OPTIONS.find(
      (opt) => opt.min === minWorkYears && opt.max === maxWorkYears,
    )?.value || "";

  const options = WORK_YEARS_OPTIONS.map((o) => ({
    value: o.value,
    label: t(o.labelKey),
  }));

  return (
    <Select
      value={selectedValue}
      options={options}
      placeholder={t('common.all', '전체')}
      containerClassName="mb-0"
      className="w-full sm:w-80 h-9"
      onChange={(e) => {
        const opt = WORK_YEARS_OPTIONS.find((o) => o.value === e.target.value);
        if (opt) {
          onChange("minWorkYears", opt.min);
          onChange("maxWorkYears", opt.max);
        } else {
          onChange("minWorkYears", null);
          onChange("maxWorkYears", null);
        }
      }}
    />
  );
};
