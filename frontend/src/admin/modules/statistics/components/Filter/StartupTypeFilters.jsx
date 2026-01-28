/*
 * StartupTypeFilters - 创业类型筛选组件
 */
import { Select } from "@shared/components";
import { useTranslation } from "react-i18next";
import { STARTUP_TYPE_OPTIONS } from "../../enum";

export const StartupTypeFilters = ({ values = [], onChange }) => {
  const { t } = useTranslation();

  const selectedValue = values && values.length > 0 ? values[0] : "";

  const options = STARTUP_TYPE_OPTIONS.map((o) => ({
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
        const val = e.target.value;
        onChange("startupTypes", val ? [val] : []);
      }}
    />
  );
};
