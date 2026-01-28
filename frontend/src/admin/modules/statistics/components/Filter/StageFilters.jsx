/*
 * StageFilters - 创业阶段筛选组件
 */
import { Select } from "@shared/components";
import { useTranslation } from "react-i18next";
import { STARTUP_STAGE_OPTIONS } from "../../enum";

export const StageFilters = ({ stages, onChange }) => {
  const { t } = useTranslation();

  const selectedValue = stages && stages.length > 0 ? stages[0] : "";

  const options = STARTUP_STAGE_OPTIONS.map((o) => ({
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
        onChange("startupStages", val ? [val] : []);
      }}
    />
  );
};
