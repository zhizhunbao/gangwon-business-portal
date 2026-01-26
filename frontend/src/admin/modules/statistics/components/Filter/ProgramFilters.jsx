/*
 * ProgramFilters - 政策关联项目筛选组件 (支持多选)
 */
import { Checkbox } from "@shared/components";
import { useTranslation } from "react-i18next";
import { POLICY_TAGS_OPTIONS } from "../../enum";

export const ProgramFilters = ({ tags = [], onChange }) => {
  const { t } = useTranslation();

  const handleToggle = (val, checked) => {
    const newTags = checked ? [...tags, val] : tags.filter((t) => t !== val);
    onChange("policyTags", newTags);
  };

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
      {POLICY_TAGS_OPTIONS.map((opt) => (
        <Checkbox
          key={opt.value}
          label={t(
            `statistics.filters.participation.${opt.value.toLowerCase()}`,
          )}
          checked={tags.includes(opt.value)}
          onChange={(checked) => handleToggle(opt.value, checked)}
          className="py-1.5"
        />
      ))}
    </div>
  );
};
