/**
 * Industry Classification Enums
 *
 * 韩国标准产业分类 (KSIC) 第10次修订版相关枚举。
 * 遵循 dev-frontend_patterns skill 规范。
 */

// 创业类型选项 (업종 -> 창업유형)
export const STARTUP_TYPE_KEYS = [
  {
    value: "student_startup",
    labelKey: "industryClassification.startupType.student_startup",
  },
  {
    value: "faculty_startup",
    labelKey: "industryClassification.startupType.faculty_startup",
  },
  {
    value: "women_enterprise",
    labelKey: "industryClassification.startupType.women_enterprise",
  },
  {
    value: "research_institute",
    labelKey: "industryClassification.startupType.research_institute",
  },
  {
    value: "venture_company",
    labelKey: "industryClassification.startupType.venture_company",
  },
  {
    value: "non_venture",
    labelKey: "industryClassification.startupType.non_venture",
  },
  {
    value: "preliminary_social_enterprise",
    labelKey:
      "industryClassification.startupType.preliminary_social_enterprise",
  },
  {
    value: "social_enterprise",
    labelKey: "industryClassification.startupType.social_enterprise",
  },
  {
    value: "youth_enterprise",
    labelKey: "industryClassification.startupType.youth_enterprise",
  },
  {
    value: "cooperative",
    labelKey: "industryClassification.startupType.cooperative",
  },
  {
    value: "village_enterprise",
    labelKey: "industryClassification.startupType.village_enterprise",
  },
  { value: "other", labelKey: "industryClassification.startupType.other" },
];

// 旧的创业阶段选项 (保留用于其他用途)
export const STARTUP_STAGE_KEYS = [
  {
    value: "preliminary",
    labelKey: "industryClassification.startupStage.preliminary",
  },
  {
    value: "startup_under_3years",
    labelKey: "industryClassification.startupStage.startup_under_3years",
  },
  {
    value: "growth_over_7years",
    labelKey: "industryClassification.startupStage.growth_over_7years",
  },
  { value: "restart", labelKey: "industryClassification.startupStage.restart" },
];

// 사업분야 (Business Field) - Manufacturing focused options
export const BUSINESS_FIELD_KEYS = [
  { value: "13", labelKey: "industryClassification.businessField.13" },
  { value: "20", labelKey: "industryClassification.businessField.20" },
  { value: "21", labelKey: "industryClassification.businessField.21" },
  { value: "22", labelKey: "industryClassification.businessField.22" },
  { value: "23", labelKey: "industryClassification.businessField.23" },
  { value: "24", labelKey: "industryClassification.businessField.24" },
  { value: "25", labelKey: "industryClassification.businessField.25" },
  { value: "26", labelKey: "industryClassification.businessField.26" },
  { value: "27", labelKey: "industryClassification.businessField.27" },
  { value: "28", labelKey: "industryClassification.businessField.28" },
  { value: "29", labelKey: "industryClassification.businessField.29" },
  { value: "30", labelKey: "industryClassification.businessField.30" },
  { value: "31", labelKey: "industryClassification.businessField.31" },
];

// 产业大分类 (A-U)
export const KSIC_MAJOR_CATEGORY_KEYS = [
  { value: "A", labelKey: "industryClassification.ksicMajor.A" },
  { value: "B", labelKey: "industryClassification.ksicMajor.B" },
  { value: "C", labelKey: "industryClassification.ksicMajor.C" },
  { value: "D", labelKey: "industryClassification.ksicMajor.D" },
  { value: "E", labelKey: "industryClassification.ksicMajor.E" },
  { value: "F", labelKey: "industryClassification.ksicMajor.F" },
  { value: "G", labelKey: "industryClassification.ksicMajor.G" },
  { value: "H", labelKey: "industryClassification.ksicMajor.H" },
  { value: "I", labelKey: "industryClassification.ksicMajor.I" },
  { value: "J", labelKey: "industryClassification.ksicMajor.J" },
  { value: "K", labelKey: "industryClassification.ksicMajor.K" },
  { value: "L", labelKey: "industryClassification.ksicMajor.L" },
  { value: "M", labelKey: "industryClassification.ksicMajor.M" },
  { value: "N", labelKey: "industryClassification.ksicMajor.N" },
  { value: "O", labelKey: "industryClassification.ksicMajor.O" },
  { value: "P", labelKey: "industryClassification.ksicMajor.P" },
  { value: "Q", labelKey: "industryClassification.ksicMajor.Q" },
  { value: "R", labelKey: "industryClassification.ksicMajor.R" },
  { value: "S", labelKey: "industryClassification.ksicMajor.S" },
  { value: "T", labelKey: "industryClassification.ksicMajor.T" },
  { value: "U", labelKey: "industryClassification.ksicMajor.U" },
];

