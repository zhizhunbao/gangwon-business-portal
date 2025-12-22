/**
 * Auth Interceptor - 认证拦截器
 * 
 * 提供认证相关的拦截和装饰器功能，包括：
 * 1. 原有的认证装饰器功能 (createAuthInterceptor, applyAuthInterceptor等)
 * 2. 新的AOP认证拦截器功能 (自动日志记录)
 * 
 * Features:
 * - 认证方法装饰器
 * - 拦截认证服务调用
 * - 记录登录/登出操作
 * - 监控权限检查
 * - 自动会话管理日志
 * - 敏感信息过滤
 * 
 * Requirements: 3.5, 4.3, 4.4
 */

import { info, warn, error, debug, LOG_LAYERS } from "@shared/utils/logger";
import { generateRequestId } from '@shared/utils/logger.context';

// ============================================================================
// 原有的认证装饰器功能 (Requirements 3.5)
// ============================================================================

/**
 * 认证方法枚举
 */
export const AUTH_METHODS = {
  LOGIN: 'login',
  LOGOUT: 'logout',
  REGISTER: 'register',
  REFRESH_TOKEN: 'refreshToken',
  VERIFY_TOKEN: 'verifyToken',
  CHANGE_PASSWORD: 'changePassword',
  RESET_PASSWORD: 'resetPassword'
};

/**
 * 创建认证拦截器
 * @param {Function} authMethod - 认证方法
 * @param {Object} options - 配置选项
 * @returns {Function} 拦截后的方法
 */
export function createAuthInterceptor(authMethod, options = {}) {
  const {
    enableLogging = true,
    logLevel = 'info',
    methodName = 'unknown'
  } = options;

  return async function interceptedAuthMethod(...args) {
    const startTime = performance.now();
    
    if (enableLogging) {
      const logMessage = `Auth Method Start: ${methodName}`;
      const logData = {
        method_name: methodName,
        args_count: args.length,
        timestamp: new Date().toISOString()
      };
      
      if (logLevel === 'info') {
        info(LOG_LAYERS.AUTH, logMessage, logData);
      } else {
        warn(LOG_LAYERS.AUTH, logMessage, logData);
      }
    }

    try {
      const result = await authMethod.apply(this, args);
      
      if (enableLogging) {
        const executionTime = Math.round(performance.now() - startTime);
        info(LOG_LAYERS.AUTH, `Auth Method Success: ${methodName}`, {
          method_name: methodName,
          execution_time_ms: executionTime,
          timestamp: new Date().toISOString()
        });
      }
      
      return result;
    } catch (authError) {
      if (enableLogging) {
        const executionTime = Math.round(performance.now() - startTime);
        error(LOG_LAYERS.AUTH, `Auth Method Error: ${methodName}`, {
          method_name: methodName,
          execution_time_ms: executionTime,
          error_message: authError.message,
          timestamp: new Date().toISOString()
        });
      }
      
      throw authError;
    }
  };
}

/**
 * 应用认证拦截器到服务
 * @param {Object} authService - 认证服务对象
 * @param {Object} options - 配置选项
 * @returns {Object} 拦截后的服务
 */
export function applyAuthInterceptor(authService, options = {}) {
  const { enableLogging = true } = options;
  
  if (!authService || typeof authService !== 'object') {
    console.warn('[AuthInterceptor] Invalid auth service object');
    return authService;
  }

  const interceptedService = {};
  
  // Copy all non-function properties first
  Object.keys(authService).forEach(key => {
    if (typeof authService[key] !== 'function') {
      interceptedService[key] = authService[key];
    }
  });
  
  // Get all methods including prototype methods
  const allMethods = [];
  let obj = authService;
  while (obj && obj !== Object.prototype) {
    Object.getOwnPropertyNames(obj).forEach(name => {
      if (typeof authService[name] === 'function' && name !== 'constructor') {
        allMethods.push(name);
      }
    });
    obj = Object.getPrototypeOf(obj);
  }
  
  // Intercept all function methods (including prototype methods)
  [...new Set(allMethods)].forEach(methodName => {
    if (typeof authService[methodName] === 'function') {
      interceptedService[methodName] = createAuthInterceptor(
        authService[methodName].bind(authService),
        { ...options, methodName, enableLogging }
      );
    }
  });

  if (enableLogging) {
    info(LOG_LAYERS.AUTH, 'Auth Service Interceptor Applied', {
      service_methods: [...new Set(allMethods)],
      timestamp: new Date().toISOString()
    });
  }

  return interceptedService;
}

