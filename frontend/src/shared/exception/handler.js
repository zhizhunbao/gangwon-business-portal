/**
 * Frontend Exception Handler - 前端异常处理核心
 * 
 * 实现前端异常分类逻辑、异常类型枚举和异常上下文收集
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 */

/**
 * 前端异常类型枚举
 */
export const ExceptionType = {
  // JavaScript 运行时异常
  JAVASCRIPT_ERROR: 'JAVASCRIPT_ERROR',
  TYPE_ERROR: 'TYPE_ERROR',
  REFERENCE_ERROR: 'REFERENCE_ERROR',
  SYNTAX_ERROR: 'SYNTAX_ERROR',
  RANGE_ERROR: 'RANGE_ERROR',
  
  // Promise 异常
  UNHANDLED_PROMISE_REJECTION: 'UNHANDLED_PROMISE_REJECTION',
  
  // React 异常
  REACT_ERROR_BOUNDARY: 'REACT_ERROR_BOUNDARY',
  REACT_RENDER_ERROR: 'REACT_RENDER_ERROR',
  REACT_LIFECYCLE_ERROR: 'REACT_LIFECYCLE_ERROR',
  
  // API 异常
  NETWORK_ERROR: 'NETWORK_ERROR',
  HTTP_ERROR: 'HTTP_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  CORS_ERROR: 'CORS_ERROR',
  
  // 用户交互异常
  USER_INPUT_ERROR: 'USER_INPUT_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  
  // 资源加载异常
  RESOURCE_LOAD_ERROR: 'RESOURCE_LOAD_ERROR',
  SCRIPT_LOAD_ERROR: 'SCRIPT_LOAD_ERROR',
  IMAGE_LOAD_ERROR: 'IMAGE_LOAD_ERROR',
  
  // 性能异常
  PERFORMANCE_ERROR: 'PERFORMANCE_ERROR',
  MEMORY_ERROR: 'MEMORY_ERROR',
  
  // 未知异常
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

/**
 * 异常严重程度枚举
 */
export const ExceptionSeverity = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM', 
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

/**
 * 异常上下文收集器
 */
export class ExceptionContextCollector {
  /**
   * 收集异常上下文信息
   * @param {Error} error - 异常对象
   * @param {Object} additionalContext - 额外上下文信息
   * @returns {Object} 异常上下文
   */
  static collectContext(error, additionalContext = {}) {
    const context = {
      // 基本异常信息
      message: error.message || 'Unknown error',
      name: error.name || 'Error',
      stack: error.stack || '',
      
      // 浏览器环境信息
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      
      // 页面状态
      pageTitle: document.title,
      referrer: document.referrer,
      
      // 视口信息
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio || 1
      },
      
      // 内存信息（如果可用）
      memory: this._getMemoryInfo(),
      
      // 连接信息（如果可用）
      connection: this._getConnectionInfo(),
      
      // 用户交互状态
      interaction: this._getInteractionContext(),
      
      // 额外上下文
      ...additionalContext
    };
    
    return context;
  }
  
  /**
   * 获取内存信息
   * @private
   */
  static _getMemoryInfo() {
    if (performance.memory) {
      return {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
      };
    }
    return null;
  }
  
  /**
   * 获取网络连接信息
   * @private
   */
  static _getConnectionInfo() {
    if (navigator.connection) {
      return {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt,
        saveData: navigator.connection.saveData
      };
    }
    return null;
  }
  
  /**
   * 获取用户交互上下文
   * @private
   */
  static _getInteractionContext() {
    return {
      activeElement: document.activeElement?.tagName || null,
      scrollPosition: {
        x: window.scrollX,
        y: window.scrollY
      },
      documentReadyState: document.readyState,
      visibilityState: document.visibilityState
    };
  }
}

/**
 * 前端异常分类器
 */
export class FrontendExceptionClassifier {
  /**
   * 分类异常类型
   * @param {Error} error - 异常对象
   * @param {Object} context - 异常上下文
   * @returns {Object} 分类结果
   */
  static classify(error, context = {}) {
    const classification = {
      type: this._determineExceptionType(error, context),
      severity: this._determineSeverity(error, context),
      category: this._determineCategory(error, context),
      recoverable: this._isRecoverable(error, context),
      userImpact: this._assessUserImpact(error, context)
    };
    
    return classification;
  }
  
