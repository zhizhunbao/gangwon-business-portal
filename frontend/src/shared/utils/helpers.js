// 工具函数集合

import { format, parseISO } from 'date-fns';
import { ko, zhCN } from 'date-fns/locale';
import clsx from 'clsx';


// =============================================================================
// Formatters 格式化
// =============================================================================

// 格式化为韩国时间显示
export function formatKST(date, formatStr = 'yyyy-MM-dd HH:mm:ss') {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  const kstStr = d.toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' });
  
  if (formatStr === 'yyyy-MM-dd') return kstStr.split(' ')[0];
  if (formatStr === 'yyyy-MM-dd HH:mm') return kstStr.substring(0, 16);
  return kstStr;
}

// 格式化为渥太华时间显示
export function formatEST(date) {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  const estStr = d.toLocaleString('sv-SE', { timeZone: 'America/Toronto' });
  const ms = String(d.getUTCMilliseconds()).padStart(3, '0');
  return `${estStr}.${ms}`;
}

// 格式化营业执照号码
export function formatBusinessLicense(value) {
  if (!value) return '';
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 5) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5, 10)}`;
}

// 格式化法人号码
export function formatCorporationNumber(value) {
  if (!value) return '';
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length <= 6) return cleaned;
  return `${cleaned.slice(0, 6)}-${cleaned.slice(6, 13)}`;
}

// 格式化电话号码
export function formatPhoneNumber(value) {
  if (!value) return '';
  const cleaned = value.replace(/\D/g, '');
  
  if (cleaned.length === 0) return '';
  
  // 韩国电话号码必须以0开头，如果不是则返回空（阻止输入）
  if (!cleaned.startsWith('0')) {
    return '';
  }
  
  // 限制最大长度为11位数字（最长的韩国电话号码）
  const maxLength = 11;
  const truncated = cleaned.slice(0, maxLength);
  
  // 02 (首尔): 02-xxx-xxxx 或 02-xxxx-xxxx (最多10位)
  if (truncated.startsWith('02')) {
    if (truncated.length <= 2) return truncated;
    if (truncated.length <= 5) return `${truncated.slice(0, 2)}-${truncated.slice(2)}`;
    if (truncated.length <= 6) return `${truncated.slice(0, 2)}-${truncated.slice(2, 5)}-${truncated.slice(5)}`;
    if (truncated.length <= 9) return `${truncated.slice(0, 2)}-${truncated.slice(2, 5)}-${truncated.slice(5, 9)}`;
    return `${truncated.slice(0, 2)}-${truncated.slice(2, 6)}-${truncated.slice(6, 10)}`;
  }
  
  // 010, 011, 016-019 (手机): 0xx-xxx-xxxx 或 0xx-xxxx-xxxx (最多11位)
  if (truncated.startsWith('01')) {
    if (truncated.length <= 3) return truncated;
    if (truncated.length <= 6) return `${truncated.slice(0, 3)}-${truncated.slice(3)}`;
    if (truncated.length <= 7) return `${truncated.slice(0, 3)}-${truncated.slice(3, 6)}-${truncated.slice(6)}`;
    if (truncated.length <= 10) return `${truncated.slice(0, 3)}-${truncated.slice(3, 6)}-${truncated.slice(6, 10)}`;
    return `${truncated.slice(0, 3)}-${truncated.slice(3, 7)}-${truncated.slice(7, 11)}`;
  }
  
  // 其他地区 (031-055): 0xx-xxx-xxxx 或 0xx-xxxx-xxxx (最多11位)
  if (truncated.startsWith('0')) {
    if (truncated.length <= 3) return truncated;
    if (truncated.length <= 6) return `${truncated.slice(0, 3)}-${truncated.slice(3)}`;
    if (truncated.length <= 7) return `${truncated.slice(0, 3)}-${truncated.slice(3, 6)}-${truncated.slice(6)}`;
    if (truncated.length <= 10) return `${truncated.slice(0, 3)}-${truncated.slice(3, 6)}-${truncated.slice(6, 10)}`;
    return `${truncated.slice(0, 3)}-${truncated.slice(3, 7)}-${truncated.slice(7, 11)}`;
  }
  
  return '';
}

// 格式化货币
export function formatCurrency(value, language = 'ko') {
  if (value === null || value === undefined || value === '') return '';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '';
  const locale = language === 'zh' ? 'zh-CN' : 'ko-KR';
  return num.toLocaleString(locale);
}

// 格式化货币（紧凑模式）
export function formatCurrencyCompact(value, options = {}) {
  if (value === null || value === undefined || value === '') return '';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num) || num === 0) return '0';
  
  const { language = 'ko', showCurrency = true, decimals = 1, showUnitLabel = true } = options;
  
  const getUnit = (unit) => {
    const units = {
      ko: { currency: '원', man: '만', cheon: '천', unitLabel: '단위' },
      zh: { currency: '元', man: '万', cheon: '千', unitLabel: '单位' }
    };
    return units[language]?.[unit] || units.ko[unit];
  };
  
  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  const locale = language === 'ko' ? 'ko-KR' : 'zh-CN';
  
  if (absNum >= 10000) {
    const man = absNum / 10000;
    const formatted = parseFloat(man.toFixed(decimals).replace(/\.?0+$/, '')).toLocaleString(locale);
    if (!showUnitLabel) return `${sign}${formatted}`;
    const unit = showCurrency ? `${getUnit('man')}${getUnit('currency')}` : getUnit('man');
    return `${sign}${formatted} (${getUnit('unitLabel')}: ${unit})`;
  }
  
  if (absNum >= 1000) {
    const cheon = absNum / 1000;
    const formatted = parseFloat(cheon.toFixed(decimals).replace(/\.?0+$/, '')).toLocaleString(locale);
    if (!showUnitLabel) return `${sign}${formatted}`;
    const unit = showCurrency ? `${getUnit('cheon')}${getUnit('currency')}` : getUnit('cheon');
    return `${sign}${formatted} (${getUnit('unitLabel')}: ${unit})`;
  }
  
  const formatted = absNum.toLocaleString(locale);
  if (!showUnitLabel) return `${sign}${formatted}`;
  const unit = showCurrency ? getUnit('currency') : '';
  return unit ? `${sign}${formatted} (${getUnit('unitLabel')}: ${unit})` : `${sign}${formatted}`;
}

// 格式化数字
export function formatNumber(value, language = 'ko') {
  if (value === null || value === undefined || value === '') return '';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '';
  return num.toLocaleString(language === 'zh' ? 'zh-CN' : 'ko-KR');
}

// 格式化日期
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

// 格式化日期时间
export function formatDateTime(date, formatStr = 'yyyy-MM-dd HH:mm:ss', language = 'ko') {
  if (!date) return '';
  return formatDate(date, formatStr, language);
}

// 格式化相对时间
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

// 格式化文件大小
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  if (!bytes) return '';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// 格式化百分比
export function formatPercentage(value, decimals = 1) {
  if (value === null || value === undefined) return '';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '';
  return `${num.toFixed(decimals)}%`;
}

// 格式化年度季度
export function formatYearQuarter(year, quarter) {
  if (!year || !quarter) return '';
  const quarterMap = { 'Q1': '1분기', 'Q2': '2분기', 'Q3': '3분기', 'Q4': '4분기' };
  return `${year}년 ${quarterMap[quarter] || quarter}`;
}

// 截断文本
export function truncateText(text, maxLength = 50) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}

// 掩码邮箱
export function maskEmail(email) {
  if (!email) return '';
  const [username, domain] = email.split('@');
  if (!domain) return email;
  const maskedUsername = username.length > 3 ? `${username.substring(0, 3)}***` : username;
  return `${maskedUsername}@${domain}`;
}

// 掩码电话号码
export function maskPhoneNumber(phone) {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 4) return phone;
  return `***-****-${cleaned.slice(-4)}`;
}

// 首字母大写
export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}


// =============================================================================
// Validators 验证
// =============================================================================

// 检查对象是否为空
export function isEmpty(obj) {
  if (obj === null || obj === undefined) return true;
  if (typeof obj === 'string') return obj.trim().length === 0;
  if (Array.isArray(obj)) return obj.length === 0;
  if (typeof obj === 'object') return Object.keys(obj).length === 0;
  return false;
}

// 检查是否为有效数字
export function isValidNumber(value) {
  return !isNaN(parseFloat(value)) && isFinite(value);
}

// 验证密码强度
export function validatePassword(password) {
  if (!password) return { isValid: false, checks: {}, strength: 'weak' };
  const checks = {
    minLength: password.length >= 8,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  };
  
  const passedChecks = Object.values(checks).filter(Boolean).length;
  let strength = 'weak';
  if (passedChecks >= 5) strength = 'strong';
  else if (passedChecks >= 3) strength = 'medium';
  
  return {
    isValid: Object.values(checks).every(check => check === true),
    checks,
    strength
  };
}

// 检查密码是否匹配
export function passwordsMatch(password, confirmPassword) {
  if (!password || !confirmPassword) return false;
  return password === confirmPassword && password.length > 0;
}

// 验证文件大小
export function validateFileSize(file, maxSize = null) {
  if (!file) return { valid: false, error: 'No file provided' };
  
  if (maxSize === null) {
    maxSize = getMaxFileSize(getFileCategory(file));
  }
  
  if (file.size > maxSize) {
    const category = getFileCategory(file);
    return {
      valid: false,
      error: `File size (${formatFileSize(file.size)}) exceeds maximum allowed size of ${formatFileSize(maxSize)} for ${category} files`
    };
  }
  
  return { valid: true };
}

// 验证文件扩展名
export function validateFileExtension(file, category = null) {
  if (!file) return { valid: false, error: 'No file provided' };
  if (!file.name || !file.name.includes('.')) return { valid: false, error: 'File must have an extension' };
  
  const extension = file.name.toLowerCase().split('.').pop();
  if (category === null) category = getFileCategory(file);
  
  let allowedExtensions;
  if (category === 'image') allowedExtensions = ALLOWED_IMAGE_EXTENSIONS;
  else if (category === 'document') allowedExtensions = ALLOWED_DOCUMENT_EXTENSIONS;
  else allowedExtensions = [...ALLOWED_IMAGE_EXTENSIONS, ...ALLOWED_DOCUMENT_EXTENSIONS];
  
  if (!allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `File extension '${extension}' is not allowed for ${category} files. Allowed extensions: ${allowedExtensions.join(', ')}`
    };
  }
  
  return { valid: true };
}

// 验证文件类型
export function validateFileType(file, allowedTypes = null) {
  if (!file) return { valid: false, error: 'No file provided' };
  if (!file.type) return { valid: false, error: 'File type could not be determined' };
  
  if (allowedTypes === null) {
    const category = getFileCategory(file);
    if (category === 'image') allowedTypes = ALLOWED_FILE_TYPES.images;
    else if (category === 'document') allowedTypes = ALLOWED_FILE_TYPES.documents;
    else allowedTypes = ALLOWED_FILE_TYPES.all;
  }
  
  if (!allowedTypes.includes(file.type)) {
    const category = getFileCategory(file);
    return {
      valid: false,
      error: `File type '${file.type}' is not allowed for ${category} files. Allowed types: ${allowedTypes.join(', ')}`
    };
  }
  
  return { valid: true };
}

// 验证文件
export function validateFile(file, options = {}) {
  const { maxSize = null, allowedTypes = null, category = null } = options;
  
  const extensionValidation = validateFileExtension(file, category);
  if (!extensionValidation.valid) return extensionValidation;
  
  const sizeValidation = validateFileSize(file, maxSize);
  if (!sizeValidation.valid) return sizeValidation;
  
  const typeValidation = validateFileType(file, allowedTypes);
  if (!typeValidation.valid) return typeValidation;
  
  return { valid: true };
}

// 验证图片文件
export function validateImageFile(file, maxSize = null) {
  if (!file) return { valid: false, error: 'No file provided' };
  return validateFile(file, { maxSize: maxSize || MAX_IMAGE_SIZE, category: 'image' });
}

// 验证文档文件
export function validateDocumentFile(file, maxSize = null) {
  if (!file) return { valid: false, error: 'No file provided' };
  return validateFile(file, { maxSize: maxSize || MAX_DOCUMENT_SIZE, category: 'document' });
}

// 验证PDF文件
export function validatePdfFile(file, maxSize = null) {
  if (!file) return { valid: false, error: 'No file provided' };
  return validateDocumentFile(file, maxSize);
}


// =============================================================================
// Transformers 转换
// =============================================================================

// 转换为韩国时间 Date 对象
export function toKST(date) {
  if (!date) return null;
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
}

// 转换为渥太华时间 Date 对象
export function toEST(date) {
  if (!date) return null;
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Date(d.toLocaleString('en-US', { timeZone: 'America/Toronto' }));
}

// 解析格式化数字字符串
export function parseFormattedNumber(value) {
  if (!value) return 0;
  return parseFloat(value.replace(/,/g, ''));
}

// 解析模块路径
export function parseModulePath(fullPath) {
  if (!fullPath) return '-';
  if (/^[a-zA-Z]+-[a-zA-Z0-9]+\.js$/.test(fullPath)) return '-';
  
  let path = fullPath;
  
  if (path.includes('/') || path.includes('\\')) {
    path = path.replace(/\\/g, '/').replace(/\.(py|js|jsx)$/, '');
    const lastSrcIdx = path.lastIndexOf('/src/');
    if (lastSrcIdx !== -1) {
      path = 'src.' + path.substring(lastSrcIdx + 5).replace(/\//g, '.');
    } else {
      path = path.replace(/\//g, '.');
    }
    const parts = path.split('.');
    if (parts.length > 1) return parts.slice(0, -1).join('.') || '-';
  }
  
  return path || '-';
}

// 解析文件名
export function parseFilename(fullPath, source = 'backend', filePath = null) {
  if (!fullPath) return '-';
  
  if (filePath) {
    const parts = filePath.split('/');
    const filename = parts[parts.length - 1];
    if (filename && filename.includes('.')) return filename;
  }
  
  if (fullPath.includes('.js')) {
    const parts = fullPath.split('/');
    return parts[parts.length - 1];
  }
  
  let path = fullPath;
  
  if (path.includes('/') || path.includes('\\')) {
    path = path.replace(/\\/g, '/');
    const parts = path.split('/');
    const filename = parts[parts.length - 1];
    if (filename.endsWith('.py') || filename.endsWith('.js') || filename.endsWith('.jsx')) return filename;
    return filename + (source === 'frontend' ? '.js' : '.py');
  }
  
  const parts = path.split('.');
  const filename = parts[parts.length - 1];
  return filename + (source === 'frontend' ? '.js' : '.py');
}

// 深拷贝对象
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj);
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  
  const clonedObj = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      clonedObj[key] = deepClone(obj[key]);
    }
  }
  return clonedObj;
}

// 构建查询字符串
export function buildQueryString(params) {
  if (!params || isEmpty(params)) return '';
  
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== '') {
      query.append(key, value);
    }
  }
  
  const queryString = query.toString();
  return queryString ? `?${queryString}` : '';
}

// 驼峰转下划线
export function camelToSnake(str) {
  if (!str) return '';
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// 下划线转驼峰
export function snakeToCamel(str) {
  if (!str) return '';
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// 安全获取嵌套属性
export function get(obj, path, defaultValue = undefined) {
  if (!obj) return defaultValue;
  const keys = Array.isArray(path) ? path : path.split('.');
  let result = obj;
  
  for (const key of keys) {
    if (result === null || result === undefined) return defaultValue;
    result = result[key];
  }
  
  return result !== undefined ? result : defaultValue;
}

// 设置嵌套属性
export function set(obj, path, value) {
  if (!obj) return obj;
  const keys = Array.isArray(path) ? path : path.split('.');
  const lastKey = keys.pop();
  let current = obj;
  
  for (const key of keys) {
    if (!(key in current) || typeof current[key] !== 'object') current[key] = {};
    current = current[key];
  }
  
  current[lastKey] = value;
  return obj;
}

// 获取URL查询参数
export function getQueryParams(search = window.location.search) {
  const params = new URLSearchParams(search);
  const result = {};
  for (const [key, value] of params) {
    result[key] = value;
  }
  return result;
}

// 转换 snake_case 到 camelCase（深度转换）
export function toCamelCase(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCase);

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = toCamelCase(value);
  }
  return result;
}

// 转换 camelCase 到 snake_case（深度转换）
export function toSnakeCase(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toSnakeCase);

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    result[snakeKey] = toSnakeCase(value);
  }
  return result;
}


// =============================================================================
// Collections 集合
// =============================================================================

// 获取数组随机元素
export function getRandomItem(array) {
  if (!array || array.length === 0) return null;
  return array[Math.floor(Math.random() * array.length)];
}

// 打乱数组
export function shuffleArray(array) {
  if (!array) return [];
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// 按键分组数组
export function groupBy(array, key) {
  return array.reduce((result, item) => {
    const groupKey = typeof key === 'function' ? key(item) : item[key];
    if (!result[groupKey]) result[groupKey] = [];
    result[groupKey].push(item);
    return result;
  }, {});
}

// 按键排序数组
export function sortBy(array, key, order = 'asc') {
  if (!array) return [];
  return [...array].sort((a, b) => {
    const aVal = typeof key === 'function' ? key(a) : a[key];
    const bVal = typeof key === 'function' ? key(b) : b[key];
    
    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });
}

// 数组去重
export function unique(array, key) {
  if (!key) return [...new Set(array)];
  
  const seen = new Set();
  return array.filter(item => {
    const value = typeof key === 'function' ? key(item) : item[key];
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

// 选取对象指定键
export function pick(obj, keys) {
  if (!obj) return {};
  const result = {};
  keys.forEach(key => {
    if (key in obj) result[key] = obj[key];
  });
  return result;
}

// 排除对象指定键
export function omit(obj, keys) {
  if (!obj) return {};
  const result = { ...obj };
  keys.forEach(key => delete result[key]);
  return result;
}


// =============================================================================
// Performance 性能
// =============================================================================

// 防抖函数
export function debounce(func, wait = 300) {
  if (!func) return () => {};
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// 节流函数
export function throttle(func, limit = 300) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => { inThrottle = false; }, limit);
    }
  };
}

// 延迟函数
export function sleep(ms) {
  if (!ms) return Promise.resolve();
  return new Promise(resolve => setTimeout(resolve, ms));
}


// =============================================================================
// Storage 存储
// =============================================================================

// 获取本地存储
export function getStorage(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
    if (item === null) return defaultValue;
    try {
      return JSON.parse(item);
    } catch {
      return item;
    }
  } catch (error) {
    console.error(`Error reading from localStorage (${key}):`, error);
    return defaultValue;
  }
}

// 设置本地存储
export function setStorage(key, value) {
  try {
    const valueToStore = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(key, valueToStore);
    return true;
  } catch (error) {
    console.error(`Error writing to localStorage (${key}):`, error);
    return false;
  }
}

// 移除本地存储
export function removeStorage(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing from localStorage (${key}):`, error);
    return false;
  }
}

