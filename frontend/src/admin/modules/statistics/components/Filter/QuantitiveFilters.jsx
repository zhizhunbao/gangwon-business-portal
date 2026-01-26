/*
 * QuantitiveFilters - 量化指标筛选组件 (年销售额 / 员工人数)
 * 支持范围筛选 (Min ~ Max) 以实现“大于、小于、区间”逻辑
 */
import { Input } from "@shared/components";
import { useTranslation } from "react-i18next";

export const QuantitiveFilters = ({
  minRevenue,
  maxRevenue,
  minEmployees,
  maxEmployees,
  onChange,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-x-10 gap-y-4">
      {/* 销售额区间 */}
      <div className="flex items-center gap-2">
        <span className="text-[13px] text-gray-500 font-medium min-w-[60px]">
          {t("statistics.filters.quantitive.revenue") || t("member.sales")}
        </span>
        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            placeholder="Min"
            value={minRevenue || ""}
            containerClassName="mb-0"
            className="w-24 h-9"
            onChange={(e) =>
              onChange(
                "minRevenue",
                e.target.value ? parseInt(e.target.value) : null,
              )
            }
          />
          <span className="text-gray-400">~</span>
          <Input
            type="number"
            placeholder="Max"
            value={maxRevenue || ""}
            containerClassName="mb-0"
            className="w-24 h-9"
            onChange={(e) =>
              onChange(
                "maxRevenue",
                e.target.value ? parseInt(e.target.value) : null,
              )
            }
          />
          <span className="text-xs text-gray-400 ml-1">
            {t("statistics.filters.investment.amountUnit") || "만원"}
          </span>
        </div>
      </div>

      {/* 员工数区间 */}
      <div className="flex items-center gap-2">
        <span className="text-[13px] text-gray-500 font-medium min-w-[60px]">
          {t("statistics.filters.quantitive.employees") ||
            t("member.employeeCount")}
        </span>
        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            placeholder="Min"
            value={minEmployees || ""}
            containerClassName="mb-0"
            className="w-20 h-9"
            onChange={(e) =>
              onChange(
                "minEmployees",
                e.target.value ? parseInt(e.target.value) : null,
              )
            }
          />
          <span className="text-gray-400">~</span>
          <Input
            type="number"
            placeholder="Max"
            value={maxEmployees || ""}
            containerClassName="mb-0"
            className="w-20 h-9"
            onChange={(e) =>
              onChange(
                "maxEmployees",
                e.target.value ? parseInt(e.target.value) : null,
              )
            }
          />
          <span className="text-xs text-gray-400 ml-1">
            {t("common.personUnit") || "명"}
          </span>
        </div>
      </div>
    </div>
  );
};
