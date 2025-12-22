/**
 * API Interceptor - API 请求/响应拦截器
 * 
 * 提供 Axios 拦截器工厂函数，用于自动记录 API 请求和响应日志。
 * 集成异常处理系统，捕获 API 请求异常，分类 API 错误类型，实现 API 错误恢复机制。
 * 
 * Features:
 * - 自动记录请求方法、路径、开始时间
 * - 自动记录响应状态、耗时
 * - 慢 API 告警（>2s）
 * - 自动添加 X-Trace-Id 和 X-Request-Id 请求头
 * - 集成异常处理系统
 * - API 错误分类和恢复机制
 * 
 * Requirements: 3.1, 3.2, 3.3, 2.3, 2.4, 3.4, 10.2, 10.3
 */

import { info, warn, error, debug, LOG_LAYERS } from "@shared/utils/logger";
import { generateRequestId, getTraceId } from "@shared/utils/logger.context";
import { frontendExceptionService } from "@shared/utils/exception.service.js";
import { authRecoveryService } from "@shared/services/auth.recovery.js";

/**
 * API 错误分类器
 */
class ApiErrorClassifier {
  static classify(error) {
    const response = error.response;
    const request = error.request;
    
    // 网络错误
    if (!response && request) {
      return {
        type: 'NETWORK_ERROR',
        category: 'NETWORK',
        recoverable: true,
        retryable: true,
        severity: 'HIGH'
      };
    }
    
    // HTTP 状态码错误
    if (response) {
      const status = response.status;
      
      if (status >= 500) {
        return {
          type: 'SERVER_ERROR',
          category: 'SERVER',
          recoverable: true,
          retryable: true,
          severity: 'HIGH'
        };
      }
      
      if (status === 429) {
        return {
          type: 'RATE_LIMIT_ERROR',
          category: 'CLIENT',
          recoverable: true,
          retryable: true,
          severity: 'MEDIUM'
        };
      }
      
      if (status === 401) {
        return {
          type: 'AUTHENTICATION_ERROR',
          category: 'AUTH',
          recoverable: true,
          retryable: false,
          severity: 'HIGH'
        };
      }
      
      if (status === 403) {
        return {
          type: 'AUTHORIZATION_ERROR',
          category: 'AUTH',
          recoverable: false,
          retryable: false,
          severity: 'HIGH'
        };
      }
      
      if (status >= 400 && status < 500) {
        return {
          type: 'CLIENT_ERROR',
          category: 'CLIENT',
          recoverable: false,
          retryable: false,
          severity: 'MEDIUM'
        };
      }
    }
    
    // 超时错误
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return {
        type: 'TIMEOUT_ERROR',
        category: 'NETWORK',
        recoverable: true,
        retryable: true,
        severity: 'MEDIUM'
      };
    }
    
    // CORS 错误
    if (error.message.includes('CORS') || error.message.includes('cross-origin')) {
      return {
        type: 'CORS_ERROR',
        category: 'NETWORK',
        recoverable: false,
        retryable: false,
        severity: 'HIGH'
      };
    }
    
    // 默认未知错误
    return {
      type: 'UNKNOWN_ERROR',
      category: 'UNKNOWN',
      recoverable: false,
      retryable: false,
      severity: 'MEDIUM'
    };
  }
}

/**
 * Enhanced API Error Recovery with Offline Support and Cache Fallback
 */
class ApiErrorRecovery {
  constructor() {
    this.retryAttempts = new Map();
    this.maxRetries = 3;
    this.retryDelays = [1000, 2000, 4000]; // 指数退避
    this.offlineMode = false;
    this.cacheStorage = new Map();
    this.offlineQueue = [];
    
    // 监听网络状态
    this.setupNetworkMonitoring();
    
    // 初始化缓存存储
    this.initializeCacheStorage();
  }
  
