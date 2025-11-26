/**
 * Language Switcher Component
 * 语言切换组件
 */

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { GlobeIcon } from './Icons';
import { setStorage } from '@shared/utils/storage';
import './LanguageSwitcher.css';

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
      console.warn('Unable to persist language preference:', error);
    }
  };

  const toggleLanguage = () => {
    const targetCode = nextLanguage.code;
    persistLanguagePreference(targetCode);
    i18n.changeLanguage(targetCode).catch(error => {
      console.error('Failed to change language:', error);
    });
  };

  // 根据 variant 选择样式（无背景色）
  const buttonClasses = variant === 'light'
    ? 'language-switcher-btn language-switcher-btn-light'
    : 'language-switcher-btn language-switcher-btn-dark';

  return (
    <button
      className={buttonClasses}
      onClick={toggleLanguage}
      title={`切换到 ${nextLanguage.label} / Switch to ${nextLanguage.label}`}
    >
      <GlobeIcon className="language-switcher-icon" />
    </button>
  );
}

