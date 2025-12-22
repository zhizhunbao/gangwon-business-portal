/**
 * Component Exception Hook - 组件异常 Hook
 * 
 * 处理组件特定异常，提供组件错误恢复
 * 集成异常服务，支持组件重新渲染
 * Requirements: 6.3, 6.6
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { frontendExceptionService } from '@shared/utils/exception.service.js';

/**
 * 组件异常类型枚举
 */
export const ComponentExceptionType = {
  RENDER_ERROR: 'RENDER_ERROR',
  LIFECYCLE_ERROR: 'LIFECYCLE_ERROR',
  EVENT_HANDLER_ERROR: 'EVENT_HANDLER_ERROR',
  PROP_VALIDATION_ERROR: 'PROP_VALIDATION_ERROR',
  STATE_UPDATE_ERROR: 'STATE_UPDATE_ERROR',
  EFFECT_ERROR: 'EFFECT_ERROR',
  CALLBACK_ERROR: 'CALLBACK_ERROR',
  MEMO_ERROR: 'MEMO_ERROR',
  REF_ERROR: 'REF_ERROR',
  CONTEXT_ERROR: 'CONTEXT_ERROR'
};

/**
 * 组件恢复策略
 */
export const ComponentRecoveryStrategy = {
  FORCE_RERENDER: 'FORCE_RERENDER',
  RESET_STATE: 'RESET_STATE',
  FALLBACK_RENDER: 'FALLBACK_RENDER',
  RETRY_OPERATION: 'RETRY_OPERATION',
  SKIP_RENDER: 'SKIP_RENDER',
  UNMOUNT_REMOUNT: 'UNMOUNT_REMOUNT',
  NO_ACTION: 'NO_ACTION'
};

/**
 * 组件异常 Hook
 * @param {Object} options - 配置选项
 * @returns {Object} 组件异常处理接口
 */
