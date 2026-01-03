/**
 * Store Log Hook - Store 状态日志记录 Hook
 * 
 * 用于记录 Zustand store 状态变更的 React Hook。
 * 
 * Features:
 * - 记录 store 名称和触发变更的 action
 * - 自动追踪状态变更
 * - 支持模块路径注入
 * 
 * Requirements: 4.1
 */

import { useEffect, useRef, useCallback } from 'react';
import { LOG_LAYERS } from '@shared/logger';
import { logWithModule } from './useLogger';

/**
 * Store 日志记录 Hook
 * @param {Object} store - Zustand store 实例
 * @param {string} storeName - Store 名称
 * @param {Object} options - 配置选项
 * @param {string} options.filePath - 文件路径
 */
export function useStoreLog(store, storeName, options = {}) {
  const { 
    filePath = null,
    enableLogging = true,
    logLevel = 'info',
    includeState = false,
    excludeActions = []
  } = options;
  
  const previousStateRef = useRef();
  const actionRef = useRef(null);

  // 内部日志函数
  const log = useCallback((level, message, data) => {
    logWithModule(filePath, level, LOG_LAYERS.STORE, message, data);
  }, [filePath]);
  
  useEffect(() => {
    if (!enableLogging || !store) {
      return;
    }
    
    const unsubscribe = store.subscribe((state, previousState) => {
      try {
        const stateChanged = previousState !== state;
        
        if (stateChanged) {
          const changedKeys = detectChangedKeys(previousState, state);
          const inferredAction = actionRef.current || inferActionFromChanges(changedKeys);
          
          if (excludeActions.includes(inferredAction)) {
            return;
          }
          
          const logData = {
            store_name: storeName,
            action: inferredAction,
            changed_keys: changedKeys,
            changed_fields: changedKeys
          };
          
          if (includeState) {
            logData.previous_state = sanitizeState(previousState);
            logData.current_state = sanitizeState(state);
          }
          
          const level = logLevel === 'debug' ? 'DEBUG' : 'INFO';
          log(level, `Store Change: ${storeName}.${inferredAction}`, logData);
        }
        
        actionRef.current = null;
      } catch (error) {
        console.warn('Failed to log store change:', error);
      }
    });
    
    return unsubscribe;
  }, [store, storeName, enableLogging, logLevel, includeState, excludeActions, log]);
  
  return {
    setAction: (actionName) => {
      actionRef.current = actionName;
    }
  };
}

function detectChangedKeys(previousState, currentState) {
  const changedKeys = [];
  
  if (!previousState || !currentState) {
    return changedKeys;
  }
  
  for (const key in currentState) {
    if (currentState[key] !== previousState[key]) {
      changedKeys.push(key);
    }
  }
  
  for (const key in previousState) {
    if (!(key in currentState)) {
      changedKeys.push(`-${key}`);
    }
  }
  
  return changedKeys;
}

function inferActionFromChanges(changedKeys) {
  if (changedKeys.length === 0) {
    return 'unknown';
  }
  
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
  
  return `update_${changedKeys[0]}`;
}

function sanitizeState(state) {
  if (!state || typeof state !== 'object') {
    return state;
  }
  
  const sanitized = { ...state };
  const sensitiveFields = ['password', 'token', 'secret', 'key'];
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[FILTERED]';
    }
  });
  
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
 */
export function createStoreLogMiddleware(storeName, options = {}) {
  const { filePath = null } = options;
  
  return (config) => (set, get, api) => {
    const originalSet = set;
    
    const wrappedSet = (partial, replace, action) => {
      try {
        const actionName = action || (typeof partial === 'function' ? 'function_update' : 'direct_update');
        
        logWithModule(filePath, 'INFO', LOG_LAYERS.STORE, `Store Action: ${storeName}.${actionName}`, {
          store_name: storeName,
          action: actionName,
          action_type: actionName,
          is_function_update: typeof partial === 'function',
          replace_mode: !!replace
        });
      } catch (error) {
        console.warn('Failed to log store action:', error);
      }
      
      return originalSet(partial, replace, action);
    };
    
    return config(wrappedSet, get, api);
  };
}

export default useStoreLog;