// 产业中分类 (按大分类分组)
export const KSIC_SUB_CATEGORY_KEYS = {
  A: [
    { value: "01", labelKey: "industryClassification.ksicSub.01" },
    { value: "02", labelKey: "industryClassification.ksicSub.02" },
    { value: "03", labelKey: "industryClassification.ksicSub.03" },
  ],
  B: [
    { value: "05", labelKey: "industryClassification.ksicSub.05" },
    { value: "06", labelKey: "industryClassification.ksicSub.06" },
    { value: "07", labelKey: "industryClassification.ksicSub.07" },
    { value: "08", labelKey: "industryClassification.ksicSub.08" },
  ],
  C: [
    { value: "10", labelKey: "industryClassification.ksicSub.10" },
    { value: "11", labelKey: "industryClassification.ksicSub.11" },
    { value: "12", labelKey: "industryClassification.ksicSub.12" },
    { value: "13", labelKey: "industryClassification.ksicSub.13" },
    { value: "14", labelKey: "industryClassification.ksicSub.14" },
    { value: "15", labelKey: "industryClassification.ksicSub.15" },
    { value: "16", labelKey: "industryClassification.ksicSub.16" },
    { value: "17", labelKey: "industryClassification.ksicSub.17" },
    { value: "18", labelKey: "industryClassification.ksicSub.18" },
    { value: "19", labelKey: "industryClassification.ksicSub.19" },
    { value: "20", labelKey: "industryClassification.ksicSub.20" },
    { value: "21", labelKey: "industryClassification.ksicSub.21" },
    { value: "22", labelKey: "industryClassification.ksicSub.22" },
    { value: "23", labelKey: "industryClassification.ksicSub.23" },
    { value: "24", labelKey: "industryClassification.ksicSub.24" },
    { value: "25", labelKey: "industryClassification.ksicSub.25" },
    { value: "26", labelKey: "industryClassification.ksicSub.26" },
    { value: "27", labelKey: "industryClassification.ksicSub.27" },
    { value: "28", labelKey: "industryClassification.ksicSub.28" },
    { value: "29", labelKey: "industryClassification.ksicSub.29" },
    { value: "30", labelKey: "industryClassification.ksicSub.30" },
    { value: "31", labelKey: "industryClassification.ksicSub.31" },
    { value: "32", labelKey: "industryClassification.ksicSub.32" },
    { value: "33", labelKey: "industryClassification.ksicSub.33" },
    { value: "34", labelKey: "industryClassification.ksicSub.34" },
  ],
  D: [{ value: "35", labelKey: "industryClassification.ksicSub.35" }],
  E: [
    { value: "36", labelKey: "industryClassification.ksicSub.36" },
    { value: "37", labelKey: "industryClassification.ksicSub.37" },
    { value: "38", labelKey: "industryClassification.ksicSub.38" },
    { value: "39", labelKey: "industryClassification.ksicSub.39" },
  ],
  F: [
    { value: "41", labelKey: "industryClassification.ksicSub.41" },
    { value: "42", labelKey: "industryClassification.ksicSub.42" },
  ],
  G: [
    { value: "45", labelKey: "industryClassification.ksicSub.45" },
    { value: "46", labelKey: "industryClassification.ksicSub.46" },
    { value: "47", labelKey: "industryClassification.ksicSub.47" },
  ],
  H: [
    { value: "49", labelKey: "industryClassification.ksicSub.49" },
    { value: "50", labelKey: "industryClassification.ksicSub.50" },
    { value: "51", labelKey: "industryClassification.ksicSub.51" },
    { value: "52", labelKey: "industryClassification.ksicSub.52" },
  ],
  I: [
    { value: "55", labelKey: "industryClassification.ksicSub.55" },
    { value: "56", labelKey: "industryClassification.ksicSub.56" },
  ],
  J: [
    { value: "58", labelKey: "industryClassification.ksicSub.58" },
    { value: "59", labelKey: "industryClassification.ksicSub.59" },
    { value: "60", labelKey: "industryClassification.ksicSub.60" },
    { value: "61", labelKey: "industryClassification.ksicSub.61" },
    { value: "62", labelKey: "industryClassification.ksicSub.62" },
    { value: "63", labelKey: "industryClassification.ksicSub.63" },
  ],
  K: [
    { value: "64", labelKey: "industryClassification.ksicSub.64" },
    { value: "65", labelKey: "industryClassification.ksicSub.65" },
    { value: "66", labelKey: "industryClassification.ksicSub.66" },
  ],
  L: [{ value: "68", labelKey: "industryClassification.ksicSub.68" }],
  M: [
    { value: "70", labelKey: "industryClassification.ksicSub.70" },
    { value: "71", labelKey: "industryClassification.ksicSub.71" },
    { value: "72", labelKey: "industryClassification.ksicSub.72" },
    { value: "73", labelKey: "industryClassification.ksicSub.73" },
  ],
  N: [
    { value: "74", labelKey: "industryClassification.ksicSub.74" },
    { value: "75", labelKey: "industryClassification.ksicSub.75" },
    { value: "76", labelKey: "industryClassification.ksicSub.76" },
  ],
  O: [{ value: "84", labelKey: "industryClassification.ksicSub.84" }],
  P: [{ value: "85", labelKey: "industryClassification.ksicSub.85" }],
  Q: [
    { value: "86", labelKey: "industryClassification.ksicSub.86" },
    { value: "87", labelKey: "industryClassification.ksicSub.87" },
  ],
  R: [
    { value: "90", labelKey: "industryClassification.ksicSub.90" },
    { value: "91", labelKey: "industryClassification.ksicSub.91" },
  ],
  S: [
    { value: "94", labelKey: "industryClassification.ksicSub.94" },
    { value: "95", labelKey: "industryClassification.ksicSub.95" },
    { value: "96", labelKey: "industryClassification.ksicSub.96" },
  ],
  T: [
    { value: "97", labelKey: "industryClassification.ksicSub.97" },
    { value: "98", labelKey: "industryClassification.ksicSub.98" },
  ],
  U: [{ value: "99", labelKey: "industryClassification.ksicSub.99" }],
};

