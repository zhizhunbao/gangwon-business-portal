/**
 * Hook Exception Hook - 自定义 Hook 异常 Hook
 * 
 * 处理自定义 Hook 异常，提供 Hook 错误恢复
 * 集成异常服务，支持 Hook 状态重置
 * Requirements: 6.4, 6.6
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { frontendExceptionService } from '@shared/utils/exception.service.js';

/**
 * Hook 异常类型枚举
 */
export const HookExceptionType = {
  HOOK_INITIALIZATION_ERROR: 'HOOK_INITIALIZATION_ERROR',
  HOOK_UPDATE_ERROR: 'HOOK_UPDATE_ERROR',
  HOOK_CLEANUP_ERROR: 'HOOK_CLEANUP_ERROR',
  HOOK_DEPENDENCY_ERROR: 'HOOK_DEPENDENCY_ERROR',
  HOOK_STATE_ERROR: 'HOOK_STATE_ERROR',
  HOOK_EFFECT_ERROR: 'HOOK_EFFECT_ERROR',
  HOOK_CALLBACK_ERROR: 'HOOK_CALLBACK_ERROR',
  HOOK_MEMO_ERROR: 'HOOK_MEMO_ERROR',
  HOOK_CONTEXT_ERROR: 'HOOK_CONTEXT_ERROR',
  HOOK_REDUCER_ERROR: 'HOOK_REDUCER_ERROR'
};

/**
 * Hook 恢复策略
 */
export const HookRecoveryStrategy = {
  RESET_HOOK_STATE: 'RESET_HOOK_STATE',
  RETRY_HOOK_OPERATION: 'RETRY_HOOK_OPERATION',
  FALLBACK_VALUE: 'FALLBACK_VALUE',
  SKIP_HOOK_UPDATE: 'SKIP_HOOK_UPDATE',
  REINITIALIZE_HOOK: 'REINITIALIZE_HOOK',
  DISABLE_HOOK: 'DISABLE_HOOK',
  NO_ACTION: 'NO_ACTION'
};

/**
 * Hook 异常 Hook
 * @param {Object} options - 配置选项
 * @returns {Object} Hook 异常处理接口
 */
