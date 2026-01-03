/**
 * Formatting Utilities
 */

import { format, parseISO } from 'date-fns';
import { ko, zhCN } from 'date-fns/locale';

// =============================================================================
// 时区转换函数
// =============================================================================

/**
 * 格式化为韩国时间显示 (KST UTC+9)
 * 用于：业务模块（项目、会员、实绩等）
 * @param {Date|string} date - UTC 时间
 * @param {string} formatStr - 格式字符串
 * @returns {string} 格式化后的韩国时间
 */
export function formatKST(date, formatStr = 'yyyy-MM-dd HH:mm:ss') {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  
  // 使用 toLocaleString 转换到韩国时区
  const kstStr = d.toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' });
  // sv-SE 格式: "2026-01-02 13:44:26"
  
  if (formatStr === 'yyyy-MM-dd') {
    return kstStr.split(' ')[0];
  }
  if (formatStr === 'yyyy-MM-dd HH:mm') {
    return kstStr.substring(0, 16);
  }
  return kstStr;
}

/**
 * 格式化为渥太华时间显示 (EST UTC-5)
 * 用于：系统日志模块（运维人员在渥太华）
 * @param {Date|string} date - UTC 时间
 * @returns {string} 格式化后的渥太华时间 (yyyy-MM-dd HH:mm:ss.SSS)
 */
export function formatEST(date) {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  
  // 使用 toLocaleString 转换到渥太华时区
  const estStr = d.toLocaleString('sv-SE', { timeZone: 'America/Toronto' });
  // sv-SE 格式: "2026-01-02 13:44:26"
  
  // 添加毫秒
  const ms = String(d.getUTCMilliseconds()).padStart(3, '0');
  return `${estStr}.${ms}`;
}

/**
 * 转换为韩国时间 Date 对象
 */
export function toKST(date) {
  if (!date) return null;
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
}

/**
 * 转换为渥太华时间 Date 对象
 */
export function toEST(date) {
  if (!date) return null;
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Date(d.toLocaleString('en-US', { timeZone: 'America/Toronto' }));
}

// =============================================================================
// 通用格式化函数
// =============================================================================

/**
 * Format business license number: 0000000000 -> 000-00-00000
 */
export function formatBusinessLicense(value) {
  if (!value) return '';
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 5) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5, 10)}`;
}

/**
 * Format corporation number: 0000000000000 -> 000000-0000000
 */
export function formatCorporationNumber(value) {
  if (!value) return '';
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length <= 6) return cleaned;
  return `${cleaned.slice(0, 6)}-${cleaned.slice(6, 13)}`;
}

/**
 * Format phone number: 00000000000 -> 000-0000-0000
 */
export function formatPhoneNumber(value) {
  if (!value) return '';
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 7) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  }
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7, 11)}`;
}

/**
 * Format currency (KRW) with thousand separators
 * @param {number|string} value - The value to format
 * @param {string} language - Language code ('ko' or 'zh'), defaults to 'ko'
 */
export function formatCurrency(value, language = 'ko') {
  if (value === null || value === undefined || value === '') return '';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '';
  const locale = language === 'zh' ? 'zh-CN' : 'ko-KR';
  return num.toLocaleString(locale);
}

/**
 * Format currency with compact notation and internationalization
 * Supports large numbers using 천/千 (thousand) unit
 * @param {number|string} value - The value to format
 * @param {Object} options - Formatting options
 * @param {string} options.language - Language code ('ko' or 'zh'), defaults to 'ko'
 * @param {boolean} options.showCurrency - Whether to show currency unit, defaults to true
 * @param {number} options.decimals - Number of decimal places, defaults to 1
 * @returns {string} Formatted currency string
 */
