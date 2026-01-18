/**
 * i18n Configuration
 * 
 * 翻译文件由 scripts/merge-locales.cjs 从各模块合并生成
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import ko from './locales/ko.json';
import zh from './locales/zh.json';

const resources = {
  ko: { translation: ko },
  zh: { translation: zh }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: 'zh',
    fallbackLng: 'zh',
    supportedLngs: ['ko', 'zh'],
    debug: false,
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage'],
      lookupLocalStorage: 'language',
      caches: ['localStorage'],
      excludeCacheFor: ['cimode']
    }
  });

export default i18n;