export function useHookException(options = {}) {
  const {
    hookName = 'UnknownHook',
    enableAutoRecovery = true,
    maxRecoveryAttempts = 3,
    recoveryRetryDelay = 1000,
    enableStateBackup = true,
    fallbackValue = null,
    onHookError = null,
    onRecoverySuccess = null,
    onRecoveryFailed = null,
    criticalDependencies = []
  } = options;

  // 状态管理
  const [hookError, setHookError] = useState(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryAttempts, setRecoveryAttempts] = useState(0);
  const [lastErrorTime, setLastErrorTime] = useState(null);
  const [hookDisabled, setHookDisabled] = useState(false);

  // 引用管理
  const stateBackupRef = useRef(null);
  const dependenciesBackupRef = useRef(null);
  const recoveryAttemptsRef = useRef(0);
  const isRecoveringRef = useRef(false);
  const hookInitializedRef = useRef(false);

  /**
   * 分类 Hook 异常
   */
  const classifyHookException = useCallback((error, context = {}) => {
    const errorMessage = error.message?.toLowerCase() || '';
    const errorStack = error.stack?.toLowerCase() || '';
    const { phase, operation, dependencyName, hookType } = context;

    // 根据 Hook 生命周期阶段分类
    if (phase === 'initialization' || !hookInitializedRef.current) {
      return {
        type: HookExceptionType.HOOK_INITIALIZATION_ERROR,
        recoverable: true,
        strategy: HookRecoveryStrategy.REINITIALIZE_HOOK,
        severity: 'HIGH',
        phase: 'initialization'
      };
    }

    if (phase === 'cleanup' || errorMessage.includes('cleanup')) {
      return {
        type: HookExceptionType.HOOK_CLEANUP_ERROR,
        recoverable: true,
        strategy: HookRecoveryStrategy.SKIP_HOOK_UPDATE,
        severity: 'MEDIUM',
        phase: 'cleanup'
      };
    }

    if (phase === 'update' || errorMessage.includes('update')) {
      return {
        type: HookExceptionType.HOOK_UPDATE_ERROR,
        recoverable: true,
        strategy: HookRecoveryStrategy.RETRY_HOOK_OPERATION,
        severity: 'MEDIUM',
        phase: 'update'
      };
    }

    // 根据 Hook 类型分类
    if (hookType === 'useState' || errorMessage.includes('state') || operation === 'setState') {
      return {
        type: HookExceptionType.HOOK_STATE_ERROR,
        recoverable: true,
        strategy: HookRecoveryStrategy.RESET_HOOK_STATE,
        severity: 'MEDIUM',
        phase: 'state'
      };
    }

    if (hookType === 'useEffect' || errorMessage.includes('effect') || operation === 'effect') {
      return {
        type: HookExceptionType.HOOK_EFFECT_ERROR,
        recoverable: true,
        strategy: HookRecoveryStrategy.RETRY_HOOK_OPERATION,
        severity: 'MEDIUM',
        phase: 'effect'
      };
    }

    if (hookType === 'useCallback' || errorMessage.includes('callback') || operation === 'callback') {
      return {
        type: HookExceptionType.HOOK_CALLBACK_ERROR,
        recoverable: true,
        strategy: HookRecoveryStrategy.FALLBACK_VALUE,
        severity: 'LOW',
        phase: 'callback'
      };
    }

    if (hookType === 'useMemo' || errorMessage.includes('memo') || operation === 'memo') {
      return {
        type: HookExceptionType.HOOK_MEMO_ERROR,
        recoverable: true,
        strategy: HookRecoveryStrategy.FALLBACK_VALUE,
        severity: 'LOW',
        phase: 'memo'
      };
    }

    if (hookType === 'useContext' || errorMessage.includes('context') || operation === 'context') {
      return {
        type: HookExceptionType.HOOK_CONTEXT_ERROR,
        recoverable: true,
        strategy: HookRecoveryStrategy.FALLBACK_VALUE,
        severity: 'HIGH',
        phase: 'context'
      };
    }

    if (hookType === 'useReducer' || errorMessage.includes('reducer') || operation === 'reducer') {
      return {
        type: HookExceptionType.HOOK_REDUCER_ERROR,
        recoverable: true,
        strategy: HookRecoveryStrategy.RESET_HOOK_STATE,
        severity: 'HIGH',
        phase: 'reducer'
      };
    }

    // 根据依赖关系分类
    if (dependencyName || errorMessage.includes('dependenc')) {
      const isCriticalDep = criticalDependencies.includes(dependencyName);
      return {
        type: HookExceptionType.HOOK_DEPENDENCY_ERROR,
        recoverable: !isCriticalDep,
        strategy: isCriticalDep ? HookRecoveryStrategy.DISABLE_HOOK : HookRecoveryStrategy.FALLBACK_VALUE,
        severity: isCriticalDep ? 'CRITICAL' : 'MEDIUM',
        phase: 'dependency'
      };
    }

    // 默认分类
    return {
      type: HookExceptionType.HOOK_UPDATE_ERROR,
      recoverable: true,
      strategy: HookRecoveryStrategy.RETRY_HOOK_OPERATION,
      severity: 'MEDIUM',
      phase: 'unknown'
    };
  }, [criticalDependencies]);

  /**
   * 报告 Hook 异常
   */
  const reportHookException = useCallback(async (error, context = {}) => {
    try {
      const classification = classifyHookException(error, context);
      
      const enhancedContext = {
        type: 'hook-exception',
        hookError: {
          hookName,
          classification,
          recoveryAttempts: recoveryAttempts,
          lastErrorTime: lastErrorTime,
          hookDisabled,
          hasStateBackup: !!stateBackupRef.current,
          hasDependenciesBackup: !!dependenciesBackupRef.current,
          hookInitialized: hookInitializedRef.current,
          url: window.location.href
        },
        ...context
      };

      const result = await frontendExceptionService.reportException(error, enhancedContext);
      
      return { classification, reportResult: result };
      
    } catch (reportError) {
      console.warn('[useHookException] Failed to report hook exception:', reportError);
      return { classification: classifyHookException(error, context), reportResult: null };
    }
  }, [classifyHookException, hookName, recoveryAttempts, lastErrorTime, hookDisabled]);

  /**
   * 备份 Hook 状态
   */
  const backupHookState = useCallback((state) => {
    if (!enableStateBackup) return;

    try {
      stateBackupRef.current = JSON.parse(JSON.stringify(state));
    } catch (backupError) {
      console.warn('[useHookException] Failed to backup hook state:', backupError);
    }
  }, [enableStateBackup]);

  /**
   * 备份 Hook 依赖
   */
  const backupDependencies = useCallback((dependencies) => {
    if (!enableStateBackup) return;

    try {
      dependenciesBackupRef.current = JSON.parse(JSON.stringify(dependencies));
    } catch (backupError) {
      console.warn('[useHookException] Failed to backup hook dependencies:', backupError);
    }
  }, [enableStateBackup]);

  /**
   * 执行 Hook 恢复策略
   */
  const executeRecoveryStrategy = useCallback(async (strategy, error, context = {}) => {
    const { resetState, initialState, retryOperation } = context;

    switch (strategy) {
      case HookRecoveryStrategy.RESET_HOOK_STATE:
        // 重置 Hook 状态
        if (resetState) {
          resetState(initialState || stateBackupRef.current);
          return true;
        }
        return false;

      case HookRecoveryStrategy.RETRY_HOOK_OPERATION:
        // 重试 Hook 操作
        if (retryOperation) {
          await new Promise(resolve => setTimeout(resolve, recoveryRetryDelay));
          await retryOperation();
          return true;
        }
        return false;

      case HookRecoveryStrategy.FALLBACK_VALUE:
        // 使用回退值
        return fallbackValue !== null;

      case HookRecoveryStrategy.SKIP_HOOK_UPDATE:
        // 跳过 Hook 更新
        return true;

      case HookRecoveryStrategy.REINITIALIZE_HOOK:
        // 重新初始化 Hook
        hookInitializedRef.current = false;
        // 这里需要 Hook 层面的支持来重新初始化
        return true;

      case HookRecoveryStrategy.DISABLE_HOOK:
        // 禁用 Hook
        setHookDisabled(true);
        return true;

      case HookRecoveryStrategy.NO_ACTION:
      default:
        return false;
    }
  }, [recoveryRetryDelay, fallbackValue]);

  /**
   * 处理 Hook 异常
   */
  const handleHookException = useCallback(async (error, context = {}) => {
    // 防止并发处理
    if (isRecoveringRef.current) {
      return { recovered: false, reason: 'already_recovering' };
    }

    // 如果 Hook 已禁用，不处理异常
    if (hookDisabled) {
      return { recovered: false, reason: 'hook_disabled' };
    }

    try {
      isRecoveringRef.current = true;
      setIsRecovering(true);
      setLastErrorTime(Date.now());

      // 报告异常并获取分类
      const { classification } = await reportHookException(error, context);
      
      // 更新状态
      setHookError({
        error,
        classification,
        timestamp: Date.now(),
        context
      });

      // 调用自定义错误处理器
      if (onHookError) {
        onHookError(error, { classification, context });
      }

      // 如果不可恢复或未启用恢复，直接返回
      if (!enableAutoRecovery || !classification.recoverable) {
        return { recovered: false, reason: 'not_recoverable', classification };
      }

      // 检查恢复尝试次数
      if (recoveryAttemptsRef.current >= maxRecoveryAttempts) {
        return { recovered: false, reason: 'max_attempts_reached', classification };
      }

      // 执行恢复策略
      const recovered = await executeRecoveryStrategy(classification.strategy, error, context);
      
      if (recovered) {
        // 恢复成功
        setHookError(null);
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
      console.error('[useHookException] Error handling hook exception:', handlingError);
      
      // 报告处理错误
      await reportHookException(handlingError, {
        type: 'hook_exception_handling_error',
        originalError: error.message
      });
      
      return { recovered: false, reason: 'handling_error', error: handlingError };
      
    } finally {
      isRecoveringRef.current = false;
      setIsRecovering(false);
    }
  }, [
    hookDisabled,
    reportHookException, 
    enableAutoRecovery, 
    maxRecoveryAttempts,
    executeRecoveryStrategy, 
    onHookError, 
    onRecoverySuccess, 
    onRecoveryFailed
  ]);

  /**
   * 包装 Hook 操作以捕获异常
   */
  const wrapHookOperation = useCallback((operation, operationName = 'unknown', context = {}) => {
    return async (...args) => {
      if (hookDisabled) {
        return fallbackValue;
      }

      try {
        const result = await operation(...args);
        
        // 标记 Hook 已初始化
        if (!hookInitializedRef.current) {
          hookInitializedRef.current = true;
        }
        
        return result;
      } catch (error) {
        const enhancedContext = {
          operation: operationName,
          phase: hookInitializedRef.current ? 'update' : 'initialization',
          ...context
        };
        
        const { recovered } = await handleHookException(error, enhancedContext);
        
        // 如果恢复成功且有回退值，返回回退值
        if (recovered && fallbackValue !== null) {
          return fallbackValue;
        }
        
        // 如果 Hook 被禁用，返回回退值
        if (hookDisabled && fallbackValue !== null) {
          return fallbackValue;
        }
        
        // 重新抛出异常
        throw error;
      }
    };
  }, [hookDisabled, fallbackValue, handleHookException]);

  /**
   * 包装 useState Hook
   */
  const wrapUseState = useCallback((initialState, stateName = 'unknown') => {
    const wrappedInitialState = wrapHookOperation(
      () => initialState,
      'useState_init',
      { hookType: 'useState', stateName }
    );

    const [state, setState] = useState(wrappedInitialState);

    const wrappedSetState = useCallback((newState) => {
      return wrapHookOperation(
        () => setState(newState),
        'useState_update',
        { hookType: 'useState', stateName }
      )();
    }, [stateName]);

    // 备份状态
    useEffect(() => {
      backupHookState(state);
    }, [state]);

    return [state, wrappedSetState];
  }, [wrapHookOperation, backupHookState]);

  /**
   * 包装 useEffect Hook
   */
  const wrapUseEffect = useCallback((effect, deps, effectName = 'unknown') => {
    const wrappedEffect = wrapHookOperation(
      effect,
      'useEffect',
      { hookType: 'useEffect', effectName }
    );

    // 备份依赖
    useEffect(() => {
      backupDependencies(deps);
    }, [deps]);

    return useEffect(wrappedEffect, deps);
  }, [wrapHookOperation, backupDependencies]);

  /**
   * 清除 Hook 错误状态
   */
  const clearHookError = useCallback(() => {
    setHookError(null);
    setRecoveryAttempts(0);
    setLastErrorTime(null);
    recoveryAttemptsRef.current = 0;
  }, []);

  /**
   * 启用/禁用 Hook
   */
  const toggleHook = useCallback((enabled) => {
    setHookDisabled(!enabled);
    if (enabled) {
      clearHookError();
    }
  }, [clearHookError]);

  /**
   * 手动触发 Hook 恢复
   */
  const manualRecovery = useCallback(async (strategy = null, context = {}) => {
    if (isRecoveringRef.current) {
      return { success: false, reason: 'already_recovering' };
    }

    if (!hookError) {
      return { success: false, reason: 'no_error_to_recover' };
    }

    try {
      setIsRecovering(true);
      
      const recoveryStrategy = strategy || hookError.classification.strategy;
      const success = await executeRecoveryStrategy(recoveryStrategy, hookError.error, context);
      
      if (success) {
        clearHookError();
      }
      
      return { success };
      
    } catch (error) {
      await reportHookException(error, { type: 'manual_recovery_error' });
      return { success: false, error };
      
    } finally {
      setIsRecovering(false);
    }
  }, [hookError, executeRecoveryStrategy, clearHookError, reportHookException]);

  /**
   * 获取 Hook 健康信息
   */
  const getHookHealth = useCallback(() => {
    return {
      hookName,
      hasError: !!hookError,
      isRecovering,
      recoveryAttempts,
      lastErrorTime,
      hookDisabled,
      hookInitialized: hookInitializedRef.current,
      hasStateBackup: !!stateBackupRef.current,
      hasDependenciesBackup: !!dependenciesBackupRef.current
    };
  }, [hookName, hookError, isRecovering, recoveryAttempts, lastErrorTime, hookDisabled]);

  // 清理资源
  useEffect(() => {
    return () => {
      stateBackupRef.current = null;
      dependenciesBackupRef.current = null;
    };
  }, []);

  return {
    // 状态
    hookError,
    isRecovering,
    recoveryAttempts,
    lastErrorTime,
    hookDisabled,
    
    // 方法
    handleHookException,
    clearHookError,
    manualRecovery,
    classifyHookException,
    toggleHook,
    
    // 备份工具
    backupHookState,
    backupDependencies,
    
    // 包装器
    wrapHookOperation,
    wrapUseState,
    wrapUseEffect,
    
    // 工具
    getHookHealth,
    HookExceptionType,
    HookRecoveryStrategy
  };
}

export default useHookException;