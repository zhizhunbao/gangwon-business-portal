/**
 * Zustand Store Logger Middleware
 * 自动记录所有 store 状态变更
 */

import { LOG_LAYERS } from '@shared/logger';
import { createLogger } from '@shared/hooks/useLogger';

/**
 * 创建日志中间件
 * @param {string} storeName - Store 名称
 * @param {string} filePath - 文件路径
 */
export const storeLogger = (storeName, filePath = null) => (config) => (set, get, api) => {
  const log = createLogger(filePath || `src/shared/stores/${storeName}.js`);
  
  const loggedSet = (partial, replace, actionName) => {
    const prevState = get();
    
    set(partial, replace, actionName);
    
    const nextState = get();
    
    const changes = typeof partial === 'function' 
      ? Object.keys(nextState).filter(key => prevState[key] !== nextState[key])
      : Object.keys(partial);
    
    const actualActionName = actionName || 'setState';
    log.info(LOG_LAYERS.STORE, `Store: ${storeName}.${actualActionName}`, {
      store_name: storeName,
      action_name: actualActionName,
      changed_fields: changes
    });
  };
  
  return config(loggedSet, get, api);
};

export default storeLogger;
