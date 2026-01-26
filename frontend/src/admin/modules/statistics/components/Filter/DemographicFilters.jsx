/*
 * DemographicFilters - 代表者人口属性 (性别/年龄) 筛选组件
 */
import { Select, Input } from "@shared/components";
import { useTranslation } from "react-i18next";
import { GENDER_OPTIONS } from "../../enum";

export const DemographicFilters = ({ gender, minAge, maxAge, onChange }) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={gender || ""}
        options={GENDER_OPTIONS.map((g) => ({
          value: g.value,
          label: t(g.labelKey),
        }))}
        placeholder={t("statistics.filters.representative.gender")}
        containerClassName="mb-0"
        className="w-28 h-9"
        onChange={(e) => onChange("gender", e.target.value || null)}
      />
      <div className="flex items-center gap-2">
        <Input
          type="number"
          placeholder="Min Age"
          value={minAge || ""}
          containerClassName="mb-0"
          className="w-24 h-9"
          onChange={(e) =>
            onChange("minAge", e.target.value ? parseInt(e.target.value) : null)
          }
        />
        <span className="text-gray-300">~</span>
        <Input
          type="number"
          placeholder="Max Age"
          value={maxAge || ""}
          containerClassName="mb-0"
          className="w-24 h-9"
          onChange={(e) =>
            onChange("maxAge", e.target.value ? parseInt(e.target.value) : null)
          }
        />
      </div>
    </div>
  );
};
