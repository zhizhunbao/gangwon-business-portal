/*
 * StatisticsTable - 统计结果数据表格
 */

import { useTranslation } from "react-i18next";
import { Table, Pagination, Badge } from "@shared/components";
import { TABLE_COLUMN_CONFIGS, SORT_ORDER } from "../../enum";
import { formatCurrency } from "@shared/utils";

/**
 * 政策标签 -> i18n key 映射
 * 数据库可能存储多种格式，需要统一映射
 */
const POLICY_TAG_I18N_MAP = {
  // 大写格式 (后端 enum)
  STARTUP_UNIVERSITY: "statistics.filters.participation.startup_university",
  GLOBAL_GLOCAL: "statistics.filters.participation.global_glocal",
  RISE: "statistics.filters.participation.rise",
  // 驼峰格式 (旧数据)
  startupCenterUniversity: "statistics.filters.participation.startup_university",
  globalBusiness: "statistics.filters.participation.global_glocal",
  riseBusiness: "statistics.filters.participation.rise",
  // 小写格式
  startup_university: "statistics.filters.participation.startup_university",
  global_glocal: "statistics.filters.participation.global_glocal",
  rise: "statistics.filters.participation.rise",
};

/**
 * 创业阶段 -> i18n key 映射
 */
const STARTUP_STAGE_I18N_MAP = {
  pre_startup: "statistics.filters.stage.preStartup",
  initial: "statistics.filters.stage.initial",
  growth: "statistics.filters.stage.growth",
  leap: "statistics.filters.stage.leap",
  re_startup: "statistics.filters.stage.reStartup",
  // 其他可能的数据库值
  village_enterprise: "industryClassification.startupType.village_enterprise",
  youth_enterprise: "industryClassification.startupType.youth_enterprise",
  student_startup: "industryClassification.startupType.student_startup",
  faculty_startup: "industryClassification.startupType.faculty_startup",
  women_enterprise: "industryClassification.startupType.women_enterprise",
  venture_company: "industryClassification.startupType.venture_company",
  social_enterprise: "industryClassification.startupType.social_enterprise",
};

export const StatisticsTable = ({
  data = [],
  loading = false,
  error = null,
  sortBy = "enterpriseName",
  sortOrder = "asc",
  onSort,
  page = 1,
  pageSize = 20,
  total = 0,
  totalPages = 0,
  onPageChange,
  onPageSizeChange,
}) => {
  const { t } = useTranslation();

  const handleSortClick = (field) => {
    if (sortBy === field) {
      onSort(
        field,
        sortOrder === SORT_ORDER.ASC ? SORT_ORDER.DESC : SORT_ORDER.ASC,
      );
    } else {
      onSort(field, SORT_ORDER.ASC);
    }
  };

  const columns = TABLE_COLUMN_CONFIGS.map((col) => {
    const isSorted = sortBy === col.key;
    const sortIcon = isSorted
      ? sortOrder === SORT_ORDER.ASC
        ? "↑"
        : "↓"
      : "↕";

    return {
      key: col.key,
      label: (
        <div
          className="flex items-center cursor-pointer group hover:text-primary-600 transition-colors py-1"
          onClick={() => handleSortClick(col.key)}
        >
          {t(col.labelKey)}
          <span
            className={`ml-1 text-[10px] ${isSorted ? "text-primary-600 font-bold" : "text-gray-300 opacity-0 group-hover:opacity-100"}`}
          >
            {sortIcon}
          </span>
        </div>
      ),
      align: col.align || "left",
      width: col.width,
      render: (value, row) => {
        if (col.key === "businessRegNo") {
          return (
            <span className="font-mono text-xs text-gray-500">{value}</span>
          );
        }
        if (col.key === "enterpriseName") {
          return (
            <span className="font-medium text-gray-900 text-sm">{value}</span>
          );
        }
        if (col.key === "industryType") {
          if (!value) return "-";
          // 尝试翻译 KSIC 大分类或创业类型
          const ksicKey = `industryClassification.ksicMajor.${value}`;
          const startupTypeKey = `industryClassification.startupType.${value}`;
          const translated = t(ksicKey);
          // 如果翻译后还是 key 本身，尝试 startupType
          if (translated === ksicKey) {
            const startupTranslated = t(startupTypeKey);
            return (
              <span className="text-sm text-gray-600">
                {startupTranslated === startupTypeKey ? value : startupTranslated}
              </span>
            );
          }
          return <span className="text-sm text-gray-600">{translated}</span>;
        }
        if (col.key === "startupStage") {
          if (!value) return "-";
          const i18nKey = STARTUP_STAGE_I18N_MAP[value];
          const displayText = i18nKey ? t(i18nKey) : value;
          return (
            <Badge
              variant="secondary"
              className="px-2 py-0.5 font-normal text-[11px]"
            >
              {displayText}
            </Badge>
          );
        }
        if (col.key === "policyTags") {
          if (!value || value.length === 0) return "-";
          return (
            <div className="flex flex-wrap gap-1">
              {value.map((tag) => {
                const i18nKey = POLICY_TAG_I18N_MAP[tag];
                const displayText = i18nKey ? t(i18nKey) : tag;
                return (
                  <Badge
                    key={tag}
                    variant="success"
                    className="px-1.5 py-0 text-[10px] font-normal"
                  >
                    {displayText}
                  </Badge>
                );
              })}
            </div>
          );
        }
        if (
          ["totalInvestment", "annualRevenue", "exportAmount"].includes(col.key)
        ) {
          const formatted = formatCurrency(value);
          return (
            <span
              className={`text-sm ${
                col.key === "totalInvestment"
                  ? "text-blue-700 font-medium"
                  : "text-gray-700"
              }`}
            >
              {formatted}
            </span>
          );
        }
        return <span className="text-sm text-gray-600">{value || "-"}</span>;
      },
    };
  });

  if (error) {
    return (
      <div className="py-20 text-center text-gray-400">
        <p>{t("statistics.messages.queryError")}</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Table columns={columns} data={data} loading={loading} />

      {!loading && data.length === 0 && (
        <div className="py-20 text-center text-gray-400 bg-white">
          <p className="text-sm">{t("statistics.table.noData")}</p>
        </div>
      )}

      {!loading && data.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4 bg-gray-50/30">
          <div className="flex items-center text-xs text-gray-500">
            {t("common.showing", {
              start: (page - 1) * pageSize + 1,
              end: Math.min(page * pageSize, total),
              total: total,
            }) ||
              `显示 ${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, total)} 共 ${total} 条`}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <label>{t("statistics.pagination.itemsPerPage")}</label>
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(parseInt(e.target.value))}
                className="bg-transparent border-none text-xs focus:ring-0 cursor-pointer text-gray-600 font-medium"
              >
                {[10, 20, 50, 100].map((v) => (
                  <option key={v} value={v}>
                    {v} {t("statistics.pagination.items")}
                  </option>
                ))}
              </select>
            </div>

            <Pagination
              current={page}
              total={total}
              pageSize={pageSize}
              onChange={onPageChange}
            />
          </div>
        </div>
      )}
    </div>
  );
};
