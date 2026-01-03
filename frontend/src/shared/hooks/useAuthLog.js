/**
 * Auth Log Hook - 认证层日志记录 Hook
 *
 * 用于记录认证相关操作的日志 Hook，包括登录、登出、权限检查等。
 *
 * Features:
 * - 记录认证操作事件
 * - 自动追踪认证状态变化
 * - 敏感信息过滤
 * - 支持模块路径注入
 *
 * Requirements: 4.3, 4.4
 */

import { useEffect, useRef, useCallback } from "react";
import { LOG_LAYERS } from "@shared/logger";
import { logWithModule } from "./useLogger";

/**
 * 认证日志记录 Hook
 * @param {string} authContext - 认证上下文名称
 * @param {Object} options - 配置选项
 * @param {string} options.filePath - 文件路径
 */
export function useAuthLog(authContext = 'default', options = {}) {
  const {
    filePath = null,
    enableLogging = true,
    logLevel = "info",
    trackAuthState = true,
    trackPermissions = true,
    trackSessions = true,
    sensitiveFields = ['password', 'token', 'secret', 'key', 'auth', 'credential']
  } = options;

  const authStateRef = useRef(null);
  const sessionStartRef = useRef(null);
  const authOperationCountRef = useRef(0);

  // 内部日志函数
  const log = useCallback((level, message, data) => {
    logWithModule(filePath, level, LOG_LAYERS.AUTH, message, data);
  }, [filePath]);

  // 过滤敏感信息
  const sanitizeAuthData = useCallback((data) => {
    if (!data || typeof data !== 'object') {
      return data;
    }

    try {
      const sanitizeObject = (obj) => {
        if (!obj || typeof obj !== 'object') return obj;
        
        const result = Array.isArray(obj) ? [] : {};
        
        for (const key in obj) {
          const lowerKey = key.toLowerCase();
          const isSensitive = sensitiveFields.some(field => lowerKey.includes(field));
          
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

      return sanitizeObject({ ...data });
    } catch (error) {
      return { _error: "Failed to sanitize auth data" };
    }
  }, [sensitiveFields]);

  // 初始化认证日志上下文
  useEffect(() => {
    if (!enableLogging) return;

    try {
      sessionStartRef.current = performance.now();

      const level = logLevel === "debug" ? "DEBUG" : "INFO";
      log(level, `Auth Context Initialized: ${authContext}`, {
        auth_context: authContext,
        lifecycle_event: "auth_init",
        session_start: new Date().toISOString(),
      });
    } catch (error) {
      console.warn("Failed to log auth context initialization:", error);
    }

    return () => {
      if (!enableLogging) return;

      try {
        const sessionDuration = sessionStartRef.current
          ? Math.round(performance.now() - sessionStartRef.current)
          : null;

        const level = logLevel === "debug" ? "DEBUG" : "INFO";
        log(level, `Auth Context Cleanup: ${authContext}`, {
          auth_context: authContext,
          lifecycle_event: "auth_cleanup",
          session_duration_ms: sessionDuration,
          total_operations: authOperationCountRef.current,
        });
      } catch (error) {
        console.warn("Failed to log auth context cleanup:", error);
      }
    };
  }, [authContext, enableLogging, logLevel, log]);

  // 记录认证操作
  const logAuthOperation = useCallback((operation, operationData = {}, opts = {}) => {
    if (!enableLogging) return () => {};

    const startTime = performance.now();
    const operationId = Date.now() + Math.random();
    authOperationCountRef.current += 1;

    try {
      const sanitizedData = sanitizeAuthData(operationData);
      
      log('DEBUG', `Auth Operation Start: ${operation}`, {
        auth_context: authContext,
        operation_name: operation,
        operation_id: operationId,
        operation_data: sanitizedData,
        operation_count: authOperationCountRef.current,
      });

      return (result = {}, error = null) => {
        try {
          const executionTime = Math.round(performance.now() - startTime);
          const sanitizedResult = sanitizeAuthData(result);

          if (error) {
            log('WARNING', `Auth Operation Failed: ${operation}`, {
              auth_context: authContext,
              operation_name: operation,
              operation_id: operationId,
              execution_time_ms: executionTime,
              error_message: error.message || error,
              error_type: error.name || 'AuthError',
              operation_data: sanitizedData,
            });
          } else {
            const logData = {
              auth_context: authContext,
              operation_name: operation,
              operation_id: operationId,
              execution_time_ms: executionTime,
              operation_result: sanitizedResult,
            };

            if (executionTime > 1000) {
              log('WARNING', `Slow Auth Operation: ${operation}`, {
                ...logData,
                performance_issue: 'SLOW_AUTH_OPERATION',
                threshold_ms: 1000
              });
            } else {
              log('DEBUG', `Auth Operation Complete: ${operation}`, logData);
            }
          }
        } catch (logError) {
          console.warn("Failed to log auth operation completion:", logError);
        }
      };
    } catch (error) {
      console.warn("Failed to log auth operation start:", error);
      return () => {};
    }
  }, [authContext, enableLogging, sanitizeAuthData, log]);

  // 记录认证状态变化
  const logAuthStateChange = useCallback((newState, previousState = null) => {
    if (!enableLogging || !trackAuthState) return;

    try {
      const sanitizedNewState = sanitizeAuthData(newState);
      const sanitizedPreviousState = sanitizeAuthData(previousState || authStateRef.current);

      const stateChanges = [];
      if (sanitizedPreviousState) {
        for (const key in sanitizedNewState) {
          if (sanitizedNewState[key] !== sanitizedPreviousState[key]) {
            stateChanges.push({
              field: key,
              from: sanitizedPreviousState[key],
              to: sanitizedNewState[key]
            });
          }
        }
      }

      if (stateChanges.length > 0 || !sanitizedPreviousState) {
        log('INFO', `Auth State Change: ${authContext}`, {
          auth_context: authContext,
          lifecycle_event: "state_change",
          new_state: sanitizedNewState,
          previous_state: sanitizedPreviousState,
          changes: stateChanges,
          change_count: stateChanges.length,
        });
      }

      authStateRef.current = newState;
    } catch (error) {
      console.warn("Failed to log auth state change:", error);
    }
  }, [authContext, enableLogging, trackAuthState, sanitizeAuthData, log]);

  // 记录权限检查
  const logPermissionCheck = useCallback((permission, granted, context = {}) => {
    if (!enableLogging || !trackPermissions) return;

    try {
      log('DEBUG', `Permission Check: ${permission}`, {
        auth_context: authContext,
        permission_name: permission,
        permission_granted: granted,
        check_context: sanitizeAuthData(context),
      });
    } catch (error) {
      console.warn("Failed to log permission check:", error);
    }
  }, [authContext, enableLogging, trackPermissions, sanitizeAuthData, log]);

  // 记录会话事件
  const logSessionEvent = useCallback((event, eventData = {}) => {
    if (!enableLogging || !trackSessions) return;

    try {
      log('INFO', `Session Event: ${event}`, {
        auth_context: authContext,
        session_event: event,
        event_data: sanitizeAuthData(eventData),
        session_duration_ms: sessionStartRef.current 
          ? Math.round(performance.now() - sessionStartRef.current)
          : null,
      });
    } catch (error) {
      console.warn("Failed to log session event:", error);
    }
  }, [authContext, enableLogging, trackSessions, sanitizeAuthData, log]);

  // 记录认证错误
  const logAuthError = useCallback((error, errorContext = {}) => {
    if (!enableLogging) return;

    try {
      log('WARNING', `Auth Error: ${error.message || error}`, {
        auth_context: authContext,
        error_message: error.message || error,
        error_type: error.name || 'AuthError',
        error_stack: error.stack,
        error_context: sanitizeAuthData(errorContext),
      });
    } catch (logError) {
      console.warn("Failed to log auth error:", logError);
    }
  }, [authContext, enableLogging, sanitizeAuthData, log]);

  return {
    logAuthOperation,
    logAuthStateChange,
    logPermissionCheck,
    logSessionEvent,
    logAuthError,
    getOperationCount: () => authOperationCountRef.current,
    getSessionDuration: () => sessionStartRef.current 
      ? Math.round(performance.now() - sessionStartRef.current)
      : null,
    getCurrentAuthState: () => authStateRef.current
  };
}

/**
 * 认证日志装饰器 HOC
 */
export function withAuthLog(authContext, options = {}) {
  return function (WrappedComponent) {
    return function LoggedAuthComponent(props) {
      const { logAuthOperation, logAuthError } = useAuthLog(authContext, options);

      try {
        return React.createElement(WrappedComponent, {
          ...props,
          authLogger: { logAuthOperation, logAuthError }
        });
      } catch (error) {
        logAuthError(error, { props });
        throw error;
      }
    };
  };
}

export default useAuthLog;