export function useComponentException(options = {}) {
  const {
    componentName = 'UnknownComponent',
    enableAutoRecovery = true,
    maxRecoveryAttempts = 3,
    recoveryRetryDelay = 1000,
    enableStateBackup = true,
    fallbackComponent = null,
    onComponentError = null,
    onRecoverySuccess = null,
    onRecoveryFailed = null,
    criticalProps = []
  } = options;

  // 状态管理
  const [componentError, setComponentError] = useState(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryAttempts, setRecoveryAttempts] = useState(0);
  const [lastErrorTime, setLastErrorTime] = useState(null);
  const [renderKey, setRenderKey] = useState(0);

  // 引用管理
  const stateBackupRef = useRef(null);
  const propsBackupRef = useRef(null);
  const recoveryAttemptsRef = useRef(0);
  const isRecoveringRef = useRef(false);
  const mountedRef = useRef(true);

  /**
   * 分类组件异常
   */
  const classifyComponentException = useCallback((error, context = {}) => {
    const errorMessage = error.message?.toLowerCase() || '';
    const errorStack = error.stack?.toLowerCase() || '';
    const { phase, operation, propName } = context;

    // 根据生命周期阶段分类
    if (phase === 'render' || errorStack.includes('render')) {
      return {
        type: ComponentExceptionType.RENDER_ERROR,
        recoverable: true,
        strategy: ComponentRecoveryStrategy.FALLBACK_RENDER,
        severity: 'HIGH',
        phase: 'render'
      };
    }

    if (phase === 'mount' || phase === 'unmount' || errorMessage.includes('lifecycle')) {
      return {
        type: ComponentExceptionType.LIFECYCLE_ERROR,
        recoverable: true,
        strategy: ComponentRecoveryStrategy.UNMOUNT_REMOUNT,
        severity: 'HIGH',
        phase: phase || 'lifecycle'
      };
    }

    if (phase === 'effect' || errorStack.includes('useeffect') || errorMessage.includes('effect')) {
      return {
        type: ComponentExceptionType.EFFECT_ERROR,
        recoverable: true,
        strategy: ComponentRecoveryStrategy.RETRY_OPERATION,
        severity: 'MEDIUM',
        phase: 'effect'
      };
    }

    // 根据操作类型分类
    if (operation === 'event' || errorMessage.includes('event') || errorMessage.includes('handler')) {
      return {
        type: ComponentExceptionType.EVENT_HANDLER_ERROR,
        recoverable: true,
        strategy: ComponentRecoveryStrategy.RETRY_OPERATION,
        severity: 'MEDIUM',
        phase: 'event'
      };
    }

    if (operation === 'setState' || errorMessage.includes('state') || errorMessage.includes('setstate')) {
      return {
        type: ComponentExceptionType.STATE_UPDATE_ERROR,
        recoverable: true,
        strategy: ComponentRecoveryStrategy.RESET_STATE,
        severity: 'MEDIUM',
        phase: 'state'
      };
    }

    if (operation === 'callback' || errorMessage.includes('callback')) {
      return {
        type: ComponentExceptionType.CALLBACK_ERROR,
        recoverable: true,
        strategy: ComponentRecoveryStrategy.RETRY_OPERATION,
        severity: 'LOW',
        phase: 'callback'
      };
    }

    if (errorMessage.includes('prop') || errorMessage.includes('validation') || propName) {
      const isCriticalProp = criticalProps.includes(propName);
      return {
        type: ComponentExceptionType.PROP_VALIDATION_ERROR,
        recoverable: !isCriticalProp,
        strategy: isCriticalProp ? ComponentRecoveryStrategy.FALLBACK_RENDER : ComponentRecoveryStrategy.SKIP_RENDER,
        severity: isCriticalProp ? 'CRITICAL' : 'LOW',
        phase: 'props'
      };
    }

    if (errorMessage.includes('memo') || errorMessage.includes('usememo')) {
      return {
        type: ComponentExceptionType.MEMO_ERROR,
        recoverable: true,
        strategy: ComponentRecoveryStrategy.FORCE_RERENDER,
        severity: 'LOW',
        phase: 'memo'
      };
    }

    if (errorMessage.includes('ref') || errorMessage.includes('useref')) {
      return {
        type: ComponentExceptionType.REF_ERROR,
        recoverable: true,
        strategy: ComponentRecoveryStrategy.RETRY_OPERATION,
        severity: 'MEDIUM',
        phase: 'ref'
      };
    }

    if (errorMessage.includes('context') || errorMessage.includes('usecontext')) {
      return {
        type: ComponentExceptionType.CONTEXT_ERROR,
        recoverable: true,
        strategy: ComponentRecoveryStrategy.FORCE_RERENDER,
        severity: 'HIGH',
        phase: 'context'
      };
    }

    // 默认分类
    return {
      type: ComponentExceptionType.RENDER_ERROR,
      recoverable: true,
      strategy: ComponentRecoveryStrategy.FALLBACK_RENDER,
      severity: 'MEDIUM',
      phase: 'unknown'
    };
  }, [criticalProps]);

  /**
   * 报告组件异常
   */
  const reportComponentException = useCallback(async (error, context = {}) => {
    try {
      const classification = classifyComponentException(error, context);
      
      const enhancedContext = {
        type: 'component-exception',
        componentError: {
          componentName,
          classification,
          recoveryAttempts: recoveryAttempts,
          lastErrorTime: lastErrorTime,
          renderKey,
          hasStateBackup: !!stateBackupRef.current,
          hasPropsBackup: !!propsBackupRef.current,
          url: window.location.href
        },
        ...context
      };

      const result = await frontendExceptionService.reportException(error, enhancedContext);
      
      return { classification, reportResult: result };
      
    } catch (reportError) {
      console.warn('[useComponentException] Failed to report component exception:', reportError);
      return { classification: classifyComponentException(error, context), reportResult: null };
    }
  }, [classifyComponentException, componentName, recoveryAttempts, lastErrorTime, renderKey]);

  /**
   * 备份组件状态
   */
  const backupState = useCallback((state) => {
    if (!enableStateBackup) return;

    try {
      stateBackupRef.current = JSON.parse(JSON.stringify(state));
    } catch (backupError) {
      console.warn('[useComponentException] Failed to backup component state:', backupError);
    }
  }, [enableStateBackup]);

  /**
   * 备份组件 props
   */
  const backupProps = useCallback((props) => {
    if (!enableStateBackup) return;

    try {
      propsBackupRef.current = JSON.parse(JSON.stringify(props));
    } catch (backupError) {
      console.warn('[useComponentException] Failed to backup component props:', backupError);
    }
  }, [enableStateBackup]);

  /**
   * 强制重新渲染
   */
  const forceRerender = useCallback(() => {
    setRenderKey(prev => prev + 1);
  }, []);

  /**
   * 执行组件恢复策略
   */
  const executeRecoveryStrategy = useCallback(async (strategy, error, context = {}) => {
    const { setState, resetState } = context;

    switch (strategy) {
      case ComponentRecoveryStrategy.FORCE_RERENDER:
        // 强制重新渲染
        forceRerender();
        return true;

      case ComponentRecoveryStrategy.RESET_STATE:
        // 重置组件状态
        if (resetState) {
          resetState();
          return true;
        } else if (setState && stateBackupRef.current) {
          setState(stateBackupRef.current);
          return true;
        }
        return false;

      case ComponentRecoveryStrategy.FALLBACK_RENDER:
        // 使用回退渲染
        if (fallbackComponent) {
          // 这里需要组件层面的支持来渲染回退组件
          return true;
        }
        return false;

      case ComponentRecoveryStrategy.RETRY_OPERATION:
        // 重试操作
        await new Promise(resolve => setTimeout(resolve, recoveryRetryDelay));
        return true;

      case ComponentRecoveryStrategy.SKIP_RENDER:
        // 跳过当前渲染
        return true;

      case ComponentRecoveryStrategy.UNMOUNT_REMOUNT:
        // 卸载并重新挂载组件
        forceRerender();
        return true;

      case ComponentRecoveryStrategy.NO_ACTION:
      default:
        return false;
    }
  }, [forceRerender, fallbackComponent, recoveryRetryDelay]);

  /**
   * 处理组件异常
   */
  const handleComponentException = useCallback(async (error, context = {}) => {
    // 防止并发处理
    if (isRecoveringRef.current) {
      return { recovered: false, reason: 'already_recovering' };
    }

    // 检查组件是否已卸载
    if (!mountedRef.current) {
      return { recovered: false, reason: 'component_unmounted' };
    }

    try {
      isRecoveringRef.current = true;
      setIsRecovering(true);
      setLastErrorTime(Date.now());

      // 报告异常并获取分类
      const { classification } = await reportComponentException(error, context);
      
      // 更新状态
      setComponentError({
        error,
        classification,
        timestamp: Date.now(),
        context
      });

      // 调用自定义错误处理器
      if (onComponentError) {
        onComponentError(error, { classification, context });
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
        setComponentError(null);
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
      console.error('[useComponentException] Error handling component exception:', handlingError);
      
      // 报告处理错误
      await reportComponentException(handlingError, {
        type: 'component_exception_handling_error',
        originalError: error.message
      });
      
      return { recovered: false, reason: 'handling_error', error: handlingError };
      
    } finally {
      isRecoveringRef.current = false;
      setIsRecovering(false);
    }
  }, [
    reportComponentException, 
    enableAutoRecovery, 
    maxRecoveryAttempts,
    executeRecoveryStrategy, 
    onComponentError, 
    onRecoverySuccess, 
    onRecoveryFailed
  ]);

  /**
   * 包装事件处理器以捕获异常
   */
  const wrapEventHandler = useCallback((handler, eventName = 'unknown') => {
    return async (...args) => {
      try {
        return await handler(...args);
      } catch (error) {
        const context = {
          operation: 'event',
          eventName,
          phase: 'event'
        };
        
        await handleComponentException(error, context);
        
        // 可以选择重新抛出异常或返回默认值
        throw error;
      }
    };
  }, [handleComponentException]);

  /**
   * 包装 useEffect 以捕获异常
   */
  const wrapEffect = useCallback((effect, deps, effectName = 'unknown') => {
    return useEffect(() => {
      const wrappedEffect = async () => {
        try {
          return await effect();
        } catch (error) {
          const context = {
            operation: 'effect',
            effectName,
            phase: 'effect'
          };
          
          await handleComponentException(error, context);
        }
      };
      
      wrappedEffect();
    }, deps);
  }, [handleComponentException]);

  /**
   * 包装状态更新以捕获异常
   */
  const wrapSetState = useCallback((setState, stateName = 'unknown') => {
    return (newState) => {
      try {
        setState(newState);
      } catch (error) {
        const context = {
          operation: 'setState',
          stateName,
          phase: 'state'
        };
        
        handleComponentException(error, context);
      }
    };
  }, [handleComponentException]);

  /**
   * 清除组件错误状态
   */
  const clearComponentError = useCallback(() => {
    setComponentError(null);
    setRecoveryAttempts(0);
    setLastErrorTime(null);
    recoveryAttemptsRef.current = 0;
  }, []);

  /**
   * 手动触发组件恢复
   */
  const manualRecovery = useCallback(async (strategy = null, context = {}) => {
    if (isRecoveringRef.current) {
      return { success: false, reason: 'already_recovering' };
    }

    if (!componentError) {
      return { success: false, reason: 'no_error_to_recover' };
    }

    try {
      setIsRecovering(true);
      
      const recoveryStrategy = strategy || componentError.classification.strategy;
      const success = await executeRecoveryStrategy(recoveryStrategy, componentError.error, context);
      
      if (success) {
        clearComponentError();
      }
      
      return { success };
      
    } catch (error) {
      await reportComponentException(error, { type: 'manual_recovery_error' });
      return { success: false, error };
      
    } finally {
      setIsRecovering(false);
    }
  }, [componentError, executeRecoveryStrategy, clearComponentError, reportComponentException]);

  /**
   * 获取组件健康信息
   */
  const getComponentHealth = useCallback(() => {
    return {
      componentName,
      hasError: !!componentError,
      isRecovering,
      recoveryAttempts,
      lastErrorTime,
      renderKey,
      hasStateBackup: !!stateBackupRef.current,
      hasPropsBackup: !!propsBackupRef.current
    };
  }, [componentName, componentError, isRecovering, recoveryAttempts, lastErrorTime, renderKey]);

  // 组件挂载状态管理
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // 清理资源
  useEffect(() => {
    return () => {
      stateBackupRef.current = null;
      propsBackupRef.current = null;
    };
  }, []);

  return {
    // 状态
    componentError,
    isRecovering,
    recoveryAttempts,
    lastErrorTime,
    renderKey,
    
    // 方法
    handleComponentException,
    clearComponentError,
    manualRecovery,
    classifyComponentException,
    forceRerender,
    
    // 备份工具
    backupState,
    backupProps,
    
    // 包装器
    wrapEventHandler,
    wrapEffect,
    wrapSetState,
    
    // 工具
    getComponentHealth,
    ComponentExceptionType,
    ComponentRecoveryStrategy
  };
}

export default useComponentException;