  /**
   * 确定异常类型
   * @private
   */
  static _determineExceptionType(error, context) {
    // React 错误边界异常
    if (context.componentStack) {
      return ExceptionType.REACT_ERROR_BOUNDARY;
    }
    
    // Promise 拒绝异常
    if (context.reason && context.promise) {
      return ExceptionType.UNHANDLED_PROMISE_REJECTION;
    }
    
    // 超时异常 (优先检查，因为 Axios 超时错误的 message 不包含 fetch/XMLHttpRequest)
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return ExceptionType.TIMEOUT_ERROR;
    }
    
    // 网络相关异常
    if (error.message.includes('fetch') || error.message.includes('XMLHttpRequest') || error.name === 'AxiosError') {
      if (error.message.includes('CORS')) {
        return ExceptionType.CORS_ERROR;
      }
      if (error.message.includes('Network Error') || !error.response) {
        return ExceptionType.NETWORK_ERROR;
      }
      return ExceptionType.NETWORK_ERROR;
    }
    
    // JavaScript 内置异常类型
    switch (error.name) {
      case 'TypeError':
        return ExceptionType.TYPE_ERROR;
      case 'ReferenceError':
        return ExceptionType.REFERENCE_ERROR;
      case 'SyntaxError':
        return ExceptionType.SYNTAX_ERROR;
      case 'RangeError':
        return ExceptionType.RANGE_ERROR;
      default:
        break;
    }
    
    // 资源加载异常
    if (context.target && context.target.tagName) {
      switch (context.target.tagName.toLowerCase()) {
        case 'script':
          return ExceptionType.SCRIPT_LOAD_ERROR;
        case 'img':
          return ExceptionType.IMAGE_LOAD_ERROR;
        default:
          return ExceptionType.RESOURCE_LOAD_ERROR;
      }
    }
    
    // 性能相关异常
    if (error.message.includes('memory') || error.message.includes('heap')) {
      return ExceptionType.MEMORY_ERROR;
    }
    
