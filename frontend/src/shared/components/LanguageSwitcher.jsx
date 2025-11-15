/**
 * Language Switcher Component
 * 语言切换组件
 */

import { useTranslation } from 'react-i18next';
import { GlobeIcon } from './Icons';

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

  const toggleLanguage = () => {
    // 立即切换语言，不等待异步操作完成
    // i18n.changeLanguage 会立即更新 i18n.language，触发组件重新渲染
    i18n.changeLanguage(nextLanguage.code).catch(error => {
      console.error('Failed to change language:', error);
    });
  };

  // 根据 variant 选择样式（无背景色）
  const buttonClasses = variant === 'light'
    ? 'px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white text-white hover:opacity-80'
    : 'px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 text-gray-700 dark:text-gray-300 hover:opacity-80';

  return (
    <button
      className={buttonClasses}
      onClick={toggleLanguage}
      title={`切换到 ${nextLanguage.label} / Switch to ${nextLanguage.label}`}
    >
      <GlobeIcon className="w-5 h-5" />
    </button>
  );
}

