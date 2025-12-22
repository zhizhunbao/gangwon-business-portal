/**
 * Store Exception Hook - 状态管理异常 Hook
 * 
 * 处理状态管理异常，提供状态恢复机制
 * 集成异常服务，支持状态回滚
 * Requirements: 6.2, 6.6
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { frontendExceptionService } from '@shared/utils/exception.service.js';

/**
 * 状态管理异常类型枚举
 */
export const StoreExceptionType = {
  STATE_CORRUPTION: 'STATE_CORRUPTION',
  REDUCER_ERROR: 'REDUCER_ERROR',
  ACTION_DISPATCH_FAILED: 'ACTION_DISPATCH_FAILED',
  MIDDLEWARE_ERROR: 'MIDDLEWARE_ERROR',
  SERIALIZATION_ERROR: 'SERIALIZATION_ERROR',
  DESERIALIZATION_ERROR: 'DESERIALIZATION_ERROR',
  PERSISTENCE_ERROR: 'PERSISTENCE_ERROR',
  HYDRATION_ERROR: 'HYDRATION_ERROR',
  SELECTOR_ERROR: 'SELECTOR_ERROR',
  SUBSCRIPTION_ERROR: 'SUBSCRIPTION_ERROR'
};

/**
 * 状态恢复策略
 */
export const StoreRecoveryStrategy = {
  ROLLBACK_STATE: 'ROLLBACK_STATE',
  RESET_TO_INITIAL: 'RESET_TO_INITIAL',
  PARTIAL_RESET: 'PARTIAL_RESET',
  RETRY_ACTION: 'RETRY_ACTION',
  SKIP_ACTION: 'SKIP_ACTION',
  RELOAD_FROM_STORAGE: 'RELOAD_FROM_STORAGE',
  NO_ACTION: 'NO_ACTION'
};

/**
 * 状态管理异常 Hook
 * @param {Object} options - 配置选项
 * @returns {Object} 状态异常处理接口
 */
