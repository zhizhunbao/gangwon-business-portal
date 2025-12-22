/**
 * Global Exception Handler - 全局异常处理器
 * 
 * 实现 window.onerror 和 window.onunhandledrejection 处理器
 * 集成异常服务进行上报，支持异常过滤和去重
 * Requirements: 3.1, 3.2, 3.5
 */

import { frontendExceptionService } from './exception.service.js';

/**
 * 全局异常处理器配置
 */
const DEFAULT_CONFIG = {
  // 启用/禁用各种处理器
  enableErrorHandler: true,
  enableUnhandledRejectionHandler: true,
  enableResourceErrorHandler: true,
  
  // 过滤配置
  ignoreScriptError: true,        // 忽略 "Script error." 错误
  ignoreNetworkErrors: false,     // 是否忽略网络错误
  ignoreCorsErrors: false,        // 是否忽略 CORS 错误
  
  // 采样配置
  sampleRate: 1.0,               // 采样率 (0.0 - 1.0)
  
  // 调试配置
  enableConsoleLogging: true,     // 是否在控制台输出
  enableDebugMode: false,         // 调试模式
  
  // 性能配置
  maxErrorsPerSession: 100,       // 每个会话最大错误数
  
  // 自定义过滤器
  customFilters: []
};

/**
 * 全局异常统计
 */
class GlobalExceptionStats {
  constructor() {
    this.reset();
  }
  
  reset() {
    this.stats = {
      totalErrors: 0,
      totalUnhandledRejections: 0,
      totalResourceErrors: 0,
      totalFiltered: 0,
      totalReported: 0,
      sessionStartTime: Date.now(),
      lastErrorTime: null,
      errorsByType: new Map(),
      errorsByUrl: new Map()
    };
  }
  
  recordError(type, url = 'unknown') {
    this.stats.totalErrors++;
    this.stats.lastErrorTime = Date.now();
    
    // 按类型统计
    const typeCount = this.stats.errorsByType.get(type) || 0;
    this.stats.errorsByType.set(type, typeCount + 1);
    
    // 按URL统计
    const urlCount = this.stats.errorsByUrl.get(url) || 0;
    this.stats.errorsByUrl.set(url, urlCount + 1);
  }
  
  recordUnhandledRejection() {
    this.stats.totalUnhandledRejections++;
    this.stats.lastErrorTime = Date.now();
  }
  
  recordResourceError() {
    this.stats.totalResourceErrors++;
    this.stats.lastErrorTime = Date.now();
  }
  
  recordFiltered() {
    this.stats.totalFiltered++;
  }
  
  recordReported() {
    this.stats.totalReported++;
  }
  
  getStats() {
    return {
      ...this.stats,
      sessionDuration: Date.now() - this.stats.sessionStartTime,
      errorsByType: Object.fromEntries(this.stats.errorsByType),
      errorsByUrl: Object.fromEntries(this.stats.errorsByUrl)
    };
  }
}

/**
 * 全局异常处理器主类
 */
export class GlobalExceptionHandler {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.stats = new GlobalExceptionStats();
    this.exceptionService = frontendExceptionService;
    
    // 原始处理器备份
    this.originalErrorHandler = null;
    this.originalUnhandledRejectionHandler = null;
    
    // 安装状态
    this.isInstalled = false;
    