  /**
   * 设置网络状态监听
   */
  setupNetworkMonitoring() {
    if (typeof window !== 'undefined') {
      // 初始网络状态
      this.offlineMode = !navigator.onLine;
      
      // 监听网络状态变化
      window.addEventListener('online', () => {
        // AOP 系统会自动记录网络状态变化
        this.offlineMode = false;
        this.processOfflineQueue();
      });
      
      window.addEventListener('offline', () => {
        // AOP 系统会自动记录网络状态变化
        this.offlineMode = true;
      });
    }
  }
  
  /**
   * 初始化缓存存储
   */
  async initializeCacheStorage() {
    try {
      // 尝试从 localStorage 恢复缓存
      const cachedData = localStorage.getItem('api_cache');
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        Object.entries(parsed).forEach(([key, value]) => {
          // 检查缓存是否过期
          if (value.expiry && Date.now() < value.expiry) {
            this.cacheStorage.set(key, value);
          }
        });
      }
    } catch (error) {
      console.warn('[ApiErrorRecovery] Failed to initialize cache storage:', error);
    }
  }
  
  /**
   * 保存响应到缓存
   */
  cacheResponse(config, response) {
    try {
      // 只缓存 GET 请求
      if (config.method?.toLowerCase() !== 'get') {
        return;
      }
      
      // 只缓存成功响应
      if (response.status < 200 || response.status >= 300) {
        return;
      }
      
      const cacheKey = this.getCacheKey(config);
      const cacheData = {
        data: response.data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        timestamp: Date.now(),
        expiry: Date.now() + (config.cacheTimeout || 300000) // 默认5分钟
      };
      
      this.cacheStorage.set(cacheKey, cacheData);
      
      // 持久化到 localStorage
      this.persistCache();
      
    } catch (error) {
      console.warn('[ApiErrorRecovery] Failed to cache response:', error);
    }
  }
  
  /**
   * 从缓存获取响应
   */
  getCachedResponse(config) {
    try {
      const cacheKey = this.getCacheKey(config);
      const cached = this.cacheStorage.get(cacheKey);
      
      if (!cached) {
        return null;
      }
      
      // 检查是否过期
      if (cached.expiry && Date.now() > cached.expiry) {
        this.cacheStorage.delete(cacheKey);
        return null;
      }
      
      return {
        data: cached.data,
        status: cached.status,
        statusText: cached.statusText,
        headers: cached.headers,
        config: config,
        fromCache: true
      };
      
    } catch (error) {
      console.warn('[ApiErrorRecovery] Failed to get cached response:', error);
      return null;
    }
  }
  
  /**
   * 生成缓存键
   */
  getCacheKey(config) {
    const url = config.url || '';
    const params = config.params ? JSON.stringify(config.params) : '';
    return `${config.method}_${url}_${params}`;
  }
  
  /**
   * 持久化缓存到 localStorage
   */
  persistCache() {
    try {
      const cacheData = {};
      this.cacheStorage.forEach((value, key) => {
        cacheData[key] = value;
      });
      
      localStorage.setItem('api_cache', JSON.stringify(cacheData));
    } catch (error) {
      console.warn('[ApiErrorRecovery] Failed to persist cache:', error);
    }
  }
  
  /**
   * 添加请求到离线队列
   */
  addToOfflineQueue(config) {
    // 只队列非 GET 请求
    if (config.method?.toLowerCase() === 'get') {
      return;
    }
    
    const queueItem = {
      config: { ...config },
      timestamp: Date.now(),
      id: Math.random().toString(36).substr(2, 9)
    };
    
    this.offlineQueue.push(queueItem);
    
    // 限制队列大小
    if (this.offlineQueue.length > 50) {
      this.offlineQueue.shift();
    }
    
    // AOP 系统会自动记录离线队列操作
  }
  
  /**
   * 处理离线队列
   */
  async processOfflineQueue() {
    if (this.offlineQueue.length === 0) {
      return;
    }
    
    // AOP 系统会自动记录离线队列处理
    
    const queue = [...this.offlineQueue];
    this.offlineQueue = [];
    
    for (const item of queue) {
      try {
        // 检查请求是否过期（超过1小时）
        if (Date.now() - item.timestamp > 3600000) {
          console.warn(`[ApiErrorRecovery] Skipping expired offline request: ${item.config.method} ${item.config.url}`);
          continue;
        }
        
        // 重新发送请求
        if (item.config._axios) {
          await item.config._axios(item.config);
          // AOP 系统会自动记录请求成功
        }
        
      } catch (error) {
        console.warn(`[ApiErrorRecovery] Failed to process offline request: ${item.config.method} ${item.config.url}`, error);
        
        // 如果仍然失败，重新加入队列（最多重试3次）
        if (!item.retryCount || item.retryCount < 3) {
          item.retryCount = (item.retryCount || 0) + 1;
          this.offlineQueue.push(item);
        }
      }
      
      // 添加延迟避免过快请求
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  async attemptRecovery(error, config) {
    const classification = ApiErrorClassifier.classify(error);
    
    // 离线模式处理
    if (this.offlineMode || classification.type === 'NETWORK_ERROR') {
      return this.handleOfflineError(error, config);
    }
    
    if (!classification.recoverable) {
      return null;
    }
    
    // 认证错误恢复
    if (classification.type === 'AUTHENTICATION_ERROR') {
      return this.handleAuthError(error, config);
    }
    
    // 可重试错误恢复
    if (classification.retryable) {
      return this.handleRetryableError(error, config);
    }
    
    return null;
  }
  
  /**
   * 处理离线错误
   */
  async handleOfflineError(error, config) {
    // 对于 GET 请求，尝试从缓存获取数据
    if (config.method?.toLowerCase() === 'get') {
      const cachedResponse = this.getCachedResponse(config);
      if (cachedResponse) {
        // AOP 系统会自动记录缓存命中
        return Promise.resolve(cachedResponse);
      }
    }
    
    // 对于非 GET 请求，添加到离线队列
    this.addToOfflineQueue(config);
    
    // 返回离线错误
    const offlineError = new Error('Application is offline. Request has been queued for when connection is restored.');
    offlineError.isOfflineError = true;
    offlineError.originalError = error;
    
    return Promise.reject(offlineError);
  }
  
  async handleAuthError(error, config) {
    try {
      // Use专门的认证恢复服务
      return await authRecoveryService.handleAuthError(error, config);
    } catch (recoveryError) {
      // 如果是401错误且是/api/auth/me请求，不抛出异常，减少日志噪音
      if (error?.response?.status === 401 && config?.url?.includes('/api/auth/me')) {
        console.log('[ApiInterceptor] Auth validation failed, clearing auth state');
        return null; // 返回null而不是抛出异常
      }
      // 其他情况继续抛出异常
      throw recoveryError;
    }
  }
  
  async handleRetryableError(error, config) {
    const requestKey = `${config.method}_${config.url}`;
    const attempts = this.retryAttempts.get(requestKey) || 0;
    
    if (attempts >= this.maxRetries) {
      this.retryAttempts.delete(requestKey);
      
      // 最后尝试从缓存获取数据（如果是 GET 请求）
      if (config.method?.toLowerCase() === 'get') {
        const cachedResponse = this.getCachedResponse(config);
        if (cachedResponse) {
          // AOP 系统会自动记录缓存使用
          cachedResponse.isStale = true;
          return Promise.resolve(cachedResponse);
        }
      }
      
      return null;
    }
    
    // 增加重试次数
    this.retryAttempts.set(requestKey, attempts + 1);
    
    // 等待重试延迟
    const delay = this.retryDelays[attempts] || 1000;
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // 添加重试标记
    config._retryAttempt = attempts + 1;
    
    return config;
  }
  
  clearRetryAttempts(config) {
    const requestKey = `${config.method}_${config.url}`;
    this.retryAttempts.delete(requestKey);
  }
  
  /**
   * 获取离线状态
   */
  isOffline() {
    return this.offlineMode;
  }
  
  /**
   * 获取离线队列状态
   */
  getOfflineQueueStatus() {
    return {
      queueLength: this.offlineQueue.length,
      isOffline: this.offlineMode,
      cacheSize: this.cacheStorage.size
    };
  }
  
  /**
   * 清理过期缓存
   */
  cleanupExpiredCache() {
    const now = Date.now();
    const expiredKeys = [];
    
    this.cacheStorage.forEach((value, key) => {
      if (value.expiry && now > value.expiry) {
        expiredKeys.push(key);
      }
    });
    
    expiredKeys.forEach(key => {
      this.cacheStorage.delete(key);
    });
    
    if (expiredKeys.length > 0) {
      this.persistCache();
      // AOP 系统会自动记录缓存清理
    }
  }
}

// 全局错误恢复器实例
const apiErrorRecovery = new ApiErrorRecovery();

// 定期清理过期缓存
if (typeof window !== 'undefined') {
  setInterval(() => {
    apiErrorRecovery.cleanupExpiredCache();
  }, 300000); // 每5分钟清理一次
}

/**
 * 创建请求拦截器
 * @param {Object} options - 配置选项
 * @param {boolean} options.skipLoggingUrls - 是否跳过日志相关的 URL
 * @returns {Function} Axios 请求拦截器函数
 */
export function createRequestInterceptor(options = {}) {
  const { skipLoggingUrls = true } = options;
  
  return (config) => {
    // 防止无限循环：跳过日志请求本身
    if (skipLoggingUrls && (config.url?.includes("/logging/") || config.url?.includes("/logs"))) {
      return config;
    }

    // 添加追踪和请求头用于关联
    const traceId = getTraceId();
    const requestId = generateRequestId();
    
    config.headers["X-Trace-Id"] = traceId;
    config.headers["X-Request-Id"] = requestId;

    // 开始计时用于耗时追踪
    config._startTime = performance.now();

    // 记录请求开始 - Requirements 3.1
    try {
      debug(
        LOG_LAYERS.SERVICE,
        `API Request: ${config.method?.toUpperCase()} ${config.url}`,
        {
          request_method: config.method?.toUpperCase(),
          request_path: config.url,
          headers: {
            "X-Trace-Id": traceId,
            "X-Request-Id": requestId
          },
          base_url: config.baseURL,
          timeout: config.timeout,
          retry_attempt: config._retryAttempt || 0
        }
      );
    } catch (e) {
      // 忽略日志记录错误
      console.warn("Failed to log API request:", e);
    }

    return config;
  };
}

/**
 * 创建响应拦截器
 * @param {Object} options - 配置选项
 * @param {boolean} options.skipLoggingUrls - 是否跳过日志相关的 URL
 * @param {number} options.slowApiThreshold - 慢 API 阈值（毫秒），默认 2000ms
 * @returns {Function} Axios 响应拦截器函数
 */
export function createResponseInterceptor(options = {}) {
  const { skipLoggingUrls = true, slowApiThreshold = 2000 } = options;
  
  return (response) => {
    // 跳过日志请求
    if (skipLoggingUrls && (
      response.config.url?.includes("/logging/") ||
      response.config.url?.includes("/logs")
    )) {
      return response;
    }

    // 缓存成功响应
    apiErrorRecovery.cacheResponse(response.config, response);

    // 成功响应时清除重试记录
    apiErrorRecovery.clearRetryAttempts(response.config);

    // 计算耗时
    const startTime = response.config._startTime;
    const duration = startTime ? Math.round(performance.now() - startTime) : 0;

    // 从请求头提取追踪 ID
    const traceId = response.config.headers["X-Trace-Id"];
    const requestId = response.config.headers["X-Request-Id"];

    // 记录成功响应 - Requirements 3.2
    try {
      const method = response.config.method?.toUpperCase();
      const path = response.config.url;

      info(
        LOG_LAYERS.SERVICE,
        `API Success: ${method} ${path}`,
        {
          request_method: method,
          request_path: path,
          response_status: response.status,
          duration_ms: duration,
          response_headers: response.headers,
          response_size: response.data ? JSON.stringify(response.data).length : 0,
          status_text: response.statusText,
          retry_attempt: response.config._retryAttempt || 0,
          from_cache: response.fromCache || false,
          is_stale: response.isStale || false
        }
      );

      // 慢 API 告警 - Requirements 3.3: > 2 seconds
      if (duration > slowApiThreshold) {
        warn(
          LOG_LAYERS.SERVICE,
          `Slow API Warning: ${method} ${path}`,
          {
            request_method: method,
            request_path: path,
            duration_ms: duration,
            response_status: response.status,
            performance_issue: "SLOW_API",
            threshold_ms: slowApiThreshold,
            exceeded_by_ms: duration - slowApiThreshold
          }
        );
      }
    } catch (e) {
      // 忽略日志记录错误
      console.warn("Failed to log API response:", e);
    }

    return response;
  };
}

/**
 * 创建错误拦截器
 * @param {Object} options - 配置选项
 * @param {boolean} options.skipLoggingUrls - 是否跳过日志相关的 URL
 * @param {boolean} options.enableRecovery - 是否启用错误恢复，默认 true
 * @returns {Function} Axios 错误拦截器函数
 */
export function createErrorInterceptor(options = {}) {
  const { skipLoggingUrls = true, enableRecovery = true } = options;
  
  return async (err) => {
    const originalRequest = err.config;

    // 跳过日志请求失败以防止循环
    if (skipLoggingUrls && (
      originalRequest?.url?.includes("/logging/") ||
      originalRequest?.url?.includes("/logs")
    )) {
      return Promise.reject(err);
    }

    const duration = originalRequest?._startTime
      ? Math.round(performance.now() - originalRequest._startTime)
      : 0;

    // 从请求头提取追踪 ID
    const traceId = originalRequest?.headers["X-Trace-Id"];
    const requestId = originalRequest?.headers["X-Request-Id"];

    // 分类错误
    const classification = ApiErrorClassifier.classify(err);

    // 记录 API 错误
    try {
      const method = originalRequest?.method?.toUpperCase();
      const path = originalRequest?.url;
      const status = err.response?.status || 0;

      error(
        LOG_LAYERS.SERVICE,
        `API Failed: ${method} ${path}`,
        {
          request_method: method,
          request_path: path,
          response_status: status,
          duration_ms: duration,
          error_message: err.message,
          error_code: err.response?.data?.code,
          error_details: err.response?.data?.details,
          error_type: err.name,
          network_error: !err.response,
          classification: classification,
          retry_attempt: originalRequest._retryAttempt || 0
        }
      );
    } catch (e) {
      // 忽略日志记录错误
      console.warn("Failed to log API error:", e);
    }

    // 报告异常到异常服务 - Requirements 3.4, 10.2, 10.3
    try {
      const context = {
        type: 'api-error',
        api: {
          method: originalRequest?.method?.toUpperCase(),
          url: originalRequest?.url,
          baseURL: originalRequest?.baseURL,
          timeout: originalRequest?.timeout,
          retryAttempt: originalRequest._retryAttempt || 0
        },
        response: err.response ? {
          status: err.response.status,
          statusText: err.response.statusText,
          data: err.response.data,
          headers: err.response.headers
        } : null,
        request: {
          headers: originalRequest?.headers,
          data: originalRequest?.data
        },
        classification: classification,
        duration_ms: duration,
        trace_id: traceId,
        request_id: requestId,
        timestamp: new Date().toISOString()
      };

      // 异步报告异常，不阻塞错误处理
      frontendExceptionService.reportException(err, context).catch(reportError => {
        console.warn('[ApiInterceptor] Failed to report API exception:', reportError);
      });

    } catch (reportError) {
      console.warn('[ApiInterceptor] Failed to report API exception:', reportError);
    }

    // 尝试错误恢复 - Requirements 10.2, 10.4
    if (enableRecovery && (classification.recoverable || apiErrorRecovery.isOffline())) {
      try {
        const recoveryResult = await apiErrorRecovery.attemptRecovery(err, originalRequest);
        
        // 如果恢复返回null，表示应该优雅地处理错误
        if (recoveryResult === null) {
          // 对于认证错误，返回一个特殊的响应而不是抛出异常
          if (classification.type === 'AUTHENTICATION_ERROR') {
            return Promise.resolve({
              data: null,
              status: err.response?.status || 401,
              statusText: 'Authentication failed',
              headers: {},
              config: originalRequest,
              _authFailed: true
            });
          }
        }
        
        if (recoveryResult && recoveryResult.then) {
          // 如果返回 Promise，直接返回
          return recoveryResult;
        }
        
        if (recoveryResult && recoveryResult._recoveryConfig) {
          // 如果返回恢复配置，让调用者处理
          return Promise.resolve(recoveryResult);
        }
        
        if (recoveryResult) {
          // 使用 axios 实例重新发送请求
          if (originalRequest._axios) {
            return originalRequest._axios(recoveryResult);
          }
          
          // 如果没有 axios 实例，返回恢复配置让调用者处理
          return Promise.resolve({ _recoveryConfig: recoveryResult });
        }
      } catch (recoveryError) {
        // 检查是否是离线错误
        if (recoveryError.isOfflineError) {
          // 对于离线错误，提供更友好的错误信息
          const offlineErr = new Error('网络连接不可用，请检查您的网络连接。请求已加入队列，连接恢复后将自动重试。');
          offlineErr.isOfflineError = true;
          offlineErr.originalError = err;
          offlineErr.queueStatus = apiErrorRecovery.getOfflineQueueStatus();
          return Promise.reject(offlineErr);
        }
        
        console.warn('[ApiInterceptor] Error recovery failed:', recoveryError);
        
        // 报告恢复失败
        frontendExceptionService.reportException(recoveryError, {
          type: 'api-recovery-error',
          originalError: err.message,
          classification: classification,
          offlineStatus: apiErrorRecovery.getOfflineQueueStatus()
        }).catch(() => {});
      }
    }

    return Promise.reject(err);
  };
}

/**
 * 创建完整的 API 拦截器配置
 * @param {Object} options - 配置选项
 * @returns {Object} 包含请求和响应拦截器的对象
 */
export function createApiInterceptors(options = {}) {
  return {
    request: createRequestInterceptor(options),
    response: createResponseInterceptor(options),
    error: createErrorInterceptor(options)
  };
}

/**
 * 为 Axios 实例安装拦截器
 * @param {Object} axiosInstance - Axios 实例
 * @param {Object} options - 配置选项
 */
export function installApiInterceptors(axiosInstance, options = {}) {
  const interceptors = createApiInterceptors(options);
  
  // 安装请求拦截器
  axiosInstance.interceptors.request.use(
    interceptors.request,
    (error) => Promise.reject(error)
  );
  
  // 安装响应拦截器
  axiosInstance.interceptors.response.use(
    interceptors.response,
    interceptors.error
  );
  
  // 为错误恢复提供 axios 实例引用
  axiosInstance.interceptors.request.use(
    (config) => {
      config._axios = axiosInstance;
      return config;
    },
    (error) => Promise.reject(error)
  );
  
  return axiosInstance;
}

export default {
  createRequestInterceptor,
  createResponseInterceptor,
  createErrorInterceptor,
  createApiInterceptors,
  installApiInterceptors,
  ApiErrorClassifier,
  ApiErrorRecovery,
  apiErrorRecovery // 导出全局实例以便外部访问
};