export function useStoreException(options = {}) {
  const {
    enableStateBackup = true,
    maxBackupStates = 5,
    enableAutoRecovery = true,
    maxRecoveryAttempts = 3,
    recoveryRetryDelay = 1000,
    onStoreError = null,
    onRecoverySuccess = null,
    onRecoveryFailed = null,
    criticalStateKeys = []
  } = options;

  // 状态管理
  const [storeError, setStoreError] = useState(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryAttempts, setRecoveryAttempts] = useState(0);
  const [lastErrorTime, setLastErrorTime] = useState(null);

  // 引用管理
  const stateBackupsRef = useRef([]);
  const recoveryAttemptsRef = useRef(0);
  const isRecoveringRef = useRef(false);
  const lastActionRef = useRef(null);

  /**
   * 分类状态管理异常
   */
  const classifyStoreException = useCallback((error, context = {}) => {
    const errorMessage = error.message?.toLowerCase() || '';
    const errorStack = error.stack?.toLowerCase() || '';
    const { actionType, stateKey, operation } = context;

    // 根据错误消息分类
    if (errorMessage.includes('reducer') || errorStack.includes('reducer')) {
      return {
        type: StoreExceptionType.REDUCER_ERROR,
        recoverable: true,
        strategy: StoreRecoveryStrategy.ROLLBACK_STATE,
        severity: 'HIGH',
        affectedKeys: stateKey ? [stateKey] : []
      };
    }

    if (errorMessage.includes('dispatch') || errorMessage.includes('action')) {
      return {
        type: StoreExceptionType.ACTION_DISPATCH_FAILED,
        recoverable: true,
        strategy: StoreRecoveryStrategy.RETRY_ACTION,
        severity: 'MEDIUM',
        affectedKeys: []
      };
    }

    if (errorMessage.includes('middleware')) {
      return {
        type: StoreExceptionType.MIDDLEWARE_ERROR,
        recoverable: true,
        strategy: StoreRecoveryStrategy.SKIP_ACTION,
        severity: 'MEDIUM',
        affectedKeys: []
      };
    }

    if (errorMessage.includes('serialize') || errorMessage.includes('json')) {
      return {
        type: StoreExceptionType.SERIALIZATION_ERROR,
        recoverable: true,
        strategy: StoreRecoveryStrategy.PARTIAL_RESET,
        severity: 'MEDIUM',
        affectedKeys: stateKey ? [stateKey] : []
      };
    }

    if (errorMessage.includes('deserialize') || errorMessage.includes('parse')) {
      return {
        type: StoreExceptionType.DESERIALIZATION_ERROR,
        recoverable: true,
        strategy: StoreRecoveryStrategy.RELOAD_FROM_STORAGE,
        severity: 'HIGH',
        affectedKeys: []
      };
    }

    if (errorMessage.includes('persist') || errorMessage.includes('storage')) {
      return {
        type: StoreExceptionType.PERSISTENCE_ERROR,
        recoverable: true,
        strategy: StoreRecoveryStrategy.SKIP_ACTION,
        severity: 'LOW',
        affectedKeys: []
      };
    }

    if (errorMessage.includes('hydrat') || errorMessage.includes('rehydrat')) {
      return {
        type: StoreExceptionType.HYDRATION_ERROR,
        recoverable: true,
        strategy: StoreRecoveryStrategy.RESET_TO_INITIAL,
        severity: 'HIGH',
        affectedKeys: []
      };
    }

    if (errorMessage.includes('selector') || operation === 'select') {
      return {
        type: StoreExceptionType.SELECTOR_ERROR,
        recoverable: true,
        strategy: StoreRecoveryStrategy.PARTIAL_RESET,
        severity: 'MEDIUM',
        affectedKeys: stateKey ? [stateKey] : []
      };
    }

    if (errorMessage.includes('subscrib') || errorMessage.includes('listen')) {
      return {
        type: StoreExceptionType.SUBSCRIPTION_ERROR,
        recoverable: true,
        strategy: StoreRecoveryStrategy.NO_ACTION,
        severity: 'LOW',
        affectedKeys: []
      };
    }

    // 检查是否影响关键状态
    const isCritical = criticalStateKeys.some(key => 
      stateKey === key || errorMessage.includes(key)
    );

    // 默认分类
    return {
      type: StoreExceptionType.STATE_CORRUPTION,
      recoverable: true,
      strategy: isCritical ? StoreRecoveryStrategy.ROLLBACK_STATE : StoreRecoveryStrategy.PARTIAL_RESET,
      severity: isCritical ? 'CRITICAL' : 'MEDIUM',
      affectedKeys: stateKey ? [stateKey] : []
    };
  }, [criticalStateKeys]);

  /**
   * 报告状态管理异常
   */
  const reportStoreException = useCallback(async (error, context = {}) => {
    try {
      const classification = classifyStoreException(error, context);
      
      const enhancedContext = {
        type: 'store-exception',
        storeError: {
          classification,
          recoveryAttempts: recoveryAttempts,
          lastErrorTime: lastErrorTime,
          lastAction: lastActionRef.current,
          stateBackupCount: stateBackupsRef.current.length,
          url: window.location.href
        },
        ...context
      };

      const result = await frontendExceptionService.reportException(error, enhancedContext);
      
      return { classification, reportResult: result };
      
    } catch (reportError) {
      console.warn('[useStoreException] Failed to report store exception:', reportError);
      return { classification: classifyStoreException(error, context), reportResult: null };
    }
  }, [classifyStoreException, recoveryAttempts, lastErrorTime]);

  /**
   * 备份状态
   */
  const backupState = useCallback((state, actionType = null) => {
    if (!enableStateBackup) return;

    try {
      const backup = {
        state: JSON.parse(JSON.stringify(state)), // 深拷贝
        timestamp: Date.now(),
        actionType,
        id: Math.random().toString(36).substr(2, 9)
      };

      stateBackupsRef.current.unshift(backup);

      // 保持备份数量限制
      if (stateBackupsRef.current.length > maxBackupStates) {
        stateBackupsRef.current = stateBackupsRef.current.slice(0, maxBackupStates);
      }

    } catch (backupError) {
      console.warn('[useStoreException] Failed to backup state:', backupError);
    }
  }, [enableStateBackup, maxBackupStates]);

  /**
   * 获取最近的状态备份
   */
  const getLatestBackup = useCallback(() => {
    return stateBackupsRef.current[0] || null;
  }, []);

  /**
   * 获取指定时间前的状态备份
   */
  const getBackupBefore = useCallback((timestamp) => {
    return stateBackupsRef.current.find(backup => backup.timestamp < timestamp) || null;
  }, []);

  /**
   * 清除状态备份
   */
  const clearBackups = useCallback(() => {
    stateBackupsRef.current = [];
  }, []);

  /**
   * 执行状态恢复策略
   */
  const executeRecoveryStrategy = useCallback(async (strategy, error, context = {}, store = null) => {
    const { stateKey, actionType } = context;

    switch (strategy) {
      case StoreRecoveryStrategy.ROLLBACK_STATE:
        // 回滚到最近的备份状态
        const latestBackup = getLatestBackup();
        if (latestBackup && store && store.replaceState) {
          store.replaceState(latestBackup.state);
          return true;
        }
        return false;

      case StoreRecoveryStrategy.RESET_TO_INITIAL:
        // 重置到初始状态
        if (store && store.resetState) {
          store.resetState();
          return true;
        }
        return false;

      case StoreRecoveryStrategy.PARTIAL_RESET:
        // 部分重置（重置特定状态键）
        if (store && store.resetStateKey && stateKey) {
          store.resetStateKey(stateKey);
          return true;
        }
        return false;

      case StoreRecoveryStrategy.RETRY_ACTION:
        // 重试最后的 action
        if (store && store.dispatch && lastActionRef.current) {
          await new Promise(resolve => setTimeout(resolve, recoveryRetryDelay));
          store.dispatch(lastActionRef.current);
          return true;
        }
        return false;

      case StoreRecoveryStrategy.SKIP_ACTION:
        // 跳过当前 action，继续执行
        return true;

      case StoreRecoveryStrategy.RELOAD_FROM_STORAGE:
        // 从持久化存储重新加载
        if (store && store.rehydrate) {
          await store.rehydrate();
          return true;
        }
        return false;

      case StoreRecoveryStrategy.NO_ACTION:
      default:
        return false;
    }
  }, [getLatestBackup, recoveryRetryDelay]);

  /**
   * 处理状态管理异常
   */
  const handleStoreException = useCallback(async (error, context = {}, store = null) => {
    // 防止并发处理
    if (isRecoveringRef.current) {
      return { recovered: false, reason: 'already_recovering' };
    }

    try {
      isRecoveringRef.current = true;
      setIsRecovering(true);
      setLastErrorTime(Date.now());

      // 报告异常并获取分类
      const { classification } = await reportStoreException(error, context);
      
      // 更新状态
      setStoreError({
        error,
        classification,
        timestamp: Date.now(),
        context
      });

      // 调用自定义错误处理器
      if (onStoreError) {
        onStoreError(error, { classification, context });
      }

      // 如果不可恢复或未启用恢复，直接返回
      if (!enableAutoRecovery || !classification.recoverable) {
        return { recovered: false, reason: 'not_recoverable', classification };
      }

      // 执行恢复策略
      const recovered = await executeRecoveryStrategy(
        classification.strategy, 
        error, 
        context, 
        store
      );
      
      if (recovered) {
        // 恢复成功
        setStoreError(null);
        setRecoveryAttempts(0);
        recoveryAttemptsRef.current = 0;
        
        if (onRecoverySuccess) {
          onRecoverySuccess(error, classification);
        }
        
        return { recovered: true, classification };
      } else {
        // 恢复失败
        setRecoveryAttempts(prev => prev + 1);
        recoveryAttemptsRef.current += 1;
        
        if (onRecoveryFailed) {
          onRecoveryFailed(error, classification);
        }
        
        return { recovered: false, reason: 'recovery_failed', classification };
      }

    } catch (handlingError) {
      console.error('[useStoreException] Error handling store exception:', handlingError);
      
      // 报告处理错误
      await reportStoreException(handlingError, {
        type: 'store_exception_handling_error',
        originalError: error.message
      });
      
      return { recovered: false, reason: 'handling_error', error: handlingError };
      
    } finally {
      isRecoveringRef.current = false;
      setIsRecovering(false);
    }
  }, [
    reportStoreException, 
    enableAutoRecovery, 
    executeRecoveryStrategy, 
    onStoreError, 
    onRecoverySuccess, 
    onRecoveryFailed
  ]);

  /**
   * 包装 action dispatch 以捕获异常
   */
  const wrapDispatch = useCallback((originalDispatch, store = null) => {
    return async (action) => {
      try {
        // 记录当前 action
        lastActionRef.current = action;
        
        // 在 dispatch 前备份状态
        if (store && store.getState) {
          backupState(store.getState(), action.type);
        }
        
        // 执行原始 dispatch
        const result = await originalDispatch(action);
        
        return result;
        
      } catch (error) {
        // 处理 dispatch 异常
        const context = {
          actionType: action.type,
          actionPayload: action.payload,
          operation: 'dispatch'
        };
        
        await handleStoreException(error, context, store);
        
        // 重新抛出异常，让调用者知道 dispatch 失败
        throw error;
      }
    };
  }, [backupState, handleStoreException]);

  /**
   * 包装 selector 以捕获异常
   */
  const wrapSelector = useCallback((selector, stateKey = null) => {
    return (state, ...args) => {
      try {
        return selector(state, ...args);
      } catch (error) {
        // 处理 selector 异常
        const context = {
          stateKey,
          operation: 'select',
          selectorName: selector.name
        };
        
        handleStoreException(error, context);
        
        // 返回默认值或重新抛出异常
        return undefined;
      }
    };
  }, [handleStoreException]);

  /**
   * 清除状态错误
   */
  const clearStoreError = useCallback(() => {
    setStoreError(null);
    setRecoveryAttempts(0);
    setLastErrorTime(null);
    recoveryAttemptsRef.current = 0;
  }, []);

  /**
   * 手动触发状态恢复
   */
  const manualRecovery = useCallback(async (strategy = null, store = null) => {
    if (isRecoveringRef.current) {
      return { success: false, reason: 'already_recovering' };
    }

    if (!storeError) {
      return { success: false, reason: 'no_error_to_recover' };
    }

    try {
      setIsRecovering(true);
      
      const recoveryStrategy = strategy || storeError.classification.strategy;
      const success = await executeRecoveryStrategy(
        recoveryStrategy, 
        storeError.error, 
        storeError.context, 
        store
      );
      
      if (success) {
        clearStoreError();
      }
      
      return { success };
      
    } catch (error) {
      await reportStoreException(error, { type: 'manual_recovery_error' });
      return { success: false, error };
      
    } finally {
      setIsRecovering(false);
    }
  }, [storeError, executeRecoveryStrategy, clearStoreError, reportStoreException]);

  /**
   * 获取状态健康信息
   */
  const getStateHealth = useCallback(() => {
    return {
      hasError: !!storeError,
      isRecovering,
      recoveryAttempts,
      lastErrorTime,
      backupCount: stateBackupsRef.current.length,
      lastBackupTime: stateBackupsRef.current[0]?.timestamp || null
    };
  }, [storeError, isRecovering, recoveryAttempts, lastErrorTime]);

  // 清理资源
  useEffect(() => {
    return () => {
      clearBackups();
    };
  }, [clearBackups]);

  return {
    // 状态
    storeError,
    isRecovering,
    recoveryAttempts,
    lastErrorTime,
    
    // 方法
    handleStoreException,
    clearStoreError,
    manualRecovery,
    classifyStoreException,
    
    // 状态管理工具
    backupState,
    getLatestBackup,
    getBackupBefore,
    clearBackups,
    wrapDispatch,
    wrapSelector,
    getStateHealth,
    
    // 工具
    StoreExceptionType,
    StoreRecoveryStrategy
  };
}

export default useStoreException;