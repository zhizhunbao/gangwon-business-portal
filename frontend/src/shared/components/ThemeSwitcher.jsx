/**
 * Theme Switcher Component
 * 主题切换组件
 */

import { useTranslation } from 'react-i18next';
import { useUIStore } from '@shared/stores/uiStore';
import { SunIcon, MoonIcon } from './Icons';
import { cn } from '@shared/utils/helpers';

/**
 * @param {Object} props
 * @param {'light'|'dark'} props.variant - 样式变体：'light' 用于深色背景，'dark' 用于浅色背景
 */
export default function ThemeSwitcher({ variant = 'dark' }) {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useUIStore();

  const isDark = theme === 'dark';

  return (
    <button
      className={cn(
        'px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-200',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center gap-2',
        variant === 'light'
          ? 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 border border-white/30 focus:ring-white'
          : 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500'
      )}
      onClick={toggleTheme}
      title={isDark ? t('common.theme.switchToLight', '切换到浅色模式') : t('common.theme.switchToDark', '切换到深色模式')}
    >
      {isDark ? (
        <SunIcon className="w-4 h-4" />
      ) : (
        <MoonIcon className="w-4 h-4" />
      )}
      <span className="hidden sm:inline">
        {isDark ? t('common.theme.light', '浅色') : t('common.theme.dark', '深色')}
      </span>
    </button>
  );
}

