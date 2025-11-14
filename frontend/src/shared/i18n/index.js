/**
 * i18n Configuration
 * 
 * Structure:
 * - Shared locales: Global translations (common, errors, etc.)
 * - Module locales: Module-specific translations (auth, dashboard, etc.)
 * 
 * Modules should export their locales and import them here.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Shared locales
import koShared from './locales/ko.json';
import zhShared from './locales/zh.json';

// Member layout locales
import memberLayoutKo from '@member/layouts/locales/ko.json';
import memberLayoutZh from '@member/layouts/locales/zh.json';

// Member module locales
import authKo from '@member/modules/auth/locales/ko.json';
import authZh from '@member/modules/auth/locales/zh.json';
import homeKo from '@member/modules/home/locales/ko.json';
import homeZh from '@member/modules/home/locales/zh.json';
import aboutKo from '@member/modules/about/locales/ko.json';
import aboutZh from '@member/modules/about/locales/zh.json';
import profileKo from '@member/modules/profile/locales/ko.json';
import profileZh from '@member/modules/profile/locales/zh.json';
import projectsKo from '@member/modules/projects/locales/ko.json';
import projectsZh from '@member/modules/projects/locales/zh.json';
import performanceKo from '@member/modules/performance/locales/ko.json';
import performanceZh from '@member/modules/performance/locales/zh.json';
import supportKo from '@member/modules/support/locales/ko.json';
import supportZh from '@member/modules/support/locales/zh.json';

// Admin module locales
import adminLayoutKo from '@admin/layouts/locales/ko.json';
import adminLayoutZh from '@admin/layouts/locales/zh.json';
import adminDashboardKo from '@admin/modules/dashboard/locales/ko.json';
import adminDashboardZh from '@admin/modules/dashboard/locales/zh.json';
import adminMembersKo from '@admin/modules/members/locales/ko.json';
import adminMembersZh from '@admin/modules/members/locales/zh.json';
import adminPerformanceKo from '@admin/modules/performance/locales/ko.json';
import adminPerformanceZh from '@admin/modules/performance/locales/zh.json';
import adminProjectsKo from '@admin/modules/projects/locales/ko.json';
import adminProjectsZh from '@admin/modules/projects/locales/zh.json';
import adminContentKo from '@admin/modules/content/locales/ko.json';
import adminContentZh from '@admin/modules/content/locales/zh.json';
import adminSettingsKo from '@admin/modules/settings/locales/ko.json';
import adminSettingsZh from '@admin/modules/settings/locales/zh.json';
import adminReportsKo from '@admin/modules/reports/locales/ko.json';
import adminReportsZh from '@admin/modules/reports/locales/zh.json';
import adminAuthKo from '@admin/modules/auth/locales/ko.json';
import adminAuthZh from '@admin/modules/auth/locales/zh.json';

// Deep merge function to combine translations
const deepMerge = (target, source) => {
  const output = { ...target };
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          output[key] = source[key];
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        output[key] = source[key];
      }
    });
  }
  return output;
};

const isObject = (item) => {
  return item && typeof item === 'object' && !Array.isArray(item);
};

// Merge all module translations
const mergeModules = (...modules) => {
  return modules.reduce((acc, module) => deepMerge(acc, module), {});
};

// Merge all member module translations
const memberKo = mergeModules(
  memberLayoutKo,
  authKo,
  homeKo,
  aboutKo,
  profileKo,
  projectsKo,
  performanceKo,
  supportKo
);

const memberZh = mergeModules(
  memberLayoutZh,
  authZh,
  homeZh,
  aboutZh,
  profileZh,
  projectsZh,
  performanceZh,
  supportZh
);

// Merge all admin module translations
const adminKo = mergeModules(
  adminLayoutKo,
  adminDashboardKo,
  adminMembersKo,
  adminPerformanceKo,
  adminProjectsKo,
  adminContentKo,
  adminSettingsKo,
  adminReportsKo,
  adminAuthKo
);

const adminZh = mergeModules(
  adminLayoutZh,
  adminDashboardZh,
  adminMembersZh,
  adminPerformanceZh,
  adminProjectsZh,
  adminContentZh,
  adminSettingsZh,
  adminReportsZh,
  adminAuthZh
);

// Merge all translations
const resources = {
  ko: {
    translation: deepMerge(deepMerge(koShared, memberKo), adminKo)
  },
  zh: {
    translation: deepMerge(deepMerge(zhShared, memberZh), adminZh)
  }
};

i18n
  .use(LanguageDetector) // 检测浏览器语言
  .use(initReactI18next) // 绑定 react-i18next
  .init({
    resources,
    fallbackLng: 'ko', // 默认语言
    debug: import.meta.env.DEV,
    interpolation: {
      escapeValue: false // React 已经安全处理
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

export default i18n;

