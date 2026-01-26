/*
 * CooperationFilters - 产业合作意向筛选组件
 */
import { Checkbox } from "@shared/components";
import { useTranslation } from "react-i18next";

export const COOPERATION_OPTIONS = [
  { value: "tech", labelKey: "member.cooperationFields_items.tech" },
  { value: "market", labelKey: "member.cooperationFields_items.market" },
  { value: "talent", labelKey: "member.cooperationFields_items.talent" },
];

export const CooperationFilters = ({ values = [], onChange }) => {
  const { t } = useTranslation();

  const handleToggle = (val, checked) => {
    const newValues = checked
      ? [...values, val]
      : values.filter((v) => v !== val);
    onChange("cooperationFields", newValues);
  };

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
      {COOPERATION_OPTIONS.map((opt) => (
        <Checkbox
          key={opt.value}
          label={t(`statistics.filters.cooperation.${opt.value}`)}
          checked={values.includes(opt.value)}
          onChange={(checked) => handleToggle(opt.value, checked)}
          className="py-1.5"
        />
      ))}
    </div>
  );
};
