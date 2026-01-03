/**
 * Logger Core - 前端日志核心模块
 * 
 * 前端采集原始数据（包含 timestamp），通过 API 传输到后端。
 * 后端统一负责：格式化输出、文件写入、数据库写入。
 * 
 * 支持：
 * - 日志级别管理（DEBUG=10, INFO=20, WARNING=30, ERROR=40, CRITICAL=50）
 * - 原始数据采集和传输
 * - 必填字段验证
 * 
 * Requirements: 1.1, 1.3-1.8
 */

import { contextManager } from './context.js';
import { deduplicator } from './dedup.js';
import { logTransport } from './transport.js';
import { LOGGING_CONFIG, shouldLogToConsole, shouldLogToTransport } from './config';

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
 * @param {number} skipFrames - 额外跳过的栈帧数（默认0）
 * @returns {Object} 包含模块名、行号、函数名的对象（与后端字段名一致）
 */
/**
 * 获取调用栈信息
 * @param {number} skipFrames - 额外跳过的栈帧数（默认0）
 * @returns {Object} 包含模块名、行号、函数名的对象（与后端字段名一致）
 */
function getCallerInfo(skipFrames = 0) {
  const error = new Error();
  const stack = error.stack;
  
  if (!stack) {
    return {
      module: '-',
      file_path: null,
      line_number: null,
      function: 'unknown'
    };
  }
  
  const lines = stack.split('\n');
  
  // 需要跳过的内部函数/文件模式
  const skipPatterns = [
    'getCallerInfo',
    'LoggerCore',
    'core.js',
    'index.js',
    'createLogEntry',
    /^(debug|info|warn|error|critical)$/,
    'logFn',
    'useComponentLog',
    'useHookLog',
    'useStoreLog',
    'useAuthLog',
    'usePerformanceLog'
  ];
  
  // 从第2行开始（跳过 "Error" 行）
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i] || '';
    
    // 检查是否应该跳过这一行
    const shouldSkip = skipPatterns.some(pattern => {
      if (pattern instanceof RegExp) {
        return pattern.test(line);
      }
      return line.includes(pattern);
    });
    
    if (shouldSkip) {
      continue;
    }
    
    // 额外跳过指定的帧数
    if (skipFrames > 0) {
      skipFrames--;
      continue;
    }
    
    // 解析调用栈行：at functionName (file:line:column) 或 at file:line:column
    const match = line.match(/at\s+(.+?)\s+\((.+):(\d+):(\d+)\)/) || 
                  line.match(/at\s+(.+):(\d+):(\d+)/);
    
    if (match) {
      let functionName, filePath, lineNumber;
      
      if (match.length === 5) {
        // 格式: at functionName (file:line:column)
        functionName = match[1] || 'anonymous';
        filePath = match[2] || 'unknown';
        lineNumber = parseInt(match[3] || '0', 10);
      } else {
        // 格式: at file:line:column
        functionName = 'anonymous';
        filePath = match[1] || 'unknown';
        lineNumber = parseInt(match[2] || '0', 10);
      }
      
      // 提取模块路径（目录级别）和完整文件路径
      let modulePath = extractModulePath(filePath);
      let fullFilePath = extractFullFilePath(filePath);
      
      // 清理函数名（去掉 Object. 等前缀）
      functionName = functionName
        .replace(/^Object\./, '')
        .replace(/^Module\./, '')
        .replace(/^eval\s+at\s+/, '');
      
      return {
        module: modulePath,
        file_path: fullFilePath,
        line_number: lineNumber || null,
        function: functionName
      };
    }
  }
  
  return {
    module: 'unknown',
    file_path: null,
    line_number: null,
    function: 'unknown'
  };
}

/**
 * 从完整文件路径提取相对于项目根目录的模块路径
 * @param {string} filePath - 完整文件路径（可能包含 URL 格式）
 * @returns {string} 相对模块路径，使用点分格式，如 shared.interceptors
 */
