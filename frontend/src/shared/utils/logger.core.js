/**
 * Logger Core - 前端日志核心模块
 * 
 * 提供统一的日志记录接口，支持：
 * - 日志级别管理（DEBUG=10, INFO=20, WARNING=30, ERROR=40, CRITICAL=50）
 * - 日志格式化（JSON，时间戳格式 yyyy-MM-dd HH:mm:ss.SSS）
 * - 必填字段验证
 * 
 * Requirements: 1.1, 1.3-1.8
 */

import { contextManager } from './logger.context.js';
import { deduplicator } from './logger.dedup.js';
import { logTransport } from './logger.transport.js';
import { LOGGING_CONFIG, shouldLogToConsole, shouldLogToTransport } from '@shared/config/logging.config';

// 日志级别枚举
export const LOG_LEVELS = {
  DEBUG: { name: 'DEBUG', value: 10 },
  INFO: { name: 'INFO', value: 20 },
  WARNING: { name: 'WARNING', value: 30 },
  ERROR: { name: 'ERROR', value: 40 },
  CRITICAL: { name: 'CRITICAL', value: 50 }
};

// 日志层级枚举
export const LOG_LAYERS = {
  SERVICE: 'Service',
  ROUTER: 'Router', 
  AUTH: 'Auth',
  STORE: 'Store',
  COMPONENT: 'Component',
  HOOK: 'Hook',
  PERFORMANCE: 'Performance'
};

/**
 * 获取调用栈信息
 * @returns {Object} 包含文件名、行号、函数名的对象
 */
function getCallerInfo() {
  const error = new Error();
  const stack = error.stack;
  
  if (!stack) {
    return {
      file: 'unknown',
      line: 0,
      function: 'unknown'
    };
  }
  
  // 解析调用栈，跳过当前函数和 LoggerCore 的方法
  const lines = stack.split('\n');
  // 通常第3行是实际的调用者（跳过 Error、getCallerInfo、LoggerCore方法）
  const callerLine = lines[3] || lines[2] || lines[1] || '';
  
  // 解析调用栈行：at functionName (file:line:column)
  const match = callerLine.match(/at\s+(.+?)\s+\((.+):(\d+):(\d+)\)/) || 
                callerLine.match(/at\s+(.+):(\d+):(\d+)/);
  
  if (match) {
    const functionName = match[1] || 'anonymous';
    const filePath = match[2] || 'unknown';
    const lineNumber = parseInt(match[3] || '0', 10);
    
    // 提取文件名（去掉路径）
    const fileName = filePath.split('/').pop() || filePath;
    
    return {
      file: fileName,
      line: lineNumber,
      function: functionName
    };
  }
  
  return {
    file: 'unknown',
    line: 0,
    function: 'unknown'
  };
}

/**
 * 格式化时间戳为 yyyy-MM-dd HH:mm:ss.SSS 格式
 * @param {Date} date - 日期对象
 * @returns {string} 格式化的时间戳
 */
