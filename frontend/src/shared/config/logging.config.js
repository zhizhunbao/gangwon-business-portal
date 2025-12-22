/**
 * Logging Configuration - 日志系统配置
 * 
 * 统一管理日志系统的配置，避免循环日志问题
 */

// 环境检测
const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

// 基础日志配置
export const LOGGING_CONFIG = {
  // 日志级别配置
  levels: {
    // 开发环境显示所有级别，生产环境只显示WARNING及以上
    minConsoleLevel: isDevelopment ? 'DEBUG' : 'WARNING',
    minTransportLevel: isDevelopment ? 'INFO' : 'WARNING'
  },
  
  // 传输配置 - 优化以避免循环
  transport: {
    batchSize: isDevelopment ? 15 : 25, // 开发环境较小批次，生产环境较大批次
    batchInterval: isDevelopment ? 8000 : 15000, // 开发8秒，生产15秒
    maxRetries: 2,
    retryDelays: [3000, 8000], // 3秒和8秒重试
    maxQueueSize: isDevelopment ? 50 : 100,
    requestTimeout: 8000, // 8秒请求超时
  },
  
  // 性能监控配置
  performance: {
    enableNetworkMonitoring: true,
    enableMemoryMonitoring: true,
    slowRequestThreshold: 1500, // 提高阈值从1000ms到1500ms，减少误报
    memoryWarningThreshold: 100 * 1024 * 1024, // 100MB
    reportInterval: isDevelopment ? 60000 : 300000, // 开发1分钟，生产5分钟
    
    // 排除的URL模式，避免监控日志请求本身
    excludePatterns: [
      '/api/v1/logging/',
      '/logging/',
      '/logs',
      'logging/frontend/logs'
    ]
  },
  
  // 去重配置
  deduplication: {
    enabled: true,
    windowSize: isDevelopment ? 30000 : 60000, // 开发30秒，生产1分钟
    maxDuplicates: 3
  },
  
  // 敏感信息过滤
  sensitiveFiltering: {
    enabled: true,
    fields: [
      'password', 'token', 'secret', 'key', 'auth',
      'credential', 'private', 'confidential', 'authorization',
      'access_token', 'refresh_token', 'api_key', 'session_id'
    ]
  },
  
  // 开发环境特殊配置
  development: {
    enableDebugLogs: isDevelopment,
    enableVerboseLogging: isDevelopment && import.meta.env.VITE_ENABLE_VERBOSE_LOGGING === 'true',
    enableAOPDebugLogs: isDevelopment && import.meta.env.VITE_ENABLE_AOP_DEBUG_LOGS === 'true'
  }
};

// 性能监控排除检查函数
export function shouldExcludeFromPerformanceMonitoring(url) {
  if (!url) return false;
  
  return LOGGING_CONFIG.performance.excludePatterns.some(pattern => 
    url.includes(pattern)
  );
}

// 日志级别检查函数
export function shouldLogToConsole(level) {
  const levels = { DEBUG: 10, INFO: 20, WARNING: 30, ERROR: 40, CRITICAL: 50 };
  const minLevel = levels[LOGGING_CONFIG.levels.minConsoleLevel] || 30;
  const currentLevel = levels[level] || 0;
  
  return currentLevel >= minLevel;
}

export function shouldLogToTransport(level) {
  const levels = { DEBUG: 10, INFO: 20, WARNING: 30, ERROR: 40, CRITICAL: 50 };
  const minLevel = levels[LOGGING_CONFIG.levels.minTransportLevel] || 20;
  const currentLevel = levels[level] || 0;
  
  return currentLevel >= minLevel;
}

// 导出默认配置
export default LOGGING_CONFIG;