    // 默认为 JavaScript 异常
    return ExceptionType.JAVASCRIPT_ERROR;
  }
  
  /**
   * 确定异常严重程度
   * @private
   */
  static _determineSeverity(error, context) {
    const type = this._determineExceptionType(error, context);
    
    // 关键异常
    if ([
      ExceptionType.MEMORY_ERROR,
      ExceptionType.REACT_ERROR_BOUNDARY,
      ExceptionType.UNHANDLED_PROMISE_REJECTION
    ].includes(type)) {
      return ExceptionSeverity.CRITICAL;
    }
    
    // 高严重程度异常
    if ([
      ExceptionType.NETWORK_ERROR,
      ExceptionType.HTTP_ERROR,
      ExceptionType.CORS_ERROR
    ].includes(type)) {
      return ExceptionSeverity.HIGH;
    }
    
    // 中等严重程度异常
    if ([
      ExceptionType.VALIDATION_ERROR,
      ExceptionType.RESOURCE_LOAD_ERROR,
      ExceptionType.TIMEOUT_ERROR
    ].includes(type)) {
      return ExceptionSeverity.MEDIUM;
    }
    
    // 低严重程度异常
    return ExceptionSeverity.LOW;
  }
  
  /**
   * 确定异常类别
   * @private
   */
  static _determineCategory(error, context) {
    const type = this._determineExceptionType(error, context);
    
    if ([
      ExceptionType.NETWORK_ERROR,
      ExceptionType.HTTP_ERROR,
      ExceptionType.TIMEOUT_ERROR,
      ExceptionType.CORS_ERROR
    ].includes(type)) {
      return 'NETWORK';
    }
    
    if ([
      ExceptionType.REACT_ERROR_BOUNDARY,
      ExceptionType.REACT_RENDER_ERROR,
      ExceptionType.REACT_LIFECYCLE_ERROR
    ].includes(type)) {
      return 'REACT';
    }
    
    if ([
      ExceptionType.JAVASCRIPT_ERROR,
      ExceptionType.TYPE_ERROR,
      ExceptionType.REFERENCE_ERROR,
      ExceptionType.SYNTAX_ERROR,
      ExceptionType.RANGE_ERROR
    ].includes(type)) {
      return 'JAVASCRIPT';
    }
    
    if ([
      ExceptionType.RESOURCE_LOAD_ERROR,
      ExceptionType.SCRIPT_LOAD_ERROR,
      ExceptionType.IMAGE_LOAD_ERROR
    ].includes(type)) {
      return 'RESOURCE';
    }
    
    if ([
      ExceptionType.PERFORMANCE_ERROR,
      ExceptionType.MEMORY_ERROR
    ].includes(type)) {
      return 'PERFORMANCE';
    }
    
    return 'OTHER';
  }
  
  /**
   * 判断异常是否可恢复
   * @private
   */
  static _isRecoverable(error, context) {
    const type = this._determineExceptionType(error, context);
    
    // 不可恢复的异常
    const unrecoverableTypes = [
      ExceptionType.MEMORY_ERROR,
      ExceptionType.SYNTAX_ERROR,
      ExceptionType.REFERENCE_ERROR
    ];
    
    return !unrecoverableTypes.includes(type);
  }
  
  /**
   * 评估用户影响程度
   * @private
   */
  static _assessUserImpact(error, context) {
    const severity = this._determineSeverity(error, context);
    const type = this._determineExceptionType(error, context);
    
    // 严重影响用户体验的异常
    if (severity === ExceptionSeverity.CRITICAL || [
      ExceptionType.REACT_ERROR_BOUNDARY,
      ExceptionType.NETWORK_ERROR
    ].includes(type)) {
      return 'HIGH';
    }
    
    // 中等影响
    if (severity === ExceptionSeverity.HIGH || [
      ExceptionType.RESOURCE_LOAD_ERROR,
      ExceptionType.VALIDATION_ERROR
    ].includes(type)) {
      return 'MEDIUM';
    }
    
    // 低影响
    return 'LOW';
  }
}

/**
 * 前端异常处理器主类
 */
export class FrontendExceptionHandler {
  constructor() {
    this.contextCollector = ExceptionContextCollector;
    this.classifier = FrontendExceptionClassifier;
  }
  
  /**
   * 处理异常
   * @param {Error} error - 异常对象
   * @param {Object} additionalContext - 额外上下文信息
   * @returns {Object} 处理结果
   */
  handle(error, additionalContext = {}) {
    try {
      // 收集异常上下文
      const context = this.contextCollector.collectContext(error, additionalContext);
      
      // 分类异常
      const classification = this.classifier.classify(error, context);
      
      // 构建异常记录
      const exceptionRecord = {
        id: this._generateId(),
        timestamp: new Date().toISOString(),
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        },
        context,
        classification,
        source: 'frontend'
      };
      
      return exceptionRecord;
      
    } catch (handlingError) {
      // 异常处理过程中出现异常，返回最小化的异常记录
      console.error('Exception handling failed:', handlingError);
      
      return {
        id: this._generateId(),
        timestamp: new Date().toISOString(),
        error: {
          name: error.name || 'Error',
          message: error.message || 'Unknown error',
          stack: error.stack || ''
        },
        context: { handlingError: handlingError.message },
        classification: {
          type: ExceptionType.UNKNOWN_ERROR,
          severity: ExceptionSeverity.MEDIUM,
          category: 'OTHER',
          recoverable: true,
          userImpact: 'MEDIUM'
        },
        source: 'frontend'
      };
    }
  }
  
  /**
   * 生成异常 ID
   * @private
   */
  _generateId() {
    return `fe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * 处理异常 - handleError 方法别名，用于向后兼容
   * @param {Error} error - 异常对象
   * @param {Object} additionalContext - 额外上下文信息
   * @returns {Object} 处理结果
   */
  handleError(error, additionalContext = {}) {
    return this.handle(error, additionalContext);
  }
}

// 导出单例实例
export const frontendExceptionHandler = new FrontendExceptionHandler();

// 默认导出
export default frontendExceptionHandler;