function formatTimestamp(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const milliseconds = String(date.getMilliseconds()).padStart(3, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
}

/**
 * 验证必填字段
 * @param {Object} logEntry - 日志条目
 * @throws {Error} 如果缺少必填字段
 */
function validateRequiredFields(logEntry) {
  const requiredFields = ['source', 'level', 'layer', 'message', 'file', 'line', 'function', 'trace_id', 'created_at'];
  
  for (const field of requiredFields) {
    if (logEntry[field] === undefined || logEntry[field] === null) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  
  // 验证 source 必须是 'frontend'
  if (logEntry.source !== 'frontend') {
    throw new Error(`Invalid source: expected 'frontend', got '${logEntry.source}'`);
  }
  
  // 验证 level 是有效的日志级别
  const validLevels = Object.keys(LOG_LEVELS);
  if (!validLevels.includes(logEntry.level)) {
    throw new Error(`Invalid level: expected one of ${validLevels.join(', ')}, got '${logEntry.level}'`);
  }
  
  // 验证 layer 是有效的日志层级
  const validLayers = Object.values(LOG_LAYERS);
  if (!validLayers.includes(logEntry.layer)) {
    throw new Error(`Invalid layer: expected one of ${validLayers.join(', ')}, got '${logEntry.layer}'`);
  }
}

/**
 * 日志核心类
 */
export class LoggerCore {
  constructor() {
    // 设置上下文管理器、去重器和传输管理器
    this._contextManager = contextManager;
    this._deduplicator = deduplicator;
    this._transportManager = logTransport;
  }
  
  /**
   * 设置传输管理器
   * @param {Object} transportManager - 传输管理器实例
   */
  setTransportManager(transportManager) {
    this._transportManager = transportManager;
  }
  
  /**
   * 获取传输管理器统计信息
   * @returns {Object} 统计信息
   */
  getTransportStats() {
    return this._transportManager ? this._transportManager.getStats() : null;
  }
  
  /**
   * 刷新所有待发送的日志
   * @returns {Promise} 刷新结果
   */
  async flush() {
    if (this._transportManager) {
      await this._transportManager.flush();
    }
  }
  
  /**
   * 创建日志条目
   * @param {string} level - 日志级别
   * @param {string} layer - 日志层级
   * @param {string} message - 日志消息
   * @param {Object} extra - 额外数据
   * @returns {Object} 格式化的日志条目
   */
  createLogEntry(level, layer, message, extra = {}) {
    // 获取调用栈信息
    const callerInfo = getCallerInfo();
    
    // 获取上下文信息
    const traceId = this._contextManager ? this._contextManager.getTraceId() : 'unknown';
    const requestId = this._contextManager ? this._contextManager.getCurrentRequestId() : undefined;
    const userId = this._contextManager ? this._contextManager.getUserId() : undefined;
    
    // 创建基础日志条目
    const logEntry = {
      source: 'frontend',
      level: level,
      layer: layer,
      message: message,
      file: callerInfo.file,
      line: callerInfo.line,
      function: callerInfo.function,
      trace_id: traceId,
      created_at: formatTimestamp()
    };
    
    // 添加可选字段
    if (requestId) {
      logEntry.request_id = requestId;
    }
    
    if (userId) {
      logEntry.user_id = userId;
    }
    
    if (extra && Object.keys(extra).length > 0) {
      logEntry.extra_data = extra;
    }
    
    // 验证必填字段
    validateRequiredFields(logEntry);
    
    return logEntry;
  }
  
  /**
   * 记录日志
   * @param {string} level - 日志级别
   * @param {string} layer - 日志层级
   * @param {string} message - 日志消息
   * @param {Object} extra - 额外数据
   */
  log(level, layer, message, extra = {}) {
    try {
      const logEntry = this.createLogEntry(level, layer, message, extra);
      
      // 检查是否应该记录（去重）
      if (!this._deduplicator.shouldLog(logEntry)) {
        // 在开发环境输出去重信息
        if (LOGGING_CONFIG.development.enableDebugLogs) {
          console.debug(`[Logger] Duplicate log filtered: ${level} ${layer} ${message}`);
        }
        return;
      }
      
      // 检查是否应该发送到传输层
      if (shouldLogToTransport(level) && this._transportManager) {
        this._transportManager.enqueue(logEntry);
      }
      
      // 检查是否应该输出到控制台
      if (shouldLogToConsole(level)) {
        const timestamp = logEntry.created_at;
        const prefix = `[${timestamp}] [${level}] [${layer}]`;
        
        if (level === 'ERROR' || level === 'CRITICAL') {
          console.error(prefix, message, extra);
        } else if (level === 'WARNING') {
          console.warn(prefix, message, extra);
        } else if (LOGGING_CONFIG.development.enableVerboseLogging) {
          console.log(prefix, message, extra);
        }
      }
      
    } catch (error) {
      // 如果日志记录失败，输出到控制台但不抛出异常
      console.error('Logger Core Error:', error.message, { level, layer, message, extra });
    }
  }
  
  /**
   * 记录 DEBUG 级别日志
   * @param {string} layer - 日志层级
   * @param {string} message - 日志消息
   * @param {Object} extra - 额外数据
   */
  debug(layer, message, extra = {}) {
    this.log('DEBUG', layer, message, extra);
  }
  
  /**
   * 记录 INFO 级别日志
   * @param {string} layer - 日志层级
   * @param {string} message - 日志消息
   * @param {Object} extra - 额外数据
   */
  info(layer, message, extra = {}) {
    this.log('INFO', layer, message, extra);
  }
  
  /**
   * 记录 WARNING 级别日志
   * @param {string} layer - 日志层级
   * @param {string} message - 日志消息
   * @param {Object} extra - 额外数据
   */
  warn(layer, message, extra = {}) {
    this.log('WARNING', layer, message, extra);
  }
  
  /**
   * 记录 ERROR 级别日志
   * @param {string} layer - 日志层级
   * @param {string} message - 日志消息
   * @param {Object} extra - 额外数据
   */
  error(layer, message, extra = {}) {
    this.log('ERROR', layer, message, extra);
  }
  
  /**
   * 记录 CRITICAL 级别日志
   * @param {string} layer - 日志层级
   * @param {string} message - 日志消息
   * @param {Object} extra - 额外数据
   */
  critical(layer, message, extra = {}) {
    this.log('CRITICAL', layer, message, extra);
  }
  
  /**
   * 序列化日志条目为 JSON
   * @param {Object} logEntry - 日志条目
   * @returns {string} JSON 字符串
   */
  serializeLogEntry(logEntry) {
    try {
      return JSON.stringify(logEntry);
    } catch (error) {
      console.error('Failed to serialize log entry:', error);
      return JSON.stringify({
        source: 'frontend',
        level: 'ERROR',
        layer: 'Logger',
        message: 'Failed to serialize log entry',
        file: 'logger.core.js',
        line: 0,
        function: 'serializeLogEntry',
        trace_id: 'unknown',
        created_at: formatTimestamp(),
        extra_data: { error: error.message }
      });
    }
  }
  
  /**
   * 反序列化 JSON 为日志条目
   * @param {string} jsonString - JSON 字符串
   * @returns {Object} 日志条目对象
   */
  deserializeLogEntry(jsonString) {
    try {
      const logEntry = JSON.parse(jsonString);
      
      // 验证反序列化后的对象
      validateRequiredFields(logEntry);
      
      return logEntry;
    } catch (error) {
      throw new Error(`Failed to deserialize log entry: ${error.message}`);
    }
  }
  
  /**
   * 获取日志级别的数值
   * @param {string} level - 日志级别名称
   * @returns {number} 日志级别数值
   */
  getLevelValue(level) {
    return LOG_LEVELS[level]?.value || 0;
  }
  
  /**
   * 检查日志级别是否应该被记录
   * @param {string} level - 日志级别
   * @param {string} minLevel - 最小日志级别
   * @returns {boolean} 是否应该记录
   */
  shouldLog(level, minLevel = 'DEBUG') {
    const levelValue = this.getLevelValue(level);
    const minLevelValue = this.getLevelValue(minLevel);
    return levelValue >= minLevelValue;
  }
}

// 创建全局日志核心实例
export const loggerCore = new LoggerCore();

// 导出便捷函数
export const debug = (layer, message, extra) => loggerCore.debug(layer, message, extra);
export const info = (layer, message, extra) => loggerCore.info(layer, message, extra);
export const warn = (layer, message, extra) => loggerCore.warn(layer, message, extra);
export const error = (layer, message, extra) => loggerCore.error(layer, message, extra);
export const critical = (layer, message, extra) => loggerCore.critical(layer, message, extra);

export default loggerCore;