/**
 * 认证方法装饰器
 * @param {string} methodName - 方法名称
 * @param {Object} options - 配置选项
 * @returns {Function} 装饰器函数
 */
export function authMethodDecorator(methodName, options = {}) {
  return function (target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = createAuthInterceptor(originalMethod, {
      ...options,
      methodName: methodName || propertyKey
    });
    
    return descriptor;
  };
}

// ============================================================================
// 新的AOP认证拦截器功能 (Requirements 4.3, 4.4)
// ============================================================================

// 拦截器状态
let isInstalled = false;

// 认证统计信息
const authStats = {
  totalOperations: 0,
  operationsByType: {},
  slowOperations: [],
  errors: [],
  sessions: []
};

// 已拦截的认证服务
const interceptedAuthServices = new WeakSet();

// 敏感字段列表
const SENSITIVE_FIELDS = [
  'password', 'token', 'secret', 'key', 'auth', 'credential',
  'refresh_token', 'access_token', 'jwt', 'session_id', 'api_key'
];

/**
 * 过滤敏感信息
 * @param {any} data - 要过滤的数据
 * @returns {any} 过滤后的数据
 */
function sanitizeAuthData(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  try {
    const sanitizeObject = (obj) => {
      if (!obj || typeof obj !== 'object') return obj;
      
      const result = Array.isArray(obj) ? [] : {};
      
      for (const key in obj) {
        const lowerKey = key.toLowerCase();
        const isSensitive = SENSITIVE_FIELDS.some(field => lowerKey.includes(field));
        
        if (isSensitive) {
          result[key] = '[FILTERED]';
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          result[key] = sanitizeObject(obj[key]);
        } else {
          result[key] = obj[key];
        }
      }
      
      return result;
    };

    return sanitizeObject(data);
  } catch (error) {
    return { _error: "Failed to sanitize auth data" };
  }
}

/**
 * 创建认证操作拦截器
 * @param {string} serviceName - 服务名称
 * @param {string} methodName - 方法名称
 * @param {Function} originalMethod - 原始方法
 * @returns {Function} 拦截后的方法
 */
