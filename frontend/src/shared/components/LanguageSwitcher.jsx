/**
 * Language Switcher Component
 * 语言切换组件
 */

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { GlobeIcon } from './Icons';
import { setStorage } from '@shared/utils/storage';
import loggerService from '@shared/services/logger.service';
import exceptionService from '@shared/services/exception.service';
import { cn } from '@shared/utils/helpers';

/**
 * @param {Object} props
 * @param {'light'|'dark'} props.variant - 样式变体：'light' 用于深色背景，'dark' 用于浅色背景
 */
export default function LanguageSwitcher({ variant = 'dark' }) {
  const { i18n } = useTranslation();

  const languages = [
    { code: 'ko', label: '한국어' },
    { code: 'zh', label: '中文' }
  ];

  // Normalize current language: extract base language (e.g., 'ko-KR' -> 'ko')
  const currentLangCode = (i18n.language || 'ko').split('-')[0];
  const currentLanguage = languages.find(lang => lang.code === currentLangCode) || languages[0];
  const nextLanguage = languages.find(lang => lang.code !== currentLangCode) || languages[1];

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', currentLangCode);
    }
  }, [currentLangCode]);

  const persistLanguagePreference = (code) => {
    setStorage('language', code);
    try {
      localStorage.setItem('i18nextLng', code);
    } catch (error) {
      loggerService.warn('Unable to persist language preference', {
        module: 'LanguageSwitcher',
        function: 'persistLanguagePreference',
        language_code: code,
        error_message: error.message
      });
    }
  };

  const toggleLanguage = () => {
    const targetCode = nextLanguage.code;
    persistLanguagePreference(targetCode);
    i18n.changeLanguage(targetCode).catch(error => {
      loggerService.error('Failed to change language', {
        module: 'LanguageSwitcher',
        function: 'toggleLanguage',
        target_language: targetCode,
        error_message: error.message,
        error_code: error.code
      });
      exceptionService.recordException(error, {
        request_path: window.location.pathname,
        error_code: error.code || 'CHANGE_LANGUAGE_FAILED',
        context_data: { target_language: targetCode }
      });
    });
  };

  return (
    <button
      className={cn(
        'px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-200',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        variant === 'light'
          ? 'focus:ring-white text-white hover:opacity-80'
          : 'focus:ring-primary-500 text-gray-700 dark:text-gray-300 hover:opacity-80'
      )}
      onClick={toggleLanguage}
      title={`切换到 ${nextLanguage.label} / Switch to ${nextLanguage.label}`}
    >
      <GlobeIcon className="w-5 h-5" />
    </button>
  );
}

