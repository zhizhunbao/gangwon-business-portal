/**
 * Logger Configuration
 * 
 * 前端日志配置，根据环境自动调整日志级别和输出
 */

/**
 * 日志配置
 */
export const LOGGER_CONFIG = {
  // 开发环境配置
  development: {
    // 控制台输出最低级别（WARNING = 只输出警告和错误）
    consoleMinLevel: 'WARNING',
    
    // 上报到后端的最低级别（INFO = 所有日志都上报）
    transportMinLevel: 'INFO',
    
    // 是否启用去重
    enableDeduplication: true,
    
    // 去重时间窗口（毫秒）
    deduplicationWindow: 5000,
    
    // 是否启用批量上报
    enableBatching: true,
    
    // 批量大小
    batchSize: 10,
    
    // 批量间隔（毫秒）
    batchInterval: 5000,
  },
  
  // 生产环境配置
  production: {
    // 控制台输出最低级别（ERROR = 只输出错误）
    consoleMinLevel: 'ERROR',
    
    // 上报到后端的最低级别（WARNING = 只上报警告和错误）
    transportMinLevel: 'WARNING',
    
    // 是否启用去重
    enableDeduplication: true,
    
    // 去重时间窗口（毫秒）
    deduplicationWindow: 10000,
    
    // 是否启用批量上报
    enableBatching: true,
    
    // 批量大小
    batchSize: 20,
    
    // 批量间隔（毫秒）
    batchInterval: 10000,
  }
};

/**
 * 获取当前环境的日志配置
 */
export function getLoggerConfig() {
  const env = import.meta.env.MODE || 'development';
  return LOGGER_CONFIG[env] || LOGGER_CONFIG.development;
}

/**
 * 日志级别值
 */
export const LOG_LEVEL_VALUES = {
  DEBUG: 10,
  INFO: 20,
  WARNING: 30,
  ERROR: 40,
  CRITICAL: 50
};

/**
 * 检查日志级别是否应该输出
 */
export function shouldLog(logLevel, minLevel) {
  return LOG_LEVEL_VALUES[logLevel] >= LOG_LEVEL_VALUES[minLevel];
}