// 清空本地存储
export function clearStorage() {
  try {
    localStorage.clear();
    return true;
  } catch (error) {
    console.error('Error clearing localStorage:', error);
    return false;
  }
}

// 获取会话存储
export function getSessionStorage(key, defaultValue = null) {
  try {
    const item = sessionStorage.getItem(key);
    if (item === null) return defaultValue;
    try {
      return JSON.parse(item);
    } catch {
      return item;
    }
  } catch (error) {
    console.error(`Error reading from sessionStorage (${key}):`, error);
    return defaultValue;
  }
}

// 设置会话存储
export function setSessionStorage(key, value) {
  try {
    const valueToStore = typeof value === 'string' ? value : JSON.stringify(value);
    sessionStorage.setItem(key, valueToStore);
    return true;
  } catch (error) {
    console.error(`Error writing to sessionStorage (${key}):`, error);
    return false;
  }
}

// 移除会话存储
export function removeSessionStorage(key) {
  try {
    sessionStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing from sessionStorage (${key}):`, error);
    return false;
  }
}

// 清空会话存储
export function clearSessionStorage() {
  try {
    sessionStorage.clear();
    return true;
  } catch (error) {
    console.error('Error clearing sessionStorage:', error);
    return false;
  }
}

// 保存草稿
export function saveDraft(key, data) {
  if (!key) return false;
  return setStorage(`draft_${key}`, { data, timestamp: new Date().toISOString() });
}

// 加载草稿
export function loadDraft(key) {
  const draftData = getStorage(`draft_${key}`);
  return draftData ? draftData.data : null;
}

// 移除草稿
export function removeDraft(key) {
  if (!key) return false;
  return removeStorage(`draft_${key}`);
}

// 检查本地存储是否存在
export function hasStorage(key) {
  try {
    return localStorage.getItem(key) !== null;
  } catch (error) {
    console.error(`Error checking localStorage (${key}):`, error);
    return false;
  }
}

// 检查草稿是否存在且有效
export function hasDraft(key, daysValid = 7) {
  const draftData = getStorage(`draft_${key}`);
  if (!draftData || !draftData.timestamp) return false;
  
  const draftDate = new Date(draftData.timestamp);
  const now = new Date();
  const diffInDays = (now - draftDate) / (1000 * 60 * 60 * 24);
  
  return diffInDays <= daysValid;
}


// =============================================================================
// DOM DOM操作
// =============================================================================

// 下载Blob文件
export function downloadBlob(blob, filename) {
  if (!blob || !filename) return;
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

// 复制文本到剪贴板
export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      textArea.remove();
      return true;
    } catch (err) {
      console.error('Fallback: Oops, unable to copy', err);
      textArea.remove();
      return false;
    }
  } catch (err) {
    console.error('Failed to copy text: ', err);
    return false;
  }
}

// 滚动到页面顶部
export function scrollToTop(smooth = true) {
  window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
}

// 滚动到指定元素
export function scrollToElement(elementId, offset = 0, smooth = true) {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  const top = element.getBoundingClientRect().top + window.pageYOffset - offset;
  window.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' });
}

// 检查元素是否在视口内
export function isInViewport(element) {
  if (!element) return false;
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}


// =============================================================================
// Misc 通用
// =============================================================================

// 合并类名
export function cn(...inputs) {
  return clsx(...inputs);
}

// 生成唯一ID
export function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 获取姓名首字母
export function getInitials(name) {
  if (!name) return '';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// 获取文件扩展名
export function getFileExtension(filename) {
  if (!filename) return '';
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

// 获取文件类别
export function getFileCategory(file) {
  if (!file) return 'general';
  
  if (file.type) {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('application/') || file.type.startsWith('text/')) return 'document';
  }
  
  if (file.name) {
    const extension = file.name.toLowerCase().split('.').pop();
    if (ALLOWED_IMAGE_EXTENSIONS.includes(extension)) return 'image';
    if (ALLOWED_DOCUMENT_EXTENSIONS.includes(extension)) return 'document';
  }
  
  return 'general';
}

// 获取文件大小限制
export function getMaxFileSize(category) {
  if (!category) return MAX_FILE_SIZE;
  if (category === 'image') return MAX_IMAGE_SIZE;
  if (category === 'document') return MAX_DOCUMENT_SIZE;
  return MAX_FILE_SIZE;
}


// =============================================================================
// 文件常量
// =============================================================================

const getEnvNumber = (key, fallback) => {
  const value = import.meta.env[key];
  return value ? parseInt(value, 10) : fallback;
};

const getEnvArray = (key, fallback) => {
  const value = import.meta.env[key];
  return value ? value.split(',').map(item => item.trim()) : fallback;
};

export const MAX_IMAGE_SIZE = getEnvNumber('VITE_MAX_IMAGE_SIZE', 5 * 1024 * 1024);
export const MAX_DOCUMENT_SIZE = getEnvNumber('VITE_MAX_DOCUMENT_SIZE', 10 * 1024 * 1024);
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_IMAGE_EXTENSIONS = getEnvArray('VITE_ALLOWED_IMAGE_EXTENSIONS', ['jpg', 'jpeg', 'png', 'gif', 'webp']);
const ALLOWED_DOCUMENT_EXTENSIONS = getEnvArray('VITE_ALLOWED_DOCUMENT_EXTENSIONS', ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt']);

const extensionToMimeType = {
  'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'gif': 'image/gif', 'webp': 'image/webp',
  'pdf': 'application/pdf', 'doc': 'application/msword',
  'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'xls': 'application/vnd.ms-excel',
  'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'ppt': 'application/vnd.ms-powerpoint',
  'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'txt': 'text/plain'
};

const imageMimeTypes = ALLOWED_IMAGE_EXTENSIONS.map(ext => extensionToMimeType[ext]).filter(Boolean);
const documentMimeTypes = ALLOWED_DOCUMENT_EXTENSIONS.map(ext => extensionToMimeType[ext]).filter(Boolean);

export const ALLOWED_FILE_TYPES = {
  images: imageMimeTypes,
  documents: documentMimeTypes,
  all: [...imageMimeTypes, ...documentMimeTypes]
};


// =============================================================================
// Service 服务工厂
// =============================================================================

// 创建带参数校验的 Service 实例
export function createService(ServiceClass) {
  const instance = new ServiceClass();
  
  return new Proxy(instance, {
    get(target, prop) {
      const value = target[prop];
      
      if (typeof value !== 'function') {
        return value;
      }
      
      const params = getParamNames(value);
      
      return function (...args) {
        params.forEach((param, index) => {
          if (param.hasDefault) return;
          
          const arg = args[index];
          if (arg === undefined || arg === null) {
            throw new Error(`${prop}: ${param.name} is required`);
          }
        });
        
        return value.apply(target, args);
      };
    },
  });
}

function getParamNames(func) {
  const fnStr = func.toString();
  const match = fnStr.match(/(?:async\s*)?\w*\s*\(([^)]*)\)/);
  if (!match) return [];
  
  return match[1]
    .split(',')
    .map(p => p.trim())
    .filter(p => p)
    .map(p => ({
      name: p.split('=')[0].trim(),
      hasDefault: p.includes('='),
    }));
}