function createAuthMethodInterceptor(serviceName, methodName, originalMethod) {
  return function interceptedAuthMethod(...args) {
    const startTime = performance.now();
    const operationId = generateRequestId();
    
    // 更新统计信息
    authStats.totalOperations++;
    const operationKey = `${serviceName}.${methodName}`;
    authStats.operationsByType[operationKey] = (authStats.operationsByType[operationKey] || 0) + 1;
    
    try {
      // 过滤敏感参数
      const sanitizedArgs = args.map(arg => sanitizeAuthData(arg));
      
      // 记录操作开始
      debug(LOG_LAYERS.AUTH, `Auth Operation Start: ${serviceName}.${methodName}`, {
        service_name: serviceName,
        method_name: methodName,
        operation_id: operationId,
        args_count: args.length,
        sanitized_args: sanitizedArgs,
        timestamp: new Date().toISOString()
      });
      
      // 执行原始方法
      const result = originalMethod.apply(this, args);
      
      // 如果是Promise，拦截异步结果
      if (result && typeof result.then === 'function') {
        return result
          .then(asyncResult => {
            const executionTime = Math.round(performance.now() - startTime);
            const sanitizedResult = sanitizeAuthData(asyncResult);
            
            // 记录成功结果
            const logData = {
              service_name: serviceName,
              method_name: methodName,
              operation_id: operationId,
              execution_time_ms: executionTime,
              sanitized_result: sanitizedResult,
              timestamp: new Date().toISOString()
            };
            
            // 检查慢操作
            if (executionTime > 2000) { // 2秒阈值
              warn(LOG_LAYERS.AUTH, `Slow Auth Operation: ${serviceName}.${methodName}`, {
                ...logData,
                performance_issue: 'SLOW_AUTH_OPERATION',
                threshold_ms: 2000
              });
              
              authStats.slowOperations.push({
                serviceName,
                methodName,
                executionTime,
                timestamp: new Date().toISOString()
              });
            } else {
              debug(LOG_LAYERS.AUTH, `Auth Operation Complete: ${serviceName}.${methodName}`, logData);
            }
            
            // 特殊处理登录成功
            if (methodName.toLowerCase().includes('login') && asyncResult) {
              info(LOG_LAYERS.AUTH, `User Login Success: ${serviceName}`, {
                service_name: serviceName,
                method_name: methodName,
                user_info: sanitizeAuthData(asyncResult.user || asyncResult),
                session_start: new Date().toISOString()
              });
              
              authStats.sessions.push({
                type: 'login',
                timestamp: new Date().toISOString(),
                executionTime
              });
            }
            
            // 特殊处理登出
            if (methodName.toLowerCase().includes('logout')) {
              info(LOG_LAYERS.AUTH, `User Logout: ${serviceName}`, {
                service_name: serviceName,
                method_name: methodName,
                session_end: new Date().toISOString()
              });
              
              authStats.sessions.push({
                type: 'logout',
                timestamp: new Date().toISOString(),
                executionTime
              });
            }
            
            return asyncResult;
          })
          .catch(asyncError => {
            const executionTime = Math.round(performance.now() - startTime);
            
            // 记录认证错误
            warn(LOG_LAYERS.AUTH, `Auth Operation Error: ${serviceName}.${methodName}`, {
              service_name: serviceName,
              method_name: methodName,
              operation_id: operationId,
              execution_time_ms: executionTime,
              error_message: asyncError.message,
              error_type: asyncError.name || 'AuthError',
              error_code: asyncError.code,
              timestamp: new Date().toISOString()
            });
            
            authStats.errors.push({
              serviceName,
              methodName,
              error: asyncError.message,
              errorCode: asyncError.code,
              timestamp: new Date().toISOString()
            });
            
            // 特殊处理登录失败
            if (methodName.toLowerCase().includes('login')) {
              warn(LOG_LAYERS.AUTH, `User Login Failed: ${serviceName}`, {
                service_name: serviceName,
                method_name: methodName,
                error_message: asyncError.message,
                error_code: asyncError.code,
                timestamp: new Date().toISOString()
              });
            }
            
            throw asyncError;
          });
      } else {
        // 同步结果处理
        const executionTime = Math.round(performance.now() - startTime);
        const sanitizedResult = sanitizeAuthData(result);
        
        debug(LOG_LAYERS.AUTH, `Auth Operation Complete: ${serviceName}.${methodName}`, {
          service_name: serviceName,
          method_name: methodName,
          operation_id: operationId,
          execution_time_ms: executionTime,
          sanitized_result: sanitizedResult,
          timestamp: new Date().toISOString()
        });
        
        return result;
      }
      
    } catch (error) {
      const executionTime = Math.round(performance.now() - startTime);
      
      // 记录同步错误
      warn(LOG_LAYERS.AUTH, `Auth Operation Error: ${serviceName}.${methodName}`, {
        service_name: serviceName,
        method_name: methodName,
        operation_id: operationId,
        execution_time_ms: executionTime,
        error_message: error.message,
        error_type: error.name || 'AuthError',
        timestamp: new Date().toISOString()
      });
      
      authStats.errors.push({
        serviceName,
        methodName,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  };
}

/**
 * 拦截认证服务
 * @param {Object} authService - 认证服务对象
 * @param {string} serviceName - 服务名称
 * @returns {Object} 拦截后的服务
 */
export function interceptAuthService(authService, serviceName) {
  if (!authService || typeof authService !== 'object') {
    console.warn(`[AuthInterceptor] Invalid auth service object for ${serviceName}`);
    return authService;
  }
  
  if (interceptedAuthServices.has(authService)) {
    return authService;
  }
  
  if (!isInstalled) {
    console.warn('[AuthInterceptor] Not installed, call installAuthInterceptor() first');
    return authService;
  }
  
  try {
    const interceptedService = { ...authService };
    
    // 拦截所有方法
    Object.keys(authService).forEach(key => {
      const value = authService[key];
      
      if (typeof value === 'function') {
        interceptedService[key] = createAuthMethodInterceptor(serviceName, key, value.bind(authService));
      }
    });
    
    interceptedAuthServices.add(interceptedService);
    
    info(LOG_LAYERS.AUTH, `Auth Service Intercepted: ${serviceName}`, {
      service_name: serviceName,
      methods_count: Object.keys(authService).filter(k => typeof authService[k] === 'function').length,
      timestamp: new Date().toISOString()
    });
    
    return interceptedService;
  } catch (error) {
    console.error(`[AuthInterceptor] Failed to intercept auth service ${serviceName}:`, error);
    return authService;
  }
}

/**
 * 安装认证拦截器
 * @returns {boolean} 是否安装成功
 */
export function installAuthInterceptor() {
  if (isInstalled) {
    console.warn('[AuthInterceptor] Already installed');
    return false;
  }
  
  try {
    isInstalled = true;
    
    // 只在开发环境且启用调试日志时显示安装成功信息
    if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_AOP_DEBUG_LOGS === 'true') {
      console.log('[AuthInterceptor] Installed successfully');
    }
    
    return true;
  } catch (error) {
    console.error('[AuthInterceptor] Failed to install:', error);
    return false;
  }
}

/**
 * 卸载认证拦截器
 * @returns {boolean} 是否卸载成功
 */
export function uninstallAuthInterceptor() {
  if (!isInstalled) {
    console.warn('[AuthInterceptor] Not installed');
    return false;
  }
  
  try {
    isInstalled = false;
    interceptedAuthServices.clear?.();
    
    if (import.meta.env.DEV) {
      console.log('[AuthInterceptor] Uninstalled successfully');
    }
    
    return true;
  } catch (error) {
    console.error('[AuthInterceptor] Failed to uninstall:', error);
    return false;
  }
}

/**
 * 检查拦截器是否已安装
 * @returns {boolean} 是否已安装
 */
export function isAuthInterceptorInstalled() {
  return isInstalled;
}

/**
 * 获取认证统计信息
 * @returns {Object} 统计信息
 */
export function getAuthInterceptorStats() {
  return {
    isInstalled,
    totalOperations: authStats.totalOperations,
    operationsByType: { ...authStats.operationsByType },
    slowOperationsCount: authStats.slowOperations.length,
    errorsCount: authStats.errors.length,
    sessionsCount: authStats.sessions.length,
    recentSlowOperations: authStats.slowOperations.slice(-5),
    recentErrors: authStats.errors.slice(-5),
    recentSessions: authStats.sessions.slice(-10)
  };
}

/**
 * 重置认证统计信息
 */
export function resetAuthInterceptorStats() {
  authStats.totalOperations = 0;
  authStats.operationsByType = {};
  authStats.slowOperations = [];
  authStats.errors = [];
  authStats.sessions = [];
}

// 默认导出
export default {
  install: installAuthInterceptor,
  uninstall: uninstallAuthInterceptor,
  isInstalled: isAuthInterceptorInstalled,
  intercept: interceptAuthService,
  getStats: getAuthInterceptorStats,
  resetStats: resetAuthInterceptorStats
};