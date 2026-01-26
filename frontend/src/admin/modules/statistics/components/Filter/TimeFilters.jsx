/*
 * TimeFilters - 时间维度筛选组件 (年度/季度/月份)
 */
import { Select } from "@shared/components";
import { useTranslation } from "react-i18next";
import { QUARTER_OPTIONS, MONTH_OPTIONS } from "../../enum";

export const TimeFilters = ({ year, quarter, month, onChange }) => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 15 }, (_, i) => ({
    value: currentYear - i,
    label:
      String(currentYear - i) + (t("statistics.filters.time.yearUnit") || "年"),
  }));

  const quarterOptions = QUARTER_OPTIONS.map((o) => ({
    value: o.value,
    label: o.label,
  }));

  const monthOptions = MONTH_OPTIONS.map((o) => ({
    value: o.value,
    label: o.label + (t("statistics.filters.time.monthUnit") || "月"),
  }));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={year || ""}
        options={years}
        placeholder={t("statistics.filters.time.year")}
        containerClassName="mb-0"
        className="w-28 h-9"
        onChange={(e) =>
          onChange("year", e.target.value ? parseInt(e.target.value) : null)
        }
      />
      <Select
        value={quarter || ""}
        options={quarterOptions}
        placeholder={t("statistics.filters.time.quarter")}
        containerClassName="mb-0"
        className="w-28 h-9"
        onChange={(e) =>
          onChange("quarter", e.target.value ? parseInt(e.target.value) : null)
        }
      />
      <Select
        value={month || ""}
        options={monthOptions}
        placeholder={t("statistics.filters.time.month")}
        containerClassName="mb-0"
        className="w-28 h-9"
        onChange={(e) =>
          onChange("month", e.target.value ? parseInt(e.target.value) : null)
        }
      />
    </div>
  );
};