export function formatCurrencyCompact(value, options = {}) {
  if (value === null || value === undefined || value === '') return '';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num) || num === 0) return '0';
  
  const {
    language = 'ko',
    showCurrency = true,
    decimals = 1,
    showUnitLabel = true  // Whether to show (단위: 만원) format
  } = options;
  
  // Get currency and unit translations
  const getUnit = (unit) => {
    const units = {
      ko: {
        currency: '원',
        man: '만',  // 10 thousand
        cheon: '천', // thousand
        unitLabel: '단위' // unit label
      },
      zh: {
        currency: '元',
        man: '万',  // 10 thousand
        cheon: '千', // thousand
        unitLabel: '单位' // unit label
      }
    };
    return units[language]?.[unit] || units.ko[unit];
  };
  
  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  
  // Format based on magnitude (no 억/亿 unit, use 천/千 instead)
  if (absNum >= 10000) {
    // 만/万 (10 thousand) or more
    const man = absNum / 10000;
    const formatted = man.toFixed(decimals).replace(/\.?0+$/, '');
    // Add comma separators
    const formattedWithCommas = parseFloat(formatted).toLocaleString(language === 'ko' ? 'ko-KR' : 'zh-CN');
    if (!showUnitLabel) {
      return `${sign}${formattedWithCommas}`;
    }
    const unit = showCurrency ? `${getUnit('man')}${getUnit('currency')}` : getUnit('man');
    return `${sign}${formattedWithCommas} (${getUnit('unitLabel')}: ${unit})`;
  } else if (absNum >= 1000) {
    // 천/千 (thousand) or more
    const cheon = absNum / 1000;
    const formatted = cheon.toFixed(decimals).replace(/\.?0+$/, '');
    // Add comma separators
    const formattedWithCommas = parseFloat(formatted).toLocaleString(language === 'ko' ? 'ko-KR' : 'zh-CN');
    if (!showUnitLabel) {
      return `${sign}${formattedWithCommas}`;
    }
    const unit = showCurrency ? `${getUnit('cheon')}${getUnit('currency')}` : getUnit('cheon');
    return `${sign}${formattedWithCommas} (${getUnit('unitLabel')}: ${unit})`;
  } else {
    // Less than 1000, use regular formatting
    const formatted = absNum.toLocaleString(language === 'ko' ? 'ko-KR' : 'zh-CN');
    if (!showUnitLabel) {
      return `${sign}${formatted}`;
    }
    const unit = showCurrency ? getUnit('currency') : '';
    return unit ? `${sign}${formatted} (${getUnit('unitLabel')}: ${unit})` : `${sign}${formatted}`;
  }
}

/**
 * Format number with thousand separators
 * @param {number|string} value - The value to format
 * @param {string} language - Language code ('ko' or 'zh'), defaults to 'ko'
 */
export function formatNumber(value, language = 'ko') {
  if (value === null || value === undefined || value === '') return '';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '';
  const locale = language === 'zh' ? 'zh-CN' : 'ko-KR';
  return num.toLocaleString(locale);
}

/**
 * Parse formatted number string to number
 */
export function parseFormattedNumber(value) {
  if (!value) return 0;
  return parseFloat(value.replace(/,/g, ''));
}

/**
 * Format date string or Date object
 * @param {Date|string} date - The date to format
 * @param {string} formatStr - Format string (default: 'yyyy-MM-dd')
 * @param {string} language - Language code ('ko' or 'zh'), defaults to 'ko'
 */
export function formatDate(date, formatStr = 'yyyy-MM-dd', language = 'ko') {
  if (!date) return '';
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    const locale = language === 'zh' ? zhCN : ko;
    return format(dateObj, formatStr, { locale });
  } catch (error) {
    console.error('Date formatting error:', error);
    return '';
  }
}

/**
 * Format datetime string or Date object
 * @param {Date|string} date - The date to format
 * @param {string} formatStr - Format string (default: 'yyyy-MM-dd HH:mm:ss')
 * @param {string} language - Language code ('ko' or 'zh'), defaults to 'ko'
 */
export function formatDateTime(date, formatStr = 'yyyy-MM-dd HH:mm:ss', language = 'ko') {
  return formatDate(date, formatStr, language);
}

/**
 * Format relative time (e.g., "2 days ago")
 */
export function formatRelativeTime(date) {
  if (!date) return '';
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    const now = new Date();
    const diffInSeconds = Math.floor((now - dateObj) / 1000);
    
    if (diffInSeconds < 60) return '방금 전';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}시간 전`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}일 전`;
    
    return formatDate(dateObj, 'yyyy-MM-dd');
  } catch (error) {
    console.error('Relative time formatting error:', error);
    return '';
  }
}

/**
 * Format file size (bytes to human readable)
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  if (!bytes) return '';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text, maxLength = 50) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}

/**
 * Format percentage
 */
export function formatPercentage(value, decimals = 1) {
  if (value === null || value === undefined) return '';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '';
  return `${num.toFixed(decimals)}%`;
}

/**
 * Mask email (show only first 3 chars and domain)
 */
export function maskEmail(email) {
  if (!email) return '';
  const [username, domain] = email.split('@');
  if (!domain) return email;
  const maskedUsername = username.length > 3 
    ? `${username.substring(0, 3)}***` 
    : username;
  return `${maskedUsername}@${domain}`;
}

