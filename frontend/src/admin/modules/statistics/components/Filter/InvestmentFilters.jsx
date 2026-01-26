/*
 * InvestmentFilters - 投资引进情况筛选组件
 */
import { Select } from "@shared/components";
import { useTranslation } from "react-i18next";
import { INVESTMENT_RANGES_OPTIONS } from "../../enum";

export const InvestmentFilters = ({
  hasInvestment,
  minInvestment,
  maxInvestment,
  onChange,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={hasInvestment === null ? "" : hasInvestment ? "yes" : "no"}
        options={[
          { value: "yes", label: t("statistics.filters.investment.yes") },
          { value: "no", label: t("statistics.filters.investment.no") },
        ]}
        placeholder={t("statistics.filters.investment.status")}
        containerClassName="mb-0"
        className="w-32 h-9"
        onChange={(e) => {
          const val = e.target.value;
          onChange("hasInvestment", val === "" ? null : val === "yes");
        }}
      />
      <Select
        placeholder={t("statistics.filters.investment.amountRange")}
        options={INVESTMENT_RANGES_OPTIONS.map((r) => ({
          value: r.value,
          label: t(r.labelKey),
        }))}
        containerClassName="mb-0"
        className="w-48 h-9"
        onChange={(e) => {
          const range = INVESTMENT_RANGES_OPTIONS.find(
            (r) => r.value === e.target.value,
          );
          if (range) {
            onChange("minInvestment", range.min);
            onChange("maxInvestment", range.max);
          } else {
            onChange("minInvestment", null);
            onChange("maxInvestment", null);
          }
        }}
      />
    </div>
  );
};