function extractModulePath(filePath) {
  if (!filePath || filePath === 'unknown') {
    return '-';
  }
  
  // 去掉查询参数（Vite 的 ?t=xxx）
  let cleanPath = filePath.split('?')[0];
  
  // 检测打包后的哈希文件名（如 index-CddmaCi5.js, chunk-abc123.js）
  // 打包后的文件通常在 /assets/ 目录下，且文件名包含哈希
  const bundledFilePattern = /\/(assets|dist)\/[^/]*-[a-zA-Z0-9]{6,}\.(js|css)$/;
  if (bundledFilePattern.test(cleanPath)) {
    return '-'; // 打包后无法获取源码模块路径
  }
  
  // 处理 URL 格式 (http://localhost:5173/src/...)
  if (cleanPath.includes('://')) {
    try {
      const url = new URL(cleanPath);
      cleanPath = url.pathname;
    } catch {
      // 如果解析失败，尝试简单提取
      const protocolEnd = cleanPath.indexOf('://');
      if (protocolEnd !== -1) {
        const pathStart = cleanPath.indexOf('/', protocolEnd + 3);
        if (pathStart !== -1) {
          cleanPath = cleanPath.substring(pathStart);
        }
      }
    }
  }
  
  // 去掉开头的斜杠
  cleanPath = cleanPath.replace(/^\/+/, '');
  
  // 提取 src/ 之后的路径
  if (cleanPath.includes('src/')) {
    const srcIndex = cleanPath.indexOf('src/');
    cleanPath = cleanPath.substring(srcIndex + 4); // 跳过 "src/"
  }
  
  // 如果路径包含 node_modules，返回包名（使用点分格式）
  if (cleanPath.includes('node_modules/')) {
    const parts = cleanPath.split('node_modules/');
    if (parts.length > 1) {
      const packagePath = parts[parts.length - 1];
      // 只返回包名，不要文件路径
      const packageParts = packagePath.split('/');
      return 'node_modules.' + packageParts[0];
    }
  }
  
  // 去掉文件名，只保留目录路径
  // shared/interceptors/auth.interceptor.js -> shared.interceptors
  const lastSlash = cleanPath.lastIndexOf('/');
  if (lastSlash > 0) {
    // 转换为点分格式
    return cleanPath.substring(0, lastSlash).replace(/\//g, '.');
  }
  
  // 如果没有目录，检查是否是打包后的文件名
  const fileName = cleanPath.split('/').pop() || cleanPath;
  
  // 检测打包后的哈希文件名模式（如 index-CddmaCi5.js）
  if (/^[a-zA-Z]+-[a-zA-Z0-9]{6,}\.(js|css)$/.test(fileName)) {
    return '-'; // 打包后无法获取源码模块路径
  }
  
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex > 0 ? fileName.substring(0, dotIndex) : fileName;
}

/**
 * 从完整文件路径提取相对文件路径（包含文件名）
 * @param {string} filePath - 完整文件路径（可能包含 URL 格式）
 * @returns {string} 相对文件路径，如 shared/interceptors/auth.interceptor.js
 */
function extractFullFilePath(filePath) {
  if (!filePath || filePath === 'unknown') {
    return null;
  }
  
  // 去掉查询参数（Vite 的 ?t=xxx）
  let cleanPath = filePath.split('?')[0];
  
  // 处理 URL 格式 (http://localhost:5173/src/...)
  if (cleanPath.includes('://')) {
    try {
      const url = new URL(cleanPath);
      cleanPath = url.pathname;
    } catch {
      const protocolEnd = cleanPath.indexOf('://');
      if (protocolEnd !== -1) {
        const pathStart = cleanPath.indexOf('/', protocolEnd + 3);
        if (pathStart !== -1) {
          cleanPath = cleanPath.substring(pathStart);
        }
      }
    }
  }
  
  // 去掉开头的斜杠
  cleanPath = cleanPath.replace(/^\/+/, '');
  
  // 提取 src/ 之后的路径
  if (cleanPath.includes('src/')) {
    const srcIndex = cleanPath.indexOf('src/');
    return cleanPath.substring(srcIndex + 4); // 跳过 "src/"
  }
  
  return cleanPath;
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
  // 前端传输必填字段
  const requiredFields = ['timestamp', 'source', 'level', 'message', 'layer', 'module', 'function'];
  
  for (const field of requiredFields) {
    if (logEntry[field] === undefined || logEntry[field] === null) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  
  // line_number 可以为 null，但必须存在
  if (!('line_number' in logEntry)) {
    throw new Error('Missing required field: line_number');
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
   * @param {Object} extra - 额外数据（可包含 _function, _module, _line_number, _file_path 覆盖默认值）
   * @returns {Object} 日志数据
   */
  createLogEntry(level, layer, message, extra = {}) {
    // 提取自定义的位置信息（如果有）
    const { _function, _module, _line_number, _file_path, ...restExtra } = extra || {};
    
    // 始终获取调用栈信息，用于补充缺失的字段
    const callerInfo = getCallerInfo();
    
    // 获取上下文信息
    const traceId = this._contextManager ? this._contextManager.getTraceId() : null;
    const requestId = this._contextManager ? this._contextManager.getCurrentRequestId() : null;
    const userId = this._contextManager ? this._contextManager.getUserId() : null;
    
    // 确定各字段值（优先使用传入的值，否则使用调用栈信息）
    const moduleValue = _module || (callerInfo ? callerInfo.module : 'unknown');
    const filePathValue = _file_path || (callerInfo ? callerInfo.file_path : null);
    const functionValue = _function || (callerInfo ? callerInfo.function : 'unknown');
    const lineNumberValue = _line_number !== undefined ? _line_number : (callerInfo ? callerInfo.line_number : null);
    
    // 创建日志数据（包含 timestamp）
    const logEntry = {
      timestamp: formatTimestamp(),
      source: 'frontend',
      level: level,
      message: message,
      layer: layer,
      module: moduleValue,
      function: functionValue,
      line_number: lineNumberValue,
      file_path: filePathValue
    };
    
    // 添加追踪字段（只在有值时添加）
    if (traceId) {
      logEntry.trace_id = traceId;
    }
    
    if (requestId) {
      logEntry.request_id = requestId;
    }
    
    if (userId) {
      logEntry.user_id = userId;
    }
    
    // 添加 duration_ms（如果有）
    if (restExtra.duration_ms !== undefined) {
      logEntry.duration_ms = restExtra.duration_ms;
      delete restExtra.duration_ms;
    }
    
    // 添加 extra_data（Layer 独有业务数据）
    if (restExtra && Object.keys(restExtra).length > 0) {
      logEntry.extra_data = restExtra;
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
   * @param {Object} extra - 额外数据（Layer 独有业务数据）
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
      
      // 检查是否应该发送到传输层（后端）
      if (shouldLogToTransport(level) && this._transportManager) {
        this._transportManager.enqueue(logEntry);
      }
      
      // 检查是否应该输出到控制台（开发调试用）
      if (shouldLogToConsole(level)) {
        const prefix = `[${level}] [${layer}]`;
        
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
   * @param {Object} extra - 额外数据（Layer 独有业务数据）
   */
  debug(layer, message, extra = {}) {
    this.log('DEBUG', layer, message, extra);
  }
  
  /**
   * 记录 INFO 级别日志
   * @param {string} layer - 日志层级
   * @param {string} message - 日志消息
   * @param {Object} extra - 额外数据（Layer 独有业务数据）
   */
  info(layer, message, extra = {}) {
    this.log('INFO', layer, message, extra);
  }
  
  /**
   * 记录 WARNING 级别日志
   * @param {string} layer - 日志层级
   * @param {string} message - 日志消息
   * @param {Object} extra - 额外数据（Layer 独有业务数据）
   */
  warn(layer, message, extra = {}) {
    this.log('WARNING', layer, message, extra);
  }
  
  /**
   * 记录 ERROR 级别日志
   * @param {string} layer - 日志层级
   * @param {string} message - 日志消息
   * @param {Object} extra - 额外数据（Layer 独有业务数据）
   */
  error(layer, message, extra = {}) {
    this.log('ERROR', layer, message, extra);
  }
  
  /**
   * 记录 CRITICAL 级别日志
   * @param {string} layer - 日志层级
   * @param {string} message - 日志消息
   * @param {Object} extra - 额外数据（Layer 独有业务数据）
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
        module: 'core.js',
        function: 'serializeLogEntry',
        line_number: 0,
        extra_data: { 
          error_type: 'SerializationError',
          error_message: error.message 
        }
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
