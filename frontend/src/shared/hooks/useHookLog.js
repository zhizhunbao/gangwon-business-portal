/**
 * Hook Log Hook - Hook 执行日志记录 Hook
 * 
 * 用于记录自定义 React Hook 执行的日志 Hook。
 * 
 * Features:
 * - 记录 hook 名称和执行上下文
 * - 自动追踪 hook 的调用和执行
 * - 集成日志上下文管理
 * - 支持执行时间统计
 * 
 * Requirements: 4.2
 */

import { useEffect, useRef, useCallback } from 'react';
import { info, debug, warn, LOG_LAYERS } from '@shared/utils/logger';

/**
 * Hook 日志记录 Hook
 * @param {string} hookName - Hook 名称
 * @param {Object} options - 配置选项
 * @returns {Object} 日志记录工具函数
 */
export function useHookLog(hookName, options = {}) {
  const {
    enableLogging = true,
    logLevel = 'info',
    trackExecution = true,
    trackDependencies = false,
    slowExecutionThreshold = 100 // ms
  } = options;
  
  const executionCountRef = useRef(0);
  const lastExecutionTimeRef = useRef(null);
  const startTimeRef = useRef(null);
  
  // Hook 初始化日志
  useEffect(() => {
    if (!enableLogging) return;
    
    try {
      executionCountRef.current += 1;
      startTimeRef.current = performance.now();
      
      // 记录 Hook 执行 - Requirements 4.2
      const logMessage = `Hook Execution: ${hookName}`;
      const logData = {
        hook_name: hookName,
        execution_count: executionCountRef.current,
        execution_number: executionCountRef.current,
        component_stack: getComponentStack()
      };
      
      if (logLevel === 'debug') {
        debug(LOG_LAYERS.HOOK, logMessage, logData);
      } else {
        info(LOG_LAYERS.HOOK, logMessage, logData);
      }
      
    } catch (error) {
      console.warn('Failed to log hook execution:', error);
    }
    
    // 清理函数：记录 Hook 执行完成
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
        
        // 慢执行警告
        if (executionTime > slowExecutionThreshold) {
          warn(
            LOG_LAYERS.HOOK,
            `Slow Hook Execution: ${hookName}`,
            {
              ...logData,
              performance_issue: "SLOW_HOOK_EXECUTION",
              threshold_ms: slowExecutionThreshold,
              exceeded_by_ms: executionTime - slowExecutionThreshold
            }
          );
        } else {
          debug(LOG_LAYERS.HOOK, `Hook Execution Complete: ${hookName}`, logData);
        }
        
      } catch (error) {
        console.warn('Failed to log hook execution completion:', error);
      }
    };
  }, [hookName, enableLogging, logLevel, slowExecutionThreshold]);
  
  // 记录 Hook 事件的工具函数
  const logEvent = useCallback((eventName, eventData = {}) => {
    if (!enableLogging) return;
    
    try {
      
      info(
        LOG_LAYERS.HOOK,
        `Hook Event: ${hookName}.${eventName}`,
        {
          hook_name: hookName,
          event_name: eventName,
          event_data: sanitizeEventData(eventData),
          execution_number: executionCountRef.current
        }
      );
      
    } catch (error) {
      console.warn('Failed to log hook event:', error);
    }
  }, [hookName, enableLogging]);
  
  // 记录 Hook 错误的工具函数
  const logError = useCallback((error, context = {}) => {
    if (!enableLogging) return;
    
    try {
      warn(
        LOG_LAYERS.HOOK,
        `Hook Error: ${hookName}`,
        {
          hook_name: hookName,
          error_message: error.message,
          error_stack: error.stack,
          error_name: error.name,
          context: sanitizeEventData(context),
          execution_number: executionCountRef.current
        }
      );
      
    } catch (logError) {
      console.warn('Failed to log hook error:', logError);
    }
  }, [hookName, enableLogging]);
  
  // 记录依赖变更的工具函数
  const logDependencyChange = useCallback((dependencyName, oldValue, newValue) => {
    if (!enableLogging || !trackDependencies) return;
    
    try {
      debug(
        LOG_LAYERS.HOOK,
        `Hook Dependency Change: ${hookName}.${dependencyName}`,
        {
          hook_name: hookName,
          dependency_name: dependencyName,
          old_value: sanitizeEventData(oldValue),
          new_value: sanitizeEventData(newValue),
          execution_number: executionCountRef.current
        }
      );
      
    } catch (error) {
      console.warn('Failed to log hook dependency change:', error);
    }
  }, [hookName, enableLogging, trackDependencies]);
  
  return {
    logEvent,
    logError,
    logDependencyChange,
    getExecutionCount: () => executionCountRef.current,
    getLastExecutionTime: () => lastExecutionTimeRef.current
  };
}

/**
 * 获取组件调用栈信息
 * @returns {string} 组件栈信息
 */
function getComponentStack() {
  try {
    // 尝试从 React DevTools 或错误栈中提取组件信息
    const error = new Error();
    const stack = error.stack || '';
    
    // 简单的组件栈提取（可以根据需要改进）
    const lines = stack.split('\n').slice(1, 4); // 取前几行
    return lines.map(line => line.trim()).join(' -> ');
    
  } catch (error) {
    return 'unknown';
  }
}

/**
 * 清理事件数据，移除敏感信息
 * @param {any} data - 事件数据
 * @returns {any} 清理后的数据
 */
function sanitizeEventData(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  try {
    const sanitized = { ...data };
    
    // 移除敏感字段
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[FILTERED]';
      }
    });
    
    // 限制对象大小
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
 * @param {string} hookName - Hook 名称
 * @param {Object} options - 配置选项
 * @returns {Function} 装饰器函数
 */
export function withHookLog(hookName, options = {}) {
  return function(hookFunction) {
    return function(...args) {
      const { logEvent, logError } = useHookLog(hookName, options);
      
      try {
        // 记录 Hook 调用
        logEvent('called', { args_count: args.length });
        
        // 执行原始 Hook
        const result = hookFunction(...args);
        
        // 记录 Hook 成功执行
        logEvent('completed', { has_result: !!result });
        
        return result;
        
      } catch (error) {
        // 记录 Hook 执行错误
        logError(error, { args_count: args.length });
        throw error;
      }
    };
  };
}

export default useHookLog;