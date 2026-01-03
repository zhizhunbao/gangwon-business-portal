/**
 * Auth Interceptor - 认证拦截器
 * 
 * 提供认证相关的拦截和装饰器功能
 * 
 * Requirements: 3.5, 4.3, 4.4
 */

import { LOG_LAYERS, generateRequestId } from "@shared/logger";
import { createLogger } from "@shared/hooks/useLogger";
import { getLayerLogLevel } from '@shared/logger/config';

const FILE_PATH = 'src/shared/interceptors/auth.interceptor.js';
const log = createLogger(FILE_PATH);

// 从配置文件获取 Auth 层日志级别
const authLogLevel = getLayerLogLevel('auth');
const logFn = authLogLevel === 'DEBUG' ? log.debug.bind(log) : log.info.bind(log);

// ============================================================================
// 原有的认证装饰器功能 (Requirements 3.5)
// ============================================================================

export const AUTH_METHODS = {
  LOGIN: 'login',
  LOGOUT: 'logout',
  REGISTER: 'register',
  REFRESH_TOKEN: 'refreshToken',
  VERIFY_TOKEN: 'verifyToken',
  CHANGE_PASSWORD: 'changePassword',
  RESET_PASSWORD: 'resetPassword'
};

export function createAuthInterceptor(authMethod, options = {}) {
  const {
    enableLogging = true,
    methodName = 'unknown'
  } = options;

  return async function interceptedAuthMethod(...args) {
    const startTime = performance.now();
    
    if (enableLogging) {
      logFn(LOG_LAYERS.AUTH, `Auth: ${methodName} PENDING`, {
        method_name: methodName,
        args_count: args.length,
        result: 'PENDING'
      });
    }

    try {
      const result = await authMethod.apply(this, args);
      
      if (enableLogging) {
        const executionTime = Math.round(performance.now() - startTime);
        logFn(LOG_LAYERS.AUTH, `Auth: ${methodName} OK`, {
          method_name: methodName,
          args_count: args.length,
          result: 'SUCCESS',
          duration_ms: executionTime
        });
      }
      
      return result;
    } catch (authError) {
      if (enableLogging) {
        const executionTime = Math.round(performance.now() - startTime);
        log.error(LOG_LAYERS.AUTH, `Auth: ${methodName} FAILED`, {
          method_name: methodName,
          args_count: args.length,
          result: 'FAILED',
          error_type: authError.name || 'AuthError',
          error_message: authError.message,
          duration_ms: executionTime
        });
      }
      
      throw authError;
    }
  };
}

export function applyAuthInterceptor(authService, options = {}) {
  const { enableLogging = true } = options;
  
  if (!authService || typeof authService !== 'object') {
    console.warn('[AuthInterceptor] Invalid auth service object');
    return authService;
  }

  const interceptedService = {};
  
  Object.keys(authService).forEach(key => {
    if (typeof authService[key] !== 'function') {
      interceptedService[key] = authService[key];
    }
  });
  
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
  
  [...new Set(allMethods)].forEach(methodName => {
    if (typeof authService[methodName] === 'function') {
      interceptedService[methodName] = createAuthInterceptor(
        authService[methodName].bind(authService),
        { ...options, methodName, enableLogging }
      );
    }
  });

  if (enableLogging) {
    log.info(LOG_LAYERS.AUTH, 'Auth Service Interceptor Applied', {
      service_methods: [...new Set(allMethods)]
    });
  }

  return interceptedService;
}

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
// AOP认证拦截器功能 (Requirements 4.3, 4.4)
// ============================================================================

let isInstalled = false;

const authStats = {
  totalOperations: 0,
  operationsByType: {},
  slowOperations: [],
  errors: [],
  sessions: []
};

const interceptedAuthServices = new WeakSet();

const SENSITIVE_FIELDS = [
  'password', 'token', 'secret', 'key', 'auth', 'credential',
  'refresh_token', 'access_token', 'jwt', 'session_id', 'api_key'
];

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

