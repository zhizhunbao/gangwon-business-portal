/**
 * Store Log Hook - Store 状态日志记录 Hook
 * 
 * 用于记录 Zustand store 状态变更的 React Hook。
 * 
 * Features:
 * - 记录 store 名称和触发变更的 action
 * - 自动追踪状态变更
 * - 集成日志上下文管理
 * - 支持自定义 store 名称
 * 
 * Requirements: 4.1
 */

import { useEffect, useRef } from 'react';
import { info, debug, LOG_LAYERS } from '@shared/utils/logger';

/**
 * Store 日志记录 Hook
 * @param {Object} store - Zustand store 实例
 * @param {string} storeName - Store 名称
 * @param {Object} options - 配置选项
 * @returns {void}
 */
export function useStoreLog(store, storeName, options = {}) {
  const { 
    enableLogging = true,
    logLevel = 'info',
    includeState = false,
    excludeActions = []
  } = options;
  
  const previousStateRef = useRef();
  const actionRef = useRef(null);
  
  useEffect(() => {
    if (!enableLogging || !store) {
      return;
    }
    
    // 订阅 store 状态变更
    const unsubscribe = store.subscribe((state, previousState) => {
      try {
        // 获取日志上下文
        const traceId = getTraceId();
        const requestId = getCurrentRequestId();
        const userId = getUserId();
        
        // 检测状态变更
        const stateChanged = previousState !== state;
        
        if (stateChanged) {
          // 尝试推断触发的 action（基于状态差异）
          const changedKeys = detectChangedKeys(previousState, state);
          const inferredAction = actionRef.current || inferActionFromChanges(changedKeys);
          
          // 检查是否应该排除此 action
          if (excludeActions.includes(inferredAction)) {
            return;
          }
          
          // 记录状态变更 - Requirements 4.1
          const logData = {
            store_name: storeName,
            action: inferredAction,
            changed_keys: changedKeys,
            changed_fields: changedKeys
          };
          
          // 可选：包含状态数据
          if (includeState) {
            logData.previous_state = sanitizeState(previousState);
            logData.current_state = sanitizeState(state);
          }
          
          // 根据配置的日志级别记录
          const logMessage = `Store Change: ${storeName}.${inferredAction}`;
          
          if (logLevel === 'debug') {
            debug(LOG_LAYERS.STORE, logMessage, logData);
          } else {
            info(LOG_LAYERS.STORE, logMessage, logData);
          }
        }
        
        // 重置 action 引用
        actionRef.current = null;
        
      } catch (error) {
        console.warn('Failed to log store change:', error);
      }
    });
    
    // 清理订阅
    return unsubscribe;
  }, [store, storeName, enableLogging, logLevel, includeState, excludeActions]);
  
  // 返回用于手动设置 action 名称的函数
  return {
    setAction: (actionName) => {
      actionRef.current = actionName;
    }
  };
}

/**
 * 检测状态变更的键
 * @param {Object} previousState - 之前的状态
 * @param {Object} currentState - 当前状态
 * @returns {string[]} 变更的键列表
 */
function detectChangedKeys(previousState, currentState) {
  const changedKeys = [];
  
  if (!previousState || !currentState) {
    return changedKeys;
  }
  
  // 检查所有当前状态的键
  for (const key in currentState) {
    if (currentState[key] !== previousState[key]) {
      changedKeys.push(key);
    }
  }
  
  // 检查被删除的键
  for (const key in previousState) {
    if (!(key in currentState)) {
      changedKeys.push(`-${key}`); // 标记为删除
    }
  }
  
  return changedKeys;
}

/**
 * 根据变更推断 action 名称
 * @param {string[]} changedKeys - 变更的键列表
 * @returns {string} 推断的 action 名称
 */
function inferActionFromChanges(changedKeys) {
  if (changedKeys.length === 0) {
    return 'unknown';
  }
  
  // 常见的 action 模式推断
  if (changedKeys.includes('user') && changedKeys.includes('isAuthenticated')) {
    return 'setUser';
  }
  
  if (changedKeys.includes('isAuthenticated') && changedKeys.length === 1) {
    return 'setAuthenticated';
  }
  
  if (changedKeys.includes('isLoading') && changedKeys.length === 1) {
    return 'setLoading';
  }
  
  if (changedKeys.includes('language') && changedKeys.length === 1) {
    return 'setLanguage';
  }
  
  if (changedKeys.includes('theme') && changedKeys.length === 1) {
    return 'setTheme';
  }
  
  if (changedKeys.includes('sidebarCollapsed') && changedKeys.length === 1) {
    return 'toggleSidebar';
  }
  
  // 默认使用第一个变更的键作为 action 名称
  return `update_${changedKeys[0]}`;
}

/**
 * 清理状态数据，移除敏感信息
 * @param {Object} state - 状态对象
 * @returns {Object} 清理后的状态
 */
function sanitizeState(state) {
  if (!state || typeof state !== 'object') {
    return state;
  }
  
  const sanitized = { ...state };
  
  // 移除敏感字段
  const sensitiveFields = ['password', 'token', 'secret', 'key'];
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[FILTERED]';
    }
  });
  
  // 限制对象大小
  const jsonStr = JSON.stringify(sanitized);
  if (jsonStr.length > 1000) {
    return {
      ...sanitized,
      _truncated: true,
      _original_size: jsonStr.length
    };
  }
  
  return sanitized;
}

/**
 * 创建带日志的 Zustand store 中间件
 * @param {string} storeName - Store 名称
 * @param {Object} options - 配置选项
 * @returns {Function} Zustand 中间件函数
 */
export function createStoreLogMiddleware(storeName, options = {}) {
  return (config) => (set, get, api) => {
    const originalSet = set;
    
    // 包装 set 函数以记录 action
    const wrappedSet = (partial, replace, action) => {
      try {
        // 记录 action 信息
        const actionName = action || (typeof partial === 'function' ? 'function_update' : 'direct_update');
        
        info(
          LOG_LAYERS.STORE,
          `Store Action: ${storeName}.${actionName}`,
          {
            store_name: storeName,
            action: actionName,
            action_type: actionName,
            is_function_update: typeof partial === 'function',
            replace_mode: !!replace
          }
        );
        
      } catch (error) {
        console.warn('Failed to log store action:', error);
      }
      
      // 调用原始 set 函数
      return originalSet(partial, replace, action);
    };
    
    return config(wrappedSet, get, api);
  };
}

export default useStoreLog;