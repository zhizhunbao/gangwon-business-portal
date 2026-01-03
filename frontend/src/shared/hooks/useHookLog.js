/**
 * Hook Log Hook - Hook 执行日志记录 Hook
 * 
 * 用于记录自定义 React Hook 执行的日志 Hook。
 * 
 * Features:
 * - 记录 hook 名称和执行上下文
 * - 自动追踪 hook 的调用和执行
 * - 支持执行时间统计
 * - 支持模块路径注入
 * 
 * Requirements: 4.2
 */

import { useEffect, useRef, useCallback } from 'react';
import { LOG_LAYERS } from '@shared/logger';
import { logWithModule } from './useLogger';

/**
 * Hook 日志记录 Hook
 * @param {string} hookName - Hook 名称
 * @param {Object} options - 配置选项
 * @param {string} options.filePath - 文件路径
 */
export function useHookLog(hookName, options = {}) {
  const {
    filePath = null,
    enableLogging = true,
    logLevel = 'info',
    trackExecution = true,
    trackDependencies = false,
    slowExecutionThreshold = 100 // ms
  } = options;
  
  const executionCountRef = useRef(0);
  const lastExecutionTimeRef = useRef(null);
  const startTimeRef = useRef(null);

  // 内部日志函数
  const log = useCallback((level, message, data) => {
    logWithModule(filePath, level, LOG_LAYERS.HOOK, message, data);
  }, [filePath]);
  
  useEffect(() => {
    if (!enableLogging) return;
    
    try {
      executionCountRef.current += 1;
      startTimeRef.current = performance.now();
      
      const level = logLevel === 'debug' ? 'DEBUG' : 'INFO';
      log(level, `Hook Execution: ${hookName}`, {
        hook_name: hookName,
        execution_count: executionCountRef.current,
        execution_number: executionCountRef.current,
      });
    } catch (error) {
      console.warn('Failed to log hook execution:', error);
    }
    
    return () => {
      if (!enableLogging || !startTimeRef.current) return;
      
      try {
        const executionTime = Math.round(performance.now() - startTimeRef.current);
        lastExecutionTimeRef.current = executionTime;
        
        const logData = {
          hook_name: hookName,
          execution_time_ms: executionTime,
          execution_number: executionCountRef.current
        };
        
        if (executionTime > slowExecutionThreshold) {
          log('WARNING', `Slow Hook Execution: ${hookName}`, {
            ...logData,
            performance_issue: "SLOW_HOOK_EXECUTION",
            threshold_ms: slowExecutionThreshold,
            exceeded_by_ms: executionTime - slowExecutionThreshold
          });
        } else {
          log('DEBUG', `Hook Execution Complete: ${hookName}`, logData);
        }
      } catch (error) {
        console.warn('Failed to log hook execution completion:', error);
      }
    };
  }, [hookName, enableLogging, logLevel, slowExecutionThreshold, log]);
  
  const logEvent = useCallback((eventName, eventData = {}) => {
    if (!enableLogging) return;
    
    try {
      log('INFO', `Hook Event: ${hookName}.${eventName}`, {
        hook_name: hookName,
        event_name: eventName,
        event_data: sanitizeEventData(eventData),
        execution_number: executionCountRef.current
      });
    } catch (error) {
      console.warn('Failed to log hook event:', error);
    }
  }, [hookName, enableLogging, log]);
  
  const logError = useCallback((error, context = {}) => {
    if (!enableLogging) return;
    
    try {
      log('WARNING', `Hook Error: ${hookName}`, {
        hook_name: hookName,
        error_message: error.message,
        error_stack: error.stack,
        error_name: error.name,
        context: sanitizeEventData(context),
        execution_number: executionCountRef.current
      });
    } catch (logError) {
      console.warn('Failed to log hook error:', logError);
    }
  }, [hookName, enableLogging, log]);
  
  const logDependencyChange = useCallback((dependencyName, oldValue, newValue) => {
    if (!enableLogging || !trackDependencies) return;
    
    try {
      log('DEBUG', `Hook Dependency Change: ${hookName}.${dependencyName}`, {
        hook_name: hookName,
        dependency_name: dependencyName,
        old_value: sanitizeEventData(oldValue),
        new_value: sanitizeEventData(newValue),
        execution_number: executionCountRef.current
      });
    } catch (error) {
      console.warn('Failed to log hook dependency change:', error);
    }
  }, [hookName, enableLogging, trackDependencies, log]);
  
  return {
    logEvent,
    logError,
    logDependencyChange,
    getExecutionCount: () => executionCountRef.current,
    getLastExecutionTime: () => lastExecutionTimeRef.current
  };
}

function sanitizeEventData(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  try {
    const sanitized = { ...data };
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[FILTERED]';
      }
    });
    
    const jsonStr = JSON.stringify(sanitized);
    if (jsonStr.length > 500) {
      return {
        _truncated: true,
        _original_size: jsonStr.length,
        _preview: jsonStr.substring(0, 100)
      };
    }
    
    return sanitized;
  } catch (error) {
    return { _error: 'Failed to sanitize data' };
  }
}

/**
 * Hook 日志装饰器工厂函数
 */
export function withHookLog(hookName, options = {}) {
  return function(hookFunction) {
    return function(...args) {
      const { logEvent, logError } = useHookLog(hookName, options);
      
      try {
        logEvent('called', { args_count: args.length });
        const result = hookFunction(...args);
        logEvent('completed', { has_result: !!result });
        return result;
      } catch (error) {
        logError(error, { args_count: args.length });
        throw error;
      }
    };
  };
}

export default useHookLog;