function createAuthMethodInterceptor(serviceName, methodName, originalMethod) {
  return function interceptedAuthMethod(...args) {
    const startTime = performance.now();
    const operationId = generateRequestId();
    
    authStats.totalOperations++;
    const operationKey = `${serviceName}.${methodName}`;
    authStats.operationsByType[operationKey] = (authStats.operationsByType[operationKey] || 0) + 1;
    
    try {
      const sanitizedArgs = args.map(arg => sanitizeAuthData(arg));
      
      log.debug(LOG_LAYERS.AUTH, `Auth: ${serviceName}.${methodName} PENDING`, {
        service_name: serviceName,
        method_name: methodName,
        operation_id: operationId,
        args_count: args.length,
        sanitized_args: sanitizedArgs,
        result: 'PENDING'
      });
      
      const result = originalMethod.apply(this, args);
      
      if (result && typeof result.then === 'function') {
        return result
          .then(asyncResult => {
            const executionTime = Math.round(performance.now() - startTime);
            const sanitizedResult = sanitizeAuthData(asyncResult);
            
            if (executionTime > 2000) {
              log.warn(LOG_LAYERS.AUTH, `Auth: ${serviceName}.${methodName} SLOW`, {
                service_name: serviceName,
                method_name: methodName,
                operation_id: operationId,
                sanitized_result: sanitizedResult,
                result: 'SUCCESS',
                performance_issue: 'SLOW_AUTH_OPERATION',
                threshold_ms: 2000,
                duration_ms: executionTime
              });
              
              authStats.slowOperations.push({
                serviceName,
                methodName,
                executionTime,
                timestamp: new Date().toISOString()
              });
            } else {
              log.debug(LOG_LAYERS.AUTH, `Auth: ${serviceName}.${methodName} OK`, {
                service_name: serviceName,
                method_name: methodName,
                operation_id: operationId,
                sanitized_result: sanitizedResult,
                result: 'SUCCESS',
                duration_ms: executionTime
              });
            }
            
            if (methodName.toLowerCase().includes('login') && asyncResult) {
              log.info(LOG_LAYERS.AUTH, `Audit: User login successful`, {
                service_name: serviceName,
                method_name: methodName,
                action: 'LOGIN',
                result: 'SUCCESS',
                user_info: sanitizeAuthData(asyncResult.user || asyncResult),
                duration_ms: executionTime
              });
              
              authStats.sessions.push({
                type: 'login',
                timestamp: new Date().toISOString(),
                executionTime
              });
            }
            
            if (methodName.toLowerCase().includes('logout')) {
              log.info(LOG_LAYERS.AUTH, `Audit: User logout`, {
                service_name: serviceName,
                method_name: methodName,
                action: 'LOGOUT',
                result: 'SUCCESS',
                duration_ms: executionTime
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
            
            log.warn(LOG_LAYERS.AUTH, `Auth: ${serviceName}.${methodName} FAILED`, {
              service_name: serviceName,
              method_name: methodName,
              operation_id: operationId,
              result: 'FAILED',
              error_type: asyncError.name || 'AuthError',
              error_message: asyncError.message,
              error_code: asyncError.code,
              duration_ms: executionTime
            });
            
            authStats.errors.push({
              serviceName,
              methodName,
              error: asyncError.message,
              errorCode: asyncError.code,
              timestamp: new Date().toISOString()
            });
            
            if (methodName.toLowerCase().includes('login')) {
              log.warn(LOG_LAYERS.AUTH, `Audit: User login failed`, {
                service_name: serviceName,
                method_name: methodName,
                action: 'LOGIN',
                result: 'FAILED',
                error_type: asyncError.name || 'AuthError',
                error_message: asyncError.message,
                error_code: asyncError.code,
                duration_ms: executionTime
              });
            }
            
            throw asyncError;
          });
      } else {
        const executionTime = Math.round(performance.now() - startTime);
        const sanitizedResult = sanitizeAuthData(result);
        
        log.debug(LOG_LAYERS.AUTH, `Auth: ${serviceName}.${methodName} OK`, {
          service_name: serviceName,
          method_name: methodName,
          operation_id: operationId,
          sanitized_result: sanitizedResult,
          result: 'SUCCESS',
          duration_ms: executionTime
        });
        
        return result;
      }
      
    } catch (err) {
      const executionTime = Math.round(performance.now() - startTime);
      
      log.warn(LOG_LAYERS.AUTH, `Auth: ${serviceName}.${methodName} FAILED`, {
        service_name: serviceName,
        method_name: methodName,
        operation_id: operationId,
        result: 'FAILED',
        error_type: err.name || 'AuthError',
        error_message: err.message,
        duration_ms: executionTime
      });
      
      authStats.errors.push({
        serviceName,
        methodName,
        error: err.message,
        timestamp: new Date().toISOString()
      });
      
      throw err;
    }
  };
}

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
    
    Object.keys(authService).forEach(key => {
      const value = authService[key];
      
      if (typeof value === 'function') {
        interceptedService[key] = createAuthMethodInterceptor(serviceName, key, value.bind(authService));
      }
    });
    
    interceptedAuthServices.add(interceptedService);
    
    log.info(LOG_LAYERS.AUTH, `Auth Service Intercepted: ${serviceName}`, {
      service_name: serviceName,
      methods_count: Object.keys(authService).filter(k => typeof authService[k] === 'function').length
    });
    
    return interceptedService;
  } catch (error) {
    console.error(`[AuthInterceptor] Failed to intercept auth service ${serviceName}:`, error);
    return authService;
  }
}

export function installAuthInterceptor() {
  if (isInstalled) {
    console.warn('[AuthInterceptor] Already installed');
    return false;
  }
  
  try {
    isInstalled = true;
    
    if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_AOP_DEBUG_LOGS === 'true') {
      console.log('[AuthInterceptor] Installed successfully');
    }
    
    return true;
  } catch (error) {
    console.error('[AuthInterceptor] Failed to install:', error);
    return false;
  }
}

export function uninstallAuthInterceptor() {
  if (!isInstalled) {
    console.warn('[AuthInterceptor] Not installed');
    return false;
  }
  
  try {
    isInstalled = false;
    interceptedAuthServices.clear?.();
    
    return true;
  } catch (error) {
    console.error('[AuthInterceptor] Failed to uninstall:', error);
    return false;
  }
}

export function isAuthInterceptorInstalled() {
  return isInstalled;
}

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

export function resetAuthInterceptorStats() {
  authStats.totalOperations = 0;
  authStats.operationsByType = {};
  authStats.slowOperations = [];
  authStats.errors = [];
  authStats.sessions = [];
}

export default {
  install: installAuthInterceptor,
  uninstall: uninstallAuthInterceptor,
  isInstalled: isAuthInterceptorInstalled,
  intercept: interceptAuthService,
  getStats: getAuthInterceptorStats,
  resetStats: resetAuthInterceptorStats
};