    // 会话错误计数
    this.sessionErrorCount = 0;
  }
  
  /**
   * 安装全局异常处理器
   */
  install() {
    if (this.isInstalled) {
      console.warn('Global exception handler is already installed');
      return;
    }
    
    try {
      // 备份原始处理器
      this.originalErrorHandler = window.onerror;
      this.originalUnhandledRejectionHandler = window.onunhandledrejection;
      
      // 安装错误处理器
      if (this.config.enableErrorHandler) {
        this._installErrorHandler();
      }
      
      // 安装未处理的 Promise 拒绝处理器
      if (this.config.enableUnhandledRejectionHandler) {
        this._installUnhandledRejectionHandler();
      }
      
      // 安装资源错误处理器
      if (this.config.enableResourceErrorHandler) {
        this._installResourceErrorHandler();
      }
      
      this.isInstalled = true;
      
      if (this.config.enableConsoleLogging) {
        console.log('Global exception handler installed successfully');
      }
      
    } catch (error) {
      console.error('Failed to install global exception handler:', error);
    }
  }
  
  /**
   * 卸载全局异常处理器
   */
  uninstall() {
    if (!this.isInstalled) {
      return;
    }
    
    try {
      // 恢复原始处理器
      window.onerror = this.originalErrorHandler;
      window.onunhandledrejection = this.originalUnhandledRejectionHandler;
      
      // 移除资源错误监听器
      if (this._resourceErrorListener) {
        window.removeEventListener('error', this._resourceErrorListener, true);
        this._resourceErrorListener = null;
      }
      
      this.isInstalled = false;
      
      if (this.config.enableConsoleLogging) {
        console.log('Global exception handler uninstalled');
      }
      
    } catch (error) {
      console.error('Failed to uninstall global exception handler:', error);
    }
  }
  
  /**
   * 安装错误处理器
   * @private
   */
  _installErrorHandler() {
    window.onerror = (message, source, lineno, colno, error) => {
      try {
        // 调用原始处理器
        if (this.originalErrorHandler) {
          this.originalErrorHandler.call(window, message, source, lineno, colno, error);
        }
        
        // 处理错误
        this._handleError({
          message,
          source,
          lineno,
          colno,
          error,
          type: 'javascript-error'
        });
        
      } catch (handlerError) {
        console.error('Error in global error handler:', handlerError);
      }
      
      // 返回 true 阻止默认行为（可配置）
      return this.config.preventDefault || false;
    };
  }
  
  /**
   * 安装未处理的 Promise 拒绝处理器
   * @private
   */
  _installUnhandledRejectionHandler() {
    window.onunhandledrejection = (event) => {
      try {
        // 调用原始处理器
        if (this.originalUnhandledRejectionHandler) {
          this.originalUnhandledRejectionHandler.call(window, event);
        }
        
        // 处理 Promise 拒绝
        this._handleUnhandledRejection(event);
        
      } catch (handlerError) {
        console.error('Error in unhandled rejection handler:', handlerError);
      }
      
      // 阻止默认行为（可配置）
      if (this.config.preventDefault) {
        event.preventDefault();
      }
    };
  }
  
  /**
   * 安装资源错误处理器
   * @private
   */
  _installResourceErrorHandler() {
    this._resourceErrorListener = (event) => {
      try {
        // 只处理资源加载错误
        if (event.target !== window) {
          this._handleResourceError(event);
        }
      } catch (handlerError) {
        console.error('Error in resource error handler:', handlerError);
      }
    };
    
    // 使用捕获阶段监听
    window.addEventListener('error', this._resourceErrorListener, true);
  }
  
  /**
   * 处理 JavaScript 错误
   * @private
   */
  async _handleError(errorInfo) {
    this.stats.recordError('javascript', errorInfo.source);
    
    // 检查会话错误限制
    if (this._isSessionLimitReached()) {
      return;
    }
    
    // 创建错误对象
    const error = errorInfo.error || new Error(errorInfo.message);
    
    // 构建上下文
    const context = {
      source: errorInfo.source,
      lineno: errorInfo.lineno,
      colno: errorInfo.colno,
      type: 'global-error',
      globalHandler: true
    };
    
    // 应用过滤器
    if (!this._shouldReport(error, context)) {
      this.stats.recordFiltered();
      return;
    }
    
    // 应用采样
    if (!this._shouldSample()) {
      this.stats.recordFiltered();
      return;
    }
    
    // 报告异常
    try {
      await this.exceptionService.reportException(error, context);
      this.stats.recordReported();
      this.sessionErrorCount++;
      
      if (this.config.enableDebugMode) {
        console.log('Global error reported:', error);
      }
      
    } catch (reportError) {
      console.error('Failed to report global error:', reportError);
    }
  }
  
  /**
   * 处理未处理的 Promise 拒绝
   * @private
   */
  async _handleUnhandledRejection(event) {
    this.stats.recordUnhandledRejection();
    
    // 检查会话错误限制
    if (this._isSessionLimitReached()) {
      return;
    }
    
    // 创建错误对象
    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason));
    
    // 构建上下文
    const context = {
      type: 'unhandled-rejection',
      promise: event.promise,
      reason: event.reason,
      globalHandler: true
    };
    
    // 应用过滤器
    if (!this._shouldReport(error, context)) {
      this.stats.recordFiltered();
      return;
    }
    
    // 应用采样
    if (!this._shouldSample()) {
      this.stats.recordFiltered();
      return;
    }
    
    // 报告异常
    try {
      await this.exceptionService.reportException(error, context);
      this.stats.recordReported();
      this.sessionErrorCount++;
      
      if (this.config.enableDebugMode) {
        console.log('Unhandled rejection reported:', error);
      }
      
    } catch (reportError) {
      console.error('Failed to report unhandled rejection:', reportError);
    }
  }
  
  /**
   * 处理资源错误
   * @private
   */
  async _handleResourceError(event) {
    this.stats.recordResourceError();
    
    // 检查会话错误限制
    if (this._isSessionLimitReached()) {
      return;
    }
    
    const target = event.target;
    const tagName = target.tagName?.toLowerCase() || 'unknown';
    const src = target.src || target.href || 'unknown';
    
    // 创建错误对象
    const error = new Error(`Failed to load ${tagName}: ${src}`);
    error.name = 'ResourceError';
    
    // 构建上下文
    const context = {
      type: 'resource-error',
      tagName,
      src,
      target: {
        tagName: target.tagName,
        src: target.src,
        href: target.href,
        id: target.id,
        className: target.className
      },
      globalHandler: true
    };
    
    // 应用过滤器
    if (!this._shouldReport(error, context)) {
      this.stats.recordFiltered();
      return;
    }
    
    // 应用采样
    if (!this._shouldSample()) {
      this.stats.recordFiltered();
      return;
    }
    
    // 报告异常
    try {
      await this.exceptionService.reportException(error, context);
      this.stats.recordReported();
      this.sessionErrorCount++;
      
      if (this.config.enableDebugMode) {
        console.log('Resource error reported:', error);
      }
      
    } catch (reportError) {
      console.error('Failed to report resource error:', reportError);
    }
  }
  
  /**
   * 检查是否应该报告异常
   * @private
   */
  _shouldReport(error, context) {
    // 忽略 "Script error."
    if (this.config.ignoreScriptError && error.message === 'Script error.') {
      return false;
    }
    
    // 忽略网络错误
    if (this.config.ignoreNetworkErrors && this._isNetworkError(error)) {
      return false;
    }
    
    // 忽略 CORS 错误
    if (this.config.ignoreCorsErrors && this._isCorsError(error)) {
      return false;
    }
    
    // 应用自定义过滤器
    for (const filter of this.config.customFilters) {
      if (typeof filter === 'function' && !filter(error, context)) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * 检查是否应该采样
   * @private
   */
  _shouldSample() {
    return Math.random() < this.config.sampleRate;
  }
  
  /**
   * 检查是否达到会话错误限制
   * @private
   */
  _isSessionLimitReached() {
    return this.sessionErrorCount >= this.config.maxErrorsPerSession;
  }
  
  /**
   * 检查是否为网络错误
   * @private
   */
  _isNetworkError(error) {
    const networkKeywords = ['fetch', 'network', 'connection', 'timeout'];
    const message = error.message.toLowerCase();
    return networkKeywords.some(keyword => message.includes(keyword));
  }
  
  /**
   * 检查是否为 CORS 错误
   * @private
   */
  _isCorsError(error) {
    const message = error.message.toLowerCase();
    return message.includes('cors') || message.includes('cross-origin');
  }
  
  /**
   * 获取统计信息
   */
  getStats() {
    return {
      global: this.stats.getStats(),
      session: {
        errorCount: this.sessionErrorCount,
        limitReached: this._isSessionLimitReached(),
        maxErrors: this.config.maxErrorsPerSession
      },
      config: {
        sampleRate: this.config.sampleRate,
        enableErrorHandler: this.config.enableErrorHandler,
        enableUnhandledRejectionHandler: this.config.enableUnhandledRejectionHandler,
        enableResourceErrorHandler: this.config.enableResourceErrorHandler
      },
      service: this.exceptionService.getStats()
    };
  }
  
  /**
   * 重置统计信息
   */
  resetStats() {
    this.stats.reset();
    this.sessionErrorCount = 0;
  }
  
  /**
   * 更新配置
   */
  updateConfig(newConfig) {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };
    
    // 如果处理器启用状态发生变化，重新安装
    if (this.isInstalled && (
      oldConfig.enableErrorHandler !== this.config.enableErrorHandler ||
      oldConfig.enableUnhandledRejectionHandler !== this.config.enableUnhandledRejectionHandler ||
      oldConfig.enableResourceErrorHandler !== this.config.enableResourceErrorHandler
    )) {
      this.uninstall();
      this.install();
    }
  }
  
  /**
   * 手动报告异常
   */
  async reportException(error, context = {}) {
    const enhancedContext = {
      ...context,
      manualReport: true,
      globalHandler: false
    };
    
    return this.exceptionService.reportException(error, enhancedContext);
  }
}

// 导出单例实例
export const globalExceptionHandler = new GlobalExceptionHandler();

// 默认导出
export default globalExceptionHandler;