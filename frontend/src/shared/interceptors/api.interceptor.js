/**
 * API Interceptor - API 请求/响应拦截器
 * 
 * 提供 Axios 拦截器工厂函数，用于自动记录 API 请求和响应日志。
 * 
 * Requirements: 3.1, 3.2, 3.3, 2.3, 2.4, 3.4, 10.2, 10.3
 */

import { LOG_LAYERS, generateRequestId, getTraceId } from "@shared/logger";
import { createLogger } from "@shared/hooks/useLogger";
import { frontendExceptionService } from "@shared/exception";
import { ApiErrorClassifier } from './api.error.classifier.js';
import { apiErrorRecovery } from './api.error.recovery.js';

const FILE_PATH = 'src/shared/interceptors/api.interceptor.js';
const log = createLogger(FILE_PATH);

export function createRequestInterceptor(options = {}) {
  const { skipLoggingUrls = true } = options;
  
  return (config) => {
    if (skipLoggingUrls && (config.url?.includes("/logging/") || config.url?.includes("/logs"))) {
      return config;
    }

    const traceId = getTraceId();
    const requestId = generateRequestId();
    
    config.headers["X-Trace-Id"] = traceId;
    config.headers["X-Request-Id"] = requestId;
    config._startTime = performance.now();

    try {
      log.debug(
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

export function createResponseInterceptor(options = {}) {
  const { skipLoggingUrls = true, slowApiThreshold = 2000 } = options;
  
  return (response) => {
    if (skipLoggingUrls && (
      response.config.url?.includes("/logging/") ||
      response.config.url?.includes("/logs")
    )) {
      return response;
    }

    apiErrorRecovery.cacheResponse(response.config, response);
    apiErrorRecovery.clearRetryAttempts(response.config);

    const startTime = response.config._startTime;
    const duration = startTime ? Math.round(performance.now() - startTime) : 0;

    try {
      const method = response.config.method?.toUpperCase();
      const path = response.config.url;

      const extraData = {
        request_method: method,
        request_path: path,
        response_status: response.status,
        duration_ms: duration
      };
      
      if (response.config._retryAttempt > 0) {
        extraData.retry_attempt = response.config._retryAttempt;
      }
      if (response.fromCache) {
        extraData.from_cache = true;
        if (response.isStale) extraData.is_stale = true;
      }

      log.info(LOG_LAYERS.SERVICE, `API Success: ${method} ${path}`, extraData);

      if (duration > slowApiThreshold) {
        log.warn(
          LOG_LAYERS.SERVICE,
          `Slow API Warning: ${method} ${path}`,
          {
            threshold_ms: slowApiThreshold,
            exceeded_by_ms: duration - slowApiThreshold,
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

export function createErrorInterceptor(options = {}) {
  const { skipLoggingUrls = true, enableRecovery = true } = options;
  
  return async (err) => {
    const originalRequest = err.config;

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

    const classification = ApiErrorClassifier.classify(err);

    try {
      const method = originalRequest?.method?.toUpperCase();
      const path = originalRequest?.url;
      const status = err.response?.status || 0;

      log.error(
        LOG_LAYERS.SERVICE,
        `API Failed: ${method} ${path}`,
        {
          error_message: err.message,
          error_code: err.response?.data?.error?.code || err.response?.data?.code,
          error_type: err.name,
          network_error: !err.response,
          classification: classification,
          retry_attempt: originalRequest._retryAttempt || 0,
          request_method: method,
          request_path: path,
          response_status: status,
          duration_ms: duration
        }
      );
    } catch (e) {
      console.warn("Failed to log API error:", e);
    }

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

    if (enableRecovery && (classification.recoverable || apiErrorRecovery.isOffline())) {
      try {
        const recoveryResult = await apiErrorRecovery.attemptRecovery(err, originalRequest);
        
        if (recoveryResult === null) {
          if (classification.type === 'AUTHENTICATION_ERROR') {
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

export function createApiInterceptors(options = {}) {
  return {
    request: createRequestInterceptor(options),
    response: createResponseInterceptor(options),
    error: createErrorInterceptor(options)
  };
}

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
  
  axiosInstance.interceptors.request.use(
    (config) => {
      config._axios = axiosInstance;
      return config;
    },
    (error) => Promise.reject(error)
  );
  
  return axiosInstance;
}

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
