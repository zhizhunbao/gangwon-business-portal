/**
 * Password Strength Component
 * 密码强度验证组件
 */

import { useTranslation } from 'react-i18next';
import { validatePassword } from '@shared/utils/validation';
import { cn } from '@shared/utils/helpers';

export function PasswordStrength({ password, showStrength = true }) {
  const { t } = useTranslation();
  
  if (!password) {
    return null;
  }
  
  const validation = validatePassword(password);
  const { checks, strength } = validation;
  
  const checkItems = [
    {
      key: 'minLength',
      label: t('auth.passwordCheck.minLength') || '8자 이상',
      passed: checks.minLength
    },
    {
      key: 'hasUpperCase',
      label: t('auth.passwordCheck.hasUpperCase') || '대문자 포함',
      passed: checks.hasUpperCase
    },
    {
      key: 'hasLowerCase',
      label: t('auth.passwordCheck.hasLowerCase') || '소문자 포함',
      passed: checks.hasLowerCase
    },
    {
      key: 'hasNumber',
      label: t('auth.passwordCheck.hasNumber') || '숫자 포함',
      passed: checks.hasNumber
    },
    {
      key: 'hasSpecialChar',
      label: t('auth.passwordCheck.hasSpecialChar') || '특수문자 포함',
      passed: checks.hasSpecialChar
    }
  ];
  
  const strengthColors = {
    weak: 'bg-red-600',
    medium: 'bg-yellow-500',
    strong: 'bg-green-600'
  };

  return (
    <div className="mt-2">
      {showStrength && (
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 h-1 bg-gray-300 dark:bg-gray-600 rounded overflow-hidden relative">
            <div 
              className={cn(
                'h-full transition-all duration-300 rounded',
                strengthColors[strength]
              )}
              style={{ width: `${(Object.values(checks).filter(Boolean).length / 5) * 100}%` }}
            />
          </div>
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400 min-w-[40px] text-right">
            {strength === 'strong' && (t('auth.passwordStrength.strong') || '강함')}
            {strength === 'medium' && (t('auth.passwordStrength.medium') || '보통')}
            {strength === 'weak' && (t('auth.passwordStrength.weak') || '약함')}
          </span>
        </div>
      )}
      <ul className="list-none p-0 m-0 flex flex-col gap-1.5">
        {checkItems.map(item => (
          <li key={item.key} className={cn(
            'flex items-center gap-2 text-sm',
            item.passed 
              ? 'text-green-600 dark:text-green-400' 
              : 'text-gray-600 dark:text-gray-400'
          )}>
            <span className={cn(
              'w-4 h-4 flex items-center justify-center text-xs font-bold flex-shrink-0',
              item.passed 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-gray-400 dark:text-gray-600'
            )}>
              {item.passed ? '✓' : '○'}
            </span>
            <span className="leading-[1.4]">{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default PasswordStrength;

