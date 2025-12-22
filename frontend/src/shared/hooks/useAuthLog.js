/**
 * Auth Log Hook - 认证层日志记录 Hook
 *
 * 用于记录认证相关操作的日志 Hook，包括登录、登出、权限检查等。
 *
 * Features:
 * - 记录认证操作事件
 * - 自动追踪认证状态变化
 * - 集成日志上下文管理
 * - 支持认证性能监控
 * - 敏感信息过滤
 *
 * Requirements: 4.3, 4.4
 */

import { useEffect, useRef, useCallback } from "react";
import { info, debug, warn, LOG_LAYERS } from "@shared/utils/logger";

/**
 * 认证日志记录 Hook
 * @param {string} authContext - 认证上下文名称
 * @param {Object} options - 配置选项
 * @returns {Object} 日志记录工具函数
 */
export function useAuthLog(authContext = 'default', options = {}) {
  const {
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

  // 初始化认证日志上下文
  useEffect(() => {
    if (!enableLogging) return;

    try {
      sessionStartRef.current = performance.now();

      const logMessage = `Auth Context Initialized: ${authContext}`;
      const logData = {
        auth_context: authContext,
        lifecycle_event: "auth_init",
        session_start: new Date().toISOString(),
        user_agent: navigator.userAgent,
        page_url: window.location.href
      };

      if (logLevel === "debug") {
        debug(LOG_LAYERS.AUTH, logMessage, logData);
      } else {
        info(LOG_LAYERS.AUTH, logMessage, logData);
      }
    } catch (error) {
      console.warn("Failed to log auth context initialization:", error);
    }

    // 清理函数
    return () => {
      if (!enableLogging) return;

      try {
        const sessionDuration = sessionStartRef.current
          ? Math.round(performance.now() - sessionStartRef.current)
          : null;

        const logMessage = `Auth Context Cleanup: ${authContext}`;
        const logData = {
          auth_context: authContext,
          lifecycle_event: "auth_cleanup",
          session_duration_ms: sessionDuration,
          total_operations: authOperationCountRef.current,
          cleanup_timestamp: new Date().toISOString()
        };

        if (logLevel === "debug") {
          debug(LOG_LAYERS.AUTH, logMessage, logData);
        } else {
          info(LOG_LAYERS.AUTH, logMessage, logData);
        }
      } catch (error) {
        console.warn("Failed to log auth context cleanup:", error);
      }
    };
  }, [authContext, enableLogging, logLevel]);

  /**
   * 过滤敏感信息
   * @param {any} data - 要过滤的数据
   * @returns {any} 过滤后的数据
   */
  const sanitizeAuthData = useCallback((data) => {
    if (!data || typeof data !== 'object') {
      return data;
    }

    try {
      const sanitized = { ...data };

      // 递归处理对象
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

      return sanitizeObject(sanitized);
    } catch (error) {
      return { _error: "Failed to sanitize auth data" };
    }
  }, [sensitiveFields]);

  /**
   * 记录认证操作
   * @param {string} operation - 操作名称
   * @param {Object} operationData - 操作数据
   * @param {Object} options - 选项
   * @returns {Function} 完成记录函数
   */
  const logAuthOperation = useCallback((operation, operationData = {}, options = {}) => {
    if (!enableLogging) return () => {};

    const startTime = performance.now();
    const operationId = Date.now() + Math.random();
    authOperationCountRef.current += 1;

    try {
      // 记录操作开始
      const sanitizedData = sanitizeAuthData(operationData);
      
      debug(LOG_LAYERS.AUTH, `Auth Operation Start: ${operation}`, {
        auth_context: authContext,
        operation_name: operation,
        operation_id: operationId,
        operation_data: sanitizedData,
        operation_count: authOperationCountRef.current,
        timestamp: new Date().toISOString()
      });

      // 返回完成记录函数
      return (result = {}, error = null) => {
        try {
          const executionTime = Math.round(performance.now() - startTime);
          const sanitizedResult = sanitizeAuthData(result);

          if (error) {
            // 记录操作失败
            warn(LOG_LAYERS.AUTH, `Auth Operation Failed: ${operation}`, {
              auth_context: authContext,
              operation_name: operation,
              operation_id: operationId,
              execution_time_ms: executionTime,
              error_message: error.message || error,
              error_type: error.name || 'AuthError',
              operation_data: sanitizedData,
              timestamp: new Date().toISOString()
            });
          } else {
            // 记录操作成功
            const logData = {
              auth_context: authContext,
              operation_name: operation,
              operation_id: operationId,
              execution_time_ms: executionTime,
              operation_result: sanitizedResult,
              timestamp: new Date().toISOString()
            };

            // 检查慢操作
            if (executionTime > 1000) { // 1秒阈值
              warn(LOG_LAYERS.AUTH, `Slow Auth Operation: ${operation}`, {
                ...logData,
                performance_issue: 'SLOW_AUTH_OPERATION',
                threshold_ms: 1000
              });
            } else {
              debug(LOG_LAYERS.AUTH, `Auth Operation Complete: ${operation}`, logData);
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
  }, [authContext, enableLogging, sanitizeAuthData]);

  /**
   * 记录认证状态变化
   * @param {Object} newState - 新的认证状态
   * @param {Object} previousState - 之前的认证状态
   */
  const logAuthStateChange = useCallback((newState, previousState = null) => {
    if (!enableLogging || !trackAuthState) return;

    try {
      const sanitizedNewState = sanitizeAuthData(newState);
      const sanitizedPreviousState = sanitizeAuthData(previousState || authStateRef.current);

      // 检测状态变化
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
        info(LOG_LAYERS.AUTH, `Auth State Change: ${authContext}`, {
          auth_context: authContext,
          lifecycle_event: "state_change",
          new_state: sanitizedNewState,
          previous_state: sanitizedPreviousState,
          changes: stateChanges,
          change_count: stateChanges.length,
          timestamp: new Date().toISOString()
        });
      }

      authStateRef.current = newState;
    } catch (error) {
      console.warn("Failed to log auth state change:", error);
    }
  }, [authContext, enableLogging, trackAuthState, sanitizeAuthData]);

  /**
   * 记录权限检查
   * @param {string} permission - 权限名称
   * @param {boolean} granted - 是否授权
   * @param {Object} context - 上下文信息
   */
  const logPermissionCheck = useCallback((permission, granted, context = {}) => {
    if (!enableLogging || !trackPermissions) return;

    try {
      const sanitizedContext = sanitizeAuthData(context);

      debug(LOG_LAYERS.AUTH, `Permission Check: ${permission}`, {
        auth_context: authContext,
        permission_name: permission,
        permission_granted: granted,
        check_context: sanitizedContext,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.warn("Failed to log permission check:", error);
    }
  }, [authContext, enableLogging, trackPermissions, sanitizeAuthData]);

  /**
   * 记录会话事件
   * @param {string} event - 事件名称
   * @param {Object} eventData - 事件数据
   */
  const logSessionEvent = useCallback((event, eventData = {}) => {
    if (!enableLogging || !trackSessions) return;

    try {
      const sanitizedData = sanitizeAuthData(eventData);

      info(LOG_LAYERS.AUTH, `Session Event: ${event}`, {
        auth_context: authContext,
        session_event: event,
        event_data: sanitizedData,
        session_duration_ms: sessionStartRef.current 
          ? Math.round(performance.now() - sessionStartRef.current)
          : null,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.warn("Failed to log session event:", error);
    }
  }, [authContext, enableLogging, trackSessions, sanitizeAuthData]);

  /**
   * 记录认证错误
   * @param {Error} error - 错误对象
   * @param {Object} errorContext - 错误上下文
   */
  const logAuthError = useCallback((error, errorContext = {}) => {
    if (!enableLogging) return;

    try {
      const sanitizedContext = sanitizeAuthData(errorContext);

      warn(LOG_LAYERS.AUTH, `Auth Error: ${error.message || error}`, {
        auth_context: authContext,
        error_message: error.message || error,
        error_type: error.name || 'AuthError',
        error_stack: error.stack,
        error_context: sanitizedContext,
        timestamp: new Date().toISOString()
      });
    } catch (logError) {
      console.warn("Failed to log auth error:", logError);
    }
  }, [authContext, enableLogging, sanitizeAuthData]);

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
 * @param {string} authContext - 认证上下文
 * @param {Object} options - 配置选项
 * @returns {Function} HOC 函数
 */
export function withAuthLog(authContext, options = {}) {
  return function (WrappedComponent) {
    return function LoggedAuthComponent(props) {
      const { logAuthOperation, logAuthError } = useAuthLog(authContext, options);

      // 可以在这里添加认证相关的自动日志记录逻辑

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