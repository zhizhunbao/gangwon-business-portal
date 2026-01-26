/*
 * PatentFilters - 专利持有数量筛选组件
 */
import { Select } from "@shared/components";
import { useTranslation } from "react-i18next";
import { PATENT_RANGES_OPTIONS } from "../../enum";

export const PatentFilters = ({ minPatents, maxPatents, onChange }) => {
  const { t } = useTranslation();

  const selectedValue =
    PATENT_RANGES_OPTIONS.find(
      (r) => r.min === minPatents && r.max === maxPatents,
    )?.value || "";

  return (
    <Select
      value={selectedValue}
      placeholder={t("statistics.filters.patent.countRange")}
      options={PATENT_RANGES_OPTIONS.map((r) => ({
        value: r.value,
        label: t(r.labelKey),
      }))}
      containerClassName="mb-0"
      className="w-full sm:w-80 h-9"
      onChange={(e) => {
        const range = PATENT_RANGES_OPTIONS.find(
          (r) => r.value === e.target.value,
        );
        if (range) {
          onChange("minPatents", range.min);
          onChange("maxPatents", range.max);
        } else {
          onChange("minPatents", null);
          onChange("maxPatents", null);
        }
      }}
    />
  );
};
