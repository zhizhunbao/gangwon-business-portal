/**
 * API Interceptor - API 请求/响应拦截器
 * 
 * 提供 Axios 拦截器工厂函数，用于自动记录 API 请求和响应日志。
 * 
 * Features:
 * - 自动记录请求方法、路径、开始时间
 * - 自动记录响应状态、耗时
 * - 慢 API 告警（>2s）
 * - 自动添加 X-Trace-Id 和 X-Request-Id 请求头
 * - 集成异常处理系统
 * 
 * Requirements: 3.1, 3.2, 3.3, 2.3, 2.4, 3.4, 10.2, 10.3
 */

import { info, warn, error, debug, LOG_LAYERS, generateRequestId, getTraceId } from "@shared/logger";
import { frontendExceptionService } from "@shared/exception";
import { ApiErrorClassifier } from './api.error.classifier.js';
import { apiErrorRecovery } from './api.error.recovery.js';

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

    // 记录请求开始
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

    // 记录成功响应
    try {
      const method = response.config.method?.toUpperCase();
      const path = response.config.url;

      info(
        LOG_LAYERS.SERVICE,
        `API Success: ${method} ${path}`,
        {
          response_size: response.data ? JSON.stringify(response.data).length : 0,
          status_text: response.statusText,
          retry_attempt: response.config._retryAttempt || 0,
          from_cache: response.fromCache || false,
          is_stale: response.isStale || false
        },
        {
          request_method: method,
          request_path: path,
          response_status: response.status,
          duration_ms: duration
        }
      );

      // 慢 API 告警
      if (duration > slowApiThreshold) {
        warn(
          LOG_LAYERS.SERVICE,
          `Slow API Warning: ${method} ${path}`,
          {
            performance_issue: "SLOW_API",
            threshold_ms: slowApiThreshold,
            exceeded_by_ms: duration - slowApiThreshold
          },
          {
            request_method: method,
            request_path: path,
            response_status: response.status,
            duration_ms: duration
          }
        );
      }
    } catch (e) {
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
          error_message: err.message,
          error_code: err.response?.data?.error?.code || err.response?.data?.code,
          error_type: err.name,
          network_error: !err.response,
          classification: classification,
          retry_attempt: originalRequest._retryAttempt || 0
        },
        {
          request_method: method,
          request_path: path,
          response_status: status,
          duration_ms: duration
        }
      );
    } catch (e) {
      console.warn("Failed to log API error:", e);
    }

    // 报告异常到异常服务
    try {
      const context = {
        type: 'api-error',
        api: {
          method: originalRequest?.method?.toUpperCase(),
          url: originalRequest?.url,
          retryAttempt: originalRequest._retryAttempt || 0
        },
        response: err.response ? {
          status: err.response.status,
          statusText: err.response.statusText,
          data: err.response.data
        } : null,
        classification: classification,
        duration_ms: duration,
        trace_id: traceId,
        request_id: requestId
      };

      frontendExceptionService.reportException(err, context).catch(reportError => {
        console.warn('[ApiInterceptor] Failed to report API exception:', reportError);
      });

    } catch (reportError) {
      console.warn('[ApiInterceptor] Failed to report API exception:', reportError);
    }

    // 尝试错误恢复
    if (enableRecovery && (classification.recoverable || apiErrorRecovery.isOffline())) {
      try {
        const recoveryResult = await apiErrorRecovery.attemptRecovery(err, originalRequest);
        
        if (recoveryResult === null) {
          if (classification.type === 'AUTHENTICATION_ERROR') {
            // 认证失败但已处理（如显示登录模态框），返回一个空响应而不是 reject
            return Promise.resolve({
              data: null,
              status: err.response?.status || 401,
              statusText: 'Authentication required',
              headers: {},
              config: originalRequest,
              _authFailed: true
            });
          }
        }
        
        if (recoveryResult && recoveryResult.then) {
          return recoveryResult;
        }
        
        if (recoveryResult && recoveryResult._recoveryConfig) {
          return Promise.resolve(recoveryResult);
        }
        
        if (recoveryResult) {
          if (originalRequest._axios) {
            return originalRequest._axios(recoveryResult);
          }
          return Promise.resolve({ _recoveryConfig: recoveryResult });
        }
      } catch (recoveryError) {
        if (recoveryError.isOfflineError) {
          const offlineErr = new Error('网络连接不可用，请检查您的网络连接。');
          offlineErr.isOfflineError = true;
          offlineErr.originalError = err;
          offlineErr.queueStatus = apiErrorRecovery.getStatus();
          return Promise.reject(offlineErr);
        }
        
        console.warn('[ApiInterceptor] Error recovery failed:', recoveryError);
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
  
  axiosInstance.interceptors.request.use(
    interceptors.request,
    (error) => Promise.reject(error)
  );
  
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

// 导出依赖模块供外部使用
export { ApiErrorClassifier } from './api.error.classifier.js';
export { apiErrorRecovery } from './api.error.recovery.js';
export { apiCache } from './api.cache.js';
export { apiOfflineQueue } from './api.offline.js';

export default {
  createRequestInterceptor,
  createResponseInterceptor,
  createErrorInterceptor,
  createApiInterceptors,
  installApiInterceptors
};
