import { Select } from "@shared/components";
import { useTranslation } from "react-i18next";
import { PATENT_RANGES_OPTIONS } from "../../enum";

export const InvestmentPatentFilters = ({
  hasInvestment,
  minPatents,
  maxPatents,
  onChange,
}) => {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Select
        value={hasInvestment === null ? "" : hasInvestment ? "yes" : "no"}
        options={[
          { value: "yes", label: t("statistics.filters.investment.yes") },
          { value: "no", label: t("statistics.filters.investment.no") },
        ]}
        placeholder={t("statistics.filters.investment.status")}
        containerClassName="mb-0"
        className="h-9"
        onChange={(e) => {
          const val = e.target.value;
          onChange("hasInvestment", val === "" ? null : val === "yes");
        }}
      />
      <Select
        placeholder={t("statistics.filters.patent.countRange")}
        options={PATENT_RANGES_OPTIONS.map((r) => ({
          value: r.value,
          label: t(r.labelKey),
        }))}
        containerClassName="mb-0"
        className="h-9"
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
    </div>
  );
};