/**
 * Mask phone number (show only last 4 digits)
 */
export function maskPhoneNumber(phone) {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 4) return phone;
  return `***-****-${cleaned.slice(-4)}`;
}

/**
 * Get initials from name
 */
export function getInitials(name) {
  if (!name) return '';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Format year and quarter
 */
export function formatYearQuarter(year, quarter) {
  if (!year || !quarter) return '';
  const quarterMap = {
    'Q1': '1분기',
    'Q2': '2분기',
    'Q3': '3분기',
    'Q4': '4분기'
  };
  return `${year}년 ${quarterMap[quarter] || quarter}`;
}

// =============================================================================
// 日志路径解析函数
// =============================================================================

/**
 * Parse module path from full file path
 * 
 * Examples:
 *   /opt/render/project/src/backend/src/common/modules/exception/recorder.py
 *   -> common.modules.exception
 *   
 *   src.common.modules.interceptor.router
 *   -> common.modules.interceptor
 *   
 *   common.modules.interceptor.router
 *   -> common.modules.interceptor
 *   
 *   index-CddmaCi5.js (frontend bundled)
 *   -> -
 * 
 * @param {string} fullPath - Full file path or module path
 * @returns {string} Module path without filename
 */
export function parseModulePath(fullPath) {
  if (!fullPath) return '-';
  
  // Frontend bundled files (like index-CddmaCi5.js)
  if (/^[a-zA-Z]+-[a-zA-Z0-9]+\.js$/.test(fullPath)) return '-';
  
  let path = fullPath;
  
  // If it's a file path (contains / or \)
  if (path.includes('/') || path.includes('\\')) {
    // Normalize separators
    path = path.replace(/\\/g, '/');
    
    // Remove .py or .js extension
    path = path.replace(/\.(py|js|jsx)$/, '');
    
    // Find the last 'src/' and extract from there, keep 'src.' prefix
    const lastSrcIdx = path.lastIndexOf('/src/');
    if (lastSrcIdx !== -1) {
      path = 'src.' + path.substring(lastSrcIdx + 5).replace(/\//g, '.');
    } else {
      // Convert to dot notation
      path = path.replace(/\//g, '.');
    }
    
    // Remove filename (last part after the last dot) for file paths
    const parts = path.split('.');
    if (parts.length > 1) {
      return parts.slice(0, -1).join('.') || '-';
    }
  }
  
  // For dot notation paths (like src.common.modules.interceptor), return as-is
  // These are already module paths without filenames
  return path || '-';
}

/**
 * Parse filename from full file path
 * 
 * Examples:
 *   /opt/render/project/src/backend/src/common/modules/exception/recorder.py
 *   -> recorder.py
 *   
 *   common.modules.interceptor.router (backend)
 *   -> router.py
 *   
 *   shared.interceptors (frontend, with filePath)
 *   -> auth.interceptor.js
 *   
 *   shared.interceptors (frontend, no filePath)
 *   -> interceptors.js
 *   
 *   index-CddmaCi5.js (frontend bundled)
 *   -> index-CddmaCi5.js
 * 
 * @param {string} fullPath - Full file path or module path
 * @param {string} source - Log source ('backend' or 'frontend')
 * @param {string} filePath - Optional file_path field from log
 * @returns {string} Filename
 */
export function parseFilename(fullPath, source = 'backend', filePath = null) {
  if (!fullPath) return '-';
  
  // If filePath is provided and contains a filename, use it
  if (filePath) {
    const parts = filePath.split('/');
    const filename = parts[parts.length - 1];
    if (filename && filename.includes('.')) {
      return filename;
    }
  }
  
  // Frontend bundled files - return as-is
  if (fullPath.includes('.js')) {
    const parts = fullPath.split('/');
    return parts[parts.length - 1];
  }
  
  let path = fullPath;
  
  // If it's a file path (contains /)
  if (path.includes('/') || path.includes('\\')) {
    // Normalize and get last part
    path = path.replace(/\\/g, '/');
    const parts = path.split('/');
    const filename = parts[parts.length - 1];
    // Already has .py extension
    if (filename.endsWith('.py')) return filename;
    // Already has .js extension
    if (filename.endsWith('.js') || filename.endsWith('.jsx')) return filename;
    // Add extension based on source
    return filename + (source === 'frontend' ? '.js' : '.py');
  }
  
  // Dot notation - get last part and add extension based on source
  const parts = path.split('.');
  const filename = parts[parts.length - 1];
  return filename + (source === 'frontend' ? '.js' : '.py');
}

