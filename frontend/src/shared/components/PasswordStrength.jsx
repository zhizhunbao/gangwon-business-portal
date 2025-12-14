/**
 * Password Strength Component
 * 密码强度验证组件
 */

import { useTranslation } from 'react-i18next';
import { validatePassword } from '@shared/utils/validation';
import './PasswordStrength.css';

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
  
  return (
    <div className="password-strength">
      {showStrength && (
        <div className="password-strength-indicator">
          <div className={`password-strength-bar password-strength-${strength}`}>
            <div className="password-strength-fill" style={{ width: `${(Object.values(checks).filter(Boolean).length / 5) * 100}%` }} />
          </div>
          <span className="password-strength-label">
            {strength === 'strong' && (t('auth.passwordStrength.strong') || '강함')}
            {strength === 'medium' && (t('auth.passwordStrength.medium') || '보통')}
            {strength === 'weak' && (t('auth.passwordStrength.weak') || '약함')}
          </span>
        </div>
      )}
      <ul className="password-strength-checks">
        {checkItems.map(item => (
          <li key={item.key} className={`password-strength-check ${item.passed ? 'passed' : ''}`}>
            <span className="password-strength-check-icon">
              {item.passed ? '✓' : '○'}
            </span>
            <span className="password-strength-check-label">{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default PasswordStrength;