// 根据大分类获取中分类
export function getSubCategoryKeysByMajor(majorCategory) {
  return KSIC_SUB_CATEGORY_KEYS[majorCategory] || [];
}

// 主力产业 KSIC 代码 - 第1层级（大分类）
export const MAIN_INDUSTRY_KSIC_MAJOR_KEYS = [
  {
    value: "natural_bio",
    labelKey: "industryClassification.mainIndustryKsic.natural_bio",
  },
  {
    value: "ceramic",
    labelKey: "industryClassification.mainIndustryKsic.ceramic",
  },
  {
    value: "digital_health",
    labelKey: "industryClassification.mainIndustryKsic.digital_health",
  },
];

// 主力产业 KSIC 代码 - 第2层级（具体代码）
export const MAIN_INDUSTRY_KSIC_CODES = {
  natural_bio: [
    {
      value: "10501",
      labelKey: "industryClassification.mainIndustryKsicCodes.10501",
    },
    {
      value: "10795",
      labelKey: "industryClassification.mainIndustryKsicCodes.10795",
    },
    {
      value: "10797",
      labelKey: "industryClassification.mainIndustryKsicCodes.10797",
    },
    {
      value: "11209",
      labelKey: "industryClassification.mainIndustryKsicCodes.11209",
    },
    {
      value: "20422",
      labelKey: "industryClassification.mainIndustryKsicCodes.20422",
    },
    {
      value: "20423",
      labelKey: "industryClassification.mainIndustryKsicCodes.20423",
    },
    {
      value: "20499",
      labelKey: "industryClassification.mainIndustryKsicCodes.20499",
    },
    {
      value: "21101",
      labelKey: "industryClassification.mainIndustryKsicCodes.21101",
    },
    {
      value: "21102",
      labelKey: "industryClassification.mainIndustryKsicCodes.21102",
    },
    {
      value: "21210",
      labelKey: "industryClassification.mainIndustryKsicCodes.21210",
    },
    {
      value: "21220",
      labelKey: "industryClassification.mainIndustryKsicCodes.21220",
    },
  ],
  ceramic: [
    {
      value: "20129",
      labelKey: "industryClassification.mainIndustryKsicCodes.20129",
    },
    {
      value: "20412",
      labelKey: "industryClassification.mainIndustryKsicCodes.20412",
    },
    {
      value: "20499_ceramic",
      labelKey: "industryClassification.mainIndustryKsicCodes.20499",
    },
    {
      value: "23129",
      labelKey: "industryClassification.mainIndustryKsicCodes.23129",
    },
    {
      value: "23222",
      labelKey: "industryClassification.mainIndustryKsicCodes.23222",
    },
    {
      value: "23311",
      labelKey: "industryClassification.mainIndustryKsicCodes.23311",
    },
    {
      value: "23312",
      labelKey: "industryClassification.mainIndustryKsicCodes.23312",
    },
    {
      value: "23993",
      labelKey: "industryClassification.mainIndustryKsicCodes.23993",
    },
    {
      value: "23999",
      labelKey: "industryClassification.mainIndustryKsicCodes.23999",
    },
    {
      value: "24113",
      labelKey: "industryClassification.mainIndustryKsicCodes.24113",
    },
    {
      value: "26299",
      labelKey: "industryClassification.mainIndustryKsicCodes.26299",
    },
    {
      value: "26429",
      labelKey: "industryClassification.mainIndustryKsicCodes.26429",
    },
    {
      value: "29174",
      labelKey: "industryClassification.mainIndustryKsicCodes.29174",
    },
    {
      value: "29271",
      labelKey: "industryClassification.mainIndustryKsicCodes.29271",
    },
  ],
  digital_health: [
    {
      value: "21300",
      labelKey: "industryClassification.mainIndustryKsicCodes.21300",
    },
    {
      value: "26299_health",
      labelKey: "industryClassification.mainIndustryKsicCodes.26299",
    },
    {
      value: "27111",
      labelKey: "industryClassification.mainIndustryKsicCodes.27111",
    },
    {
      value: "27112",
      labelKey: "industryClassification.mainIndustryKsicCodes.27112",
    },
    {
      value: "27192",
      labelKey: "industryClassification.mainIndustryKsicCodes.27192",
    },
    {
      value: "27199",
      labelKey: "industryClassification.mainIndustryKsicCodes.27199",
    },
    {
      value: "28519",
      labelKey: "industryClassification.mainIndustryKsicCodes.28519",
    },
    {
      value: "28909",
      labelKey: "industryClassification.mainIndustryKsicCodes.28909",
    },
    {
      value: "58221",
      labelKey: "industryClassification.mainIndustryKsicCodes.58221",
    },
    {
      value: "58222",
      labelKey: "industryClassification.mainIndustryKsicCodes.58222",
    },
  ],
};

// 根据主力产业大分类获取具体代码
export function getMainIndustryKsicCodesByMajor(majorCategory) {
  return MAIN_INDUSTRY_KSIC_CODES[majorCategory] || [];
}

// 翻译选项（使用 i18n t 函数）
export function translateOptions(options, t) {
  return options.map((opt) => ({
    value: opt.value,
    label: t(
      opt.labelKey,
      typeof opt.labelKey === "string" ? opt.labelKey.split(".").pop() : "",
    ),
  }));
}
