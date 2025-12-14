/**
 * Validation utilities
 * 验证工具函数
 */

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} Validation result with checks
 */
export function validatePassword(password) {
  const checks = {
    minLength: password.length >= 8,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  };
  
  const isValid = Object.values(checks).every(check => check === true);
  
  return {
    isValid,
    checks,
    strength: calculatePasswordStrength(checks)
  };
}

/**
 * Calculate password strength
 * @param {Object} checks - Password validation checks
 * @returns {string} Strength level: 'weak', 'medium', 'strong'
 */
function calculatePasswordStrength(checks) {
  const passedChecks = Object.values(checks).filter(Boolean).length;
  
  if (passedChecks < 3) return 'weak';
  if (passedChecks < 5) return 'medium';
  return 'strong';
}

/**
 * Check if password matches confirmation
 * @param {string} password - Password
 * @param {string} confirmPassword - Confirmation password
 * @returns {boolean} True if passwords match
 */
export function passwordsMatch(password, confirmPassword) {
  return password === confirmPassword && password.length > 0;
}
