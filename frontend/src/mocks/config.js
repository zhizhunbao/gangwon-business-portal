/**
 * MSW Mock Configuration
 */

// Mock delay (in milliseconds)
export const MOCK_DELAY = {
  FAST: 50,       // 快速响应（优化开发体验）
  NORMAL: 100,    // 正常响应（减少到100ms）
  SLOW: 500,      // 慢响应
  VERY_SLOW: 2000 // 非常慢响应
};

// Error simulation configuration
export const ERROR_CONFIG = {
  // Enable error simulation (set to true to test error handling)
  ENABLE_ERRORS: false,
  
  // Error rate (0.0 - 1.0)
  ERROR_RATE: 0.1,
  
  // Specific endpoints to simulate errors
  ERROR_ENDPOINTS: [],
  
  // Error status codes to simulate
  ERROR_STATUSES: [500, 503, 504]
};

// Get current language from storage or default
// i18next-browser-languagedetector uses 'i18nextLng' as the default localStorage key
export function getCurrentLanguage() {
  try {
    const lang = localStorage.getItem('language') || localStorage.getItem('i18nextLng') || 'ko';
    // Normalize language code: extract base language (e.g., 'ko-KR' -> 'ko', 'zh-CN' -> 'zh')
    const baseLang = lang.split('-')[0];
    // Only return supported languages
    const supportedLanguages = ['ko', 'zh'];
    return supportedLanguages.includes(baseLang) ? baseLang : 'ko';
  } catch {
    return 'ko';
  }
}

// Pre-load all JSON files using Vite's glob import
// This avoids dynamic import issues with variable paths
const mockDataModules = import.meta.glob('./data/**/*.json', { eager: true });

// Load mock data based on language
export async function loadMockData(dataPath) {
  const language = getCurrentLanguage();
  
  // Supported languages (only ko and zh are available)
  const supportedLanguages = ['ko', 'zh'];
  
  // Try to load the requested language file
  const requestedPath = `./data/${dataPath}/${language}.json`;
  const fallbackPath = `./data/${dataPath}/ko.json`;
  
  // Find the module in the pre-loaded glob
  let dataModule = mockDataModules[requestedPath];
  
  // If not found and language is not supported, silently fallback to Korean
  if (!dataModule && !supportedLanguages.includes(language)) {
    dataModule = mockDataModules[fallbackPath];
  }
  // If not found and language is supported, try fallback
  else if (!dataModule) {
    dataModule = mockDataModules[fallbackPath];
  }
  
  // If still not found, throw error (this is a real problem)
  if (!dataModule) {
    throw new Error(`Mock data file not found: ${dataPath}/${language}.json or ${dataPath}/ko.json`);
  }
  
  return dataModule.default || dataModule;
}

// Simulate delay
// 在开发环境中，可以使用更短的延迟来提高响应速度
export function delay(ms = MOCK_DELAY.FAST) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Simulate random error
export function shouldSimulateError(endpoint = '') {
  if (!ERROR_CONFIG.ENABLE_ERRORS) {
    return false;
  }
  
  if (ERROR_CONFIG.ERROR_ENDPOINTS.includes(endpoint)) {
    return Math.random() < ERROR_CONFIG.ERROR_RATE;
  }
  
  return false;
}

// Get error status code
export function getErrorStatus() {
  const randomIndex = Math.floor(Math.random() * ERROR_CONFIG.ERROR_STATUSES.length);
  return ERROR_CONFIG.ERROR_STATUSES[randomIndex];
}

