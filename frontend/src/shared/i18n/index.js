/**
 * i18n Configuration
 *
 * 翻译文件从各 feature 模块的 locales 目录导入并合并。
 * 遵循 dev-frontend_patterns skill 规范。
 */

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Shared locales (common translations)
import ko from "./locales/ko.json";
import zh from "./locales/zh.json";

// Feature locales - about
import aboutKo from "../../member/modules/about/locales/ko.json";
import aboutZh from "../../member/modules/about/locales/zh.json";

// Feature locales - auth
import authKo from "../../member/modules/auth/locales/ko.json";
import authZh from "../../member/modules/auth/locales/zh.json";

// Feature locales - home
import homeKo from "../../member/modules/home/locales/ko.json";
import homeZh from "../../member/modules/home/locales/zh.json";

// Feature locales - performance
import performanceKo from "../../member/modules/performance/locales/ko.json";
import performanceZh from "../../member/modules/performance/locales/zh.json";

// Feature locales - projects
import projectsKo from "../../member/modules/projects/locales/ko.json";
import projectsZh from "../../member/modules/projects/locales/zh.json";

// Feature locales - support
import supportKo from "../../member/modules/support/locales/ko.json";
import supportZh from "../../member/modules/support/locales/zh.json";

// Admin locales - statistics
import statisticsKo from "../../admin/modules/statistics/locales/ko.json";
import statisticsZh from "../../admin/modules/statistics/locales/zh.json";

// Member Layouts locales
import layoutKo from "../../member/layouts/locales/ko.json";
import layoutZh from "../../member/layouts/locales/zh.json";

// Helper to safely merge locales (shallow deep merge for top-level objects)
const safeMerge = (...locales) => {
  const result = {};
  locales.forEach((locale) => {
    Object.keys(locale).forEach((key) => {
      if (
        typeof locale[key] === "object" &&
        locale[key] !== null &&
        !Array.isArray(locale[key])
      ) {
        result[key] = { ...(result[key] || {}), ...locale[key] };
      } else {
        result[key] = locale[key];
      }
    });
  });
  return result;
};

const resources = {
  ko: {
    translation: safeMerge(
      ko,
      aboutKo,
      authKo,
      homeKo,
      performanceKo,
      projectsKo,
      supportKo,
      statisticsKo,
      layoutKo,
    ),
  },
  zh: {
    translation: safeMerge(
      zh,
      aboutZh,
      authZh,
      homeZh,
      performanceZh,
      projectsZh,
      supportZh,
      statisticsZh,
      layoutZh,
    ),
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: "ko",
    fallbackLng: "ko",
    supportedLngs: ["ko", "zh"],
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage"],
      lookupLocalStorage: "language",
      caches: ["localStorage"],
      excludeCacheFor: ["cimode"],
    },
  });

export default i18n;
