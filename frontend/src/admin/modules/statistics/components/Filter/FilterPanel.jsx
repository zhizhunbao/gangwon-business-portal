/*
 * FilterPanel - 统计报告大筛选面板
 */
import { useTranslation } from "react-i18next";
import { Card, Input, FormRow, Select } from "@shared/components";
import { GENDER_OPTIONS } from "../../enum";
import { TimeFilters } from "./TimeFilters";
import { StandardIndustryFilters } from "./StandardIndustryFilters";
import { IndustryFilters } from "./IndustryFilters";
import { StartupTypeFilters } from "./StartupTypeFilters";
import { BusinessFieldFilters } from "./BusinessFieldFilters";
import { WorkYearsFilters } from "./WorkYearsFilters";
import { ProgramFilters } from "./ProgramFilters";
import { CooperationFilters } from "./CooperationFilters";
import { StageFilters } from "./StageFilters";
import { LocationFilters } from "./LocationFilters";
import { InvestmentFilters } from "./InvestmentFilters";
import { PatentFilters } from "./PatentFilters";
import { QuantitiveFilters } from "./QuantitiveFilters";

export const FilterPanel = ({ filters, onFilterChange }) => {
  const { t } = useTranslation();

  const labelWidth = "w-32";

  // 渲染栏目标题 - 极致紧凑的文字分组，去掉胶囊色块
  const GroupTitle = ({ titleKey }) => (
    <div className="col-span-1 lg:col-span-2 pt-4 first:pt-0 mb-2 border-t border-gray-100 first:border-0">
      <h3 className="text-[12px] font-bold text-gray-800 uppercase tracking-tight">
        {t(titleKey)}
      </h3>
    </div>
  );

  return (
    <Card className="p-6 sm:p-8 bg-white border-gray-200 shadow-sm rounded-2xl ring-1 ring-gray-200/50">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-16 gap-y-3.5">
        {/* 1. 기본 및 행정 정보 */}
        <GroupTitle titleKey="statistics.groups.general" />

        <FormRow
          label={t("statistics.filters.keyword.title")}
          labelWidthClassName={labelWidth}
        >
          <Input
            placeholder={t("statistics.filters.keyword.placeholder")}
            value={filters.searchQuery || ""}
            onChange={(e) => onFilterChange("searchQuery", e.target.value)}
            className="w-full sm:w-80 h-9 bg-white border-gray-300"
            containerClassName="mb-0"
          />
        </FormRow>

        <FormRow
          label={t("statistics.filters.time.title")}
          labelWidthClassName={labelWidth}
        >
          <TimeFilters
            year={filters.year}
            quarter={filters.quarter}
            month={filters.month}
            onChange={onFilterChange}
          />
        </FormRow>

        <FormRow
          label={t("statistics.filters.location.title")}
          labelWidthClassName={labelWidth}
        >
          <LocationFilters
            location={filters.location}
            onChange={onFilterChange}
          />
        </FormRow>

        {/* 2. 산업 및 기술 분류 */}
        <GroupTitle titleKey="statistics.groups.industry" />

        <FormRow
          label={t("statistics.filters.industry.major")}
          labelWidthClassName={labelWidth}
        >
          <StandardIndustryFilters
            codes={filters.majorIndustryCodes}
            subCodes={filters.subIndustryCodes}
            onChange={onFilterChange}
          />
        </FormRow>

        <FormRow
          label={t("statistics.filters.industry.gangwon")}
          labelWidthClassName={labelWidth}
        >
          <IndustryFilters
            codes={filters.gangwonIndustryCodes}
            subCodes={filters.gangwonIndustrySubCodes}
            onChange={onFilterChange}
          />
        </FormRow>

        <FormRow
          label={t("statistics.filters.industry_extra.businessField")}
          labelWidthClassName={labelWidth}
        >
          <BusinessFieldFilters
            values={filters.businessFields}
            onChange={onFilterChange}
          />
        </FormRow>

        <FormRow
          label={t("statistics.filters.patent.title")}
          labelWidthClassName={labelWidth}
        >
          <PatentFilters
            minPatents={filters.minPatents}
            maxPatents={filters.maxPatents}
            onChange={onFilterChange}
          />
        </FormRow>

        {/* 3. 기업 성격 및 단계 */}
        <GroupTitle titleKey="statistics.groups.identity" />

        <FormRow
          label={t("statistics.filters.stage.title")}
          labelWidthClassName={labelWidth}
        >
          <StageFilters
            stages={filters.startupStages}
            onChange={onFilterChange}
          />
        </FormRow>

        <FormRow
          label={t("statistics.filters.workYears.title")}
          labelWidthClassName={labelWidth}
        >
          <WorkYearsFilters
            minWorkYears={filters.minWorkYears}
            maxWorkYears={filters.maxWorkYears}
            onChange={onFilterChange}
          />
        </FormRow>

        <FormRow
          label={t("statistics.filters.industry_extra.startupType")}
          labelWidthClassName={labelWidth}
        >
          <StartupTypeFilters
            values={filters.startupTypes}
            onChange={onFilterChange}
          />
        </FormRow>

        {/* 4. 경영 성과 지표 */}
        <GroupTitle titleKey="statistics.groups.performance" />

        <FormRow
          label={t("statistics.filters.investment.title")}
          labelWidthClassName={labelWidth}
        >
          <InvestmentFilters
            hasInvestment={filters.hasInvestment}
            minInvestment={filters.minInvestment}
            maxInvestment={filters.maxInvestment}
            onChange={onFilterChange}
          />
        </FormRow>

        <div className="col-span-1 lg:col-span-2">
          <FormRow
            label={t("statistics.filters.quantitive.title")}
            labelWidthClassName={labelWidth}
          >
            <QuantitiveFilters
              minRevenue={filters.minRevenue}
              maxRevenue={filters.maxRevenue}
              minEmployees={filters.minEmployees}
              maxEmployees={filters.maxEmployees}
              onChange={onFilterChange}
            />
          </FormRow>
        </div>

        {/* 5. 대표자 및 외부 참여 */}
        <GroupTitle titleKey="statistics.groups.network" />

        <FormRow
          label={t("statistics.filters.representative.gender")}
          labelWidthClassName={labelWidth}
        >
          <Select
            value={filters.gender || ""}
            options={GENDER_OPTIONS.map((opt) => ({
              value: opt.value,
              label: t(opt.labelKey),
            }))}
            placeholder={t("statistics.filters.all", "전체")}
            className="w-44 h-9"
            containerClassName="mb-0"
            onChange={(e) => onFilterChange("gender", e.target.value || null)}
          />
        </FormRow>

        <FormRow
          label={t("statistics.filters.representative.ageRange")}
          labelWidthClassName={labelWidth}
        >
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="Min"
              value={filters.minAge || ""}
              containerClassName="mb-0"
              className="w-24 h-9"
              onChange={(e) =>
                onFilterChange(
                  "minAge",
                  e.target.value ? parseInt(e.target.value) : null,
                )
              }
            />
            <span className="text-gray-300">~</span>
            <Input
              type="number"
              placeholder="Max"
              value={filters.maxAge || ""}
              containerClassName="mb-0"
              className="w-24 h-9"
              onChange={(e) =>
                onFilterChange(
                  "maxAge",
                  e.target.value ? parseInt(e.target.value) : null,
                )
              }
            />
          </div>
        </FormRow>

        <FormRow
          label={t("statistics.filters.programs.title")}
          labelWidthClassName={labelWidth}
        >
          <ProgramFilters tags={filters.policyTags} onChange={onFilterChange} />
        </FormRow>

        <FormRow
          label={t("statistics.filters.cooperation.title")}
          labelWidthClassName={labelWidth}
        >
          <CooperationFilters
            values={filters.cooperationFields}
            onChange={onFilterChange}
          />
        </FormRow>
      </div>
    </Card>
  );
};
