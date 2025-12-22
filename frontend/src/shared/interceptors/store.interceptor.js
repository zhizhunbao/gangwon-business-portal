/**
 * Store Interceptor - 状态管理拦截器
 * 
 * 自动为状态管理操作添加AOP日志功能，实现Store级别的自动日志记录。
 * 
 * Features:
 * - 拦截状态变更操作
 * - 记录状态变更历史
 * - 性能监控和优化建议
 * - 自动错误捕获和报告
 * - 支持多种状态管理库（Zustand、Redux等）
 * 
 * Requirements: 4.3, 4.4
 */

import { info, debug, warn, LOG_LAYERS } from '@shared/utils/logger';
import { generateRequestId } from '@shared/utils/logger.context';

// 拦截器状态
let isInstalled = false;

// Store统计信息
const storeStats = {
  totalStateChanges: 0,
  storesByName: {},
  slowOperations: [],
  errors: []
};

// 已拦截的stores - 使用WeakSet存储已拦截的store对象
const interceptedStores = new WeakSet();

/**
 * 创建状态变更拦截器
 * @param {string} storeName - Store名称
 * @param {string} actionName - 操作名称
 * @param {Function} originalAction - 原始操作函数
 * @returns {Function} 拦截后的操作函数
 */
function createStateChangeInterceptor(storeName, actionName, originalAction) {
  return function interceptedAction(...args) {
    const startTime = performance.now();
    const changeId = generateRequestId();
    
    // 更新统计信息
    storeStats.totalStateChanges++;
    if (!storeStats.storesByName[storeName]) {
      storeStats.storesByName[storeName] = {
        totalChanges: 0,
        actionsByName: {}
      };
    }
    storeStats.storesByName[storeName].totalChanges++;
    storeStats.storesByName[storeName].actionsByName[actionName] = 
      (storeStats.storesByName[storeName].actionsByName[actionName] || 0) + 1;
    
    try {
      // 记录状态变更开始
      debug(LOG_LAYERS.STORE, `State Change Start: ${storeName}.${actionName}`, {
        store_name: storeName,
        action_name: actionName,
        change_id: changeId,
        args_count: args.length,
        timestamp: new Date().toISOString()
      });
      
      // 执行原始操作
      const result = originalAction.apply(this, args);
      
      // 计算执行时间
      const executionTime = Math.round(performance.now() - startTime);
      
      // 记录状态变更完成
      debug(LOG_LAYERS.STORE, `State Change Complete: ${storeName}.${actionName}`, {
        store_name: storeName,
        action_name: actionName,
        change_id: changeId,
        execution_time_ms: executionTime,
        has_result: result !== undefined
      });
      
      // 检查慢操作
      if (executionTime > 10) { // 10ms阈值
        warn(LOG_LAYERS.STORE, `Slow State Operation: ${storeName}.${actionName}`, {
          store_name: storeName,
          action_name: actionName,
          execution_time_ms: executionTime,
          performance_issue: 'SLOW_STATE_OPERATION',
          threshold_ms: 10
        });
        
        storeStats.slowOperations.push({
          storeName,
          actionName,
          executionTime,
          timestamp: new Date().toISOString()
        });
      }
      
      return result;
      
    } catch (error) {
      const executionTime = Math.round(performance.now() - startTime);
      
      // 记录状态操作错误
      warn(LOG_LAYERS.STORE, `State Operation Error: ${storeName}.${actionName}`, {
        store_name: storeName,
        action_name: actionName,
        change_id: changeId,
        execution_time_ms: executionTime,
        error_message: error.message,
        error_stack: error.stack
      });
      
      storeStats.errors.push({
        storeName,
        actionName,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  };
}

/**
 * 拦截Zustand Store
 * @param {Object} store - Zustand store对象
 * @param {string} storeName - Store名称
 * @returns {Object} 拦截后的store
 */
function interceptZustandStore(store, storeName) {
  // 检查store是否为有效对象
  if (!store || typeof store !== 'object') {
    console.warn(`[StoreInterceptor] Invalid store object for ${storeName}`);
    return store;
  }
  
  // 检查是否已经拦截过，使用try-catch处理WeakSet操作
  try {
    if (interceptedStores.has(store)) {
      return store;
    }
  } catch (error) {
    console.warn(`[StoreInterceptor] WeakSet operation failed for ${storeName}:`, error);
    // 如果WeakSet操作失败，继续执行但不使用缓存
  }
  
  try {
    // 拦截setState方法
    if (store.setState && typeof store.setState === 'function') {
      const originalSetState = store.setState;
      
      store.setState = function interceptedSetState(partial, replace, actionName) {
        const actualActionName = actionName || 'setState';
        const interceptedPartial = createStateChangeInterceptor(
          storeName, 
          actualActionName, 
          () => originalSetState.call(this, partial, replace, actionName)
        );
        
        return interceptedPartial();
      };
    }
    
    // 拦截getState方法（只记录，不修改行为）
    if (store.getState && typeof store.getState === 'function') {
      const originalGetState = store.getState;
      
      store.getState = function interceptedGetState() {
        debug(LOG_LAYERS.STORE, `State Access: ${storeName}.getState`, {
          store_name: storeName,
          action_name: 'getState',
          timestamp: new Date().toISOString()
        });
        
        return originalGetState.call(this);
      };
    }
    
    // 标记为已拦截，使用try-catch处理WeakSet操作
    try {
      interceptedStores.add(store);
    } catch (error) {
      console.warn(`[StoreInterceptor] Failed to mark store as intercepted:`, error);
    }
    
    info(LOG_LAYERS.STORE, `Store Intercepted: ${storeName}`, {
      store_name: storeName,
      store_type: 'zustand',
      has_setState: !!store.setState,
      has_getState: !!store.getState
    });
    
    return store;
  } catch (error) {
    console.error(`[StoreInterceptor] Failed to intercept Zustand store ${storeName}:`, error);
    return store;
  }
}

/**
 * 拦截普通对象Store
 * @param {Object} store - Store对象
 * @param {string} storeName - Store名称
 * @returns {Object} 拦截后的store
 */
function interceptObjectStore(store, storeName) {
  // 检查store是否为有效对象
  if (!store || typeof store !== 'object') {
    console.warn(`[StoreInterceptor] Invalid store object for ${storeName}`);
    return store;
  }
  
  // 检查是否已经拦截过，使用try-catch处理WeakSet操作
  try {
    if (interceptedStores.has(store)) {
      return store;
    }
  } catch (error) {
    console.warn(`[StoreInterceptor] WeakSet operation failed for ${storeName}:`, error);
    // 如果WeakSet操作失败，继续执行但不使用缓存
  }
  
  try {
    const interceptedStore = { ...store };
    
    // 拦截所有方法
    Object.keys(store).forEach(key => {
      const value = store[key];
      
      if (typeof value === 'function') {
        interceptedStore[key] = createStateChangeInterceptor(storeName, key, value.bind(store));
      }
    });
    
    // 标记为已拦截，使用try-catch处理WeakSet操作
    try {
      interceptedStores.add(interceptedStore);
    } catch (error) {
      console.warn(`[StoreInterceptor] Failed to mark store as intercepted:`, error);
    }
    
    info(LOG_LAYERS.STORE, `Object Store Intercepted: ${storeName}`, {
      store_name: storeName,
      store_type: 'object',
      methods_count: Object.keys(store).filter(k => typeof store[k] === 'function').length
    });
    
    return interceptedStore;
  } catch (error) {
    console.error(`[StoreInterceptor] Failed to intercept object store ${storeName}:`, error);
    return store;
  }
}

/**
 * 拦截Store
 * @param {Object} store - Store对象
 * @param {string} storeName - Store名称
 * @param {string} storeType - Store类型 ('zustand', 'object', 'auto')
 * @returns {Object} 拦截后的store
 */
export function interceptStore(store, storeName, storeType = 'auto') {
  if (!store || typeof store !== 'object') {
    console.warn(`[StoreInterceptor] Invalid store object for ${storeName}`);
    return store;
  }
  
  if (!isInstalled) {
    console.warn('[StoreInterceptor] Not installed, call installStoreInterceptor() first');
    return store;
  }
  
  try {
    // 自动检测Store类型
    if (storeType === 'auto') {
      if (store.setState && store.getState) {
        storeType = 'zustand';
      } else {
        storeType = 'object';
      }
    }
    
    // 根据类型拦截
    switch (storeType) {
      case 'zustand':
        return interceptZustandStore(store, storeName);
      case 'object':
        return interceptObjectStore(store, storeName);
      default:
        console.warn(`[StoreInterceptor] Unknown store type: ${storeType}`);
        return store;
    }
  } catch (error) {
    console.error(`[StoreInterceptor] Failed to intercept store ${storeName}:`, error);
    return store;
  }
}

/**
 * 安装Store拦截器
 * @returns {boolean} 是否安装成功
 */
export function installStoreInterceptor() {
  if (isInstalled) {
    console.warn('[StoreInterceptor] Already installed');
    return false;
  }
  
  try {
    isInstalled = true;
    
    // 只在开发环境且启用调试日志时显示安装成功信息
    if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_AOP_DEBUG_LOGS === 'true') {
      console.log('[StoreInterceptor] Installed successfully');
    }
    
    return true;
  } catch (error) {
    console.error('[StoreInterceptor] Failed to install:', error);
    return false;
  }
}

/**
 * 卸载Store拦截器
 * @returns {boolean} 是否卸载成功
 */
export function uninstallStoreInterceptor() {
  if (!isInstalled) {
    console.warn('[StoreInterceptor] Not installed');
    return false;
  }
  
  try {
    isInstalled = false;
    interceptedStores.clear?.();
    
    if (import.meta.env.DEV) {
      console.log('[StoreInterceptor] Uninstalled successfully');
    }
    
    return true;
  } catch (error) {
    console.error('[StoreInterceptor] Failed to uninstall:', error);
    return false;
  }
}

/**
 * 检查拦截器是否已安装
 * @returns {boolean} 是否已安装
 */
export function isStoreInterceptorInstalled() {
  return isInstalled;
}

/**
 * 获取Store统计信息
 * @returns {Object} 统计信息
 */
export function getStoreInterceptorStats() {
  return {
    isInstalled,
    totalStateChanges: storeStats.totalStateChanges,
    storeCount: Object.keys(storeStats.storesByName).length,
    storesByName: { ...storeStats.storesByName },
    slowOperationsCount: storeStats.slowOperations.length,
    errorsCount: storeStats.errors.length,
    recentSlowOperations: storeStats.slowOperations.slice(-5),
    recentErrors: storeStats.errors.slice(-5)
  };
}

/**
 * 重置Store统计信息
 */
export function resetStoreInterceptorStats() {
  storeStats.totalStateChanges = 0;
  storeStats.storesByName = {};
  storeStats.slowOperations = [];
  storeStats.errors = [];
}

// 默认导出
export default {
  install: installStoreInterceptor,
  uninstall: uninstallStoreInterceptor,
  isInstalled: isStoreInterceptorInstalled,
  intercept: interceptStore,
  getStats: getStoreInterceptorStats,
  resetStats: resetStoreInterceptorStats
};