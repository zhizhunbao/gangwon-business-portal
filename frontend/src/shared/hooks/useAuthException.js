/**
 * Authentication Exception Hook - 认证异常 Hook
 * 
 * 处理认证相关异常，提供认证错误恢复机制
 * 集成异常服务，支持自动 token 刷新
 * Requirements: 6.1, 6.6, 10.3
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { frontendExceptionService } from '@shared/utils/exception.service.js';
import { useAuth } from '@shared/hooks/useAuth';

/**
 * 认证异常类型枚举
 */
export const AuthExceptionType = {
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  REFRESH_FAILED: 'REFRESH_FAILED',
  LOGIN_REQUIRED: 'LOGIN_REQUIRED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  SESSION_TIMEOUT: 'SESSION_TIMEOUT',
  CONCURRENT_LOGIN: 'CONCURRENT_LOGIN',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED'
};

/**
 * 认证异常恢复策略
 */
export const AuthRecoveryStrategy = {
  AUTO_REFRESH: 'AUTO_REFRESH',
  REDIRECT_LOGIN: 'REDIRECT_LOGIN',
  SHOW_MODAL: 'SHOW_MODAL',
  SILENT_RETRY: 'SILENT_RETRY',
  NO_ACTION: 'NO_ACTION'
};

/**
 * 认证异常 Hook
 * @param {Object} options - 配置选项
 * @returns {Object} 认证异常处理接口
 */
export function useAuthException(options = {}) {
  const {
    enableAutoRefresh = true,
    maxRefreshAttempts = 3,
    refreshRetryDelay = 1000,
    enableRecovery = true,
    onAuthError = null,
    onRecoverySuccess = null,
    onRecoveryFailed = null
  } = options;

  const { 
    isAuthenticated, 
    getCurrentUser, 
    refreshToken, 
    logout,
    login 
  } = useAuth();

  // 状态管理
  const [authError, setAuthError] = useState(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryAttempts, setRecoveryAttempts] = useState(0);
  const [lastErrorTime, setLastErrorTime] = useState(null);

  // 引用管理
  const refreshAttemptsRef = useRef(0);
  const recoveryTimeoutRef = useRef(null);
  const isRecoveringRef = useRef(false);

  /**
   * 分类认证异常
   */
  const classifyAuthException = useCallback((error, context = {}) => {
    const status = error.response?.status;
    const errorCode = error.response?.data?.code;
    const errorMessage = error.message?.toLowerCase() || '';

    // 根据 HTTP 状态码分类
    if (status === 401) {
      if (errorCode === 'TOKEN_EXPIRED' || errorMessage.includes('expired')) {
        return {
          type: AuthExceptionType.TOKEN_EXPIRED,
          recoverable: true,
          strategy: AuthRecoveryStrategy.AUTO_REFRESH,
          severity: 'MEDIUM'
        };
      }
      
      if (errorCode === 'TOKEN_INVALID' || errorMessage.includes('invalid')) {
        return {
          type: AuthExceptionType.TOKEN_INVALID,
          recoverable: true,
          strategy: AuthRecoveryStrategy.REDIRECT_LOGIN,
          severity: 'HIGH'
        };
      }
      
      return {
        type: AuthExceptionType.LOGIN_REQUIRED,
        recoverable: true,
        strategy: AuthRecoveryStrategy.REDIRECT_LOGIN,
        severity: 'HIGH'
      };
    }

    if (status === 403) {
      if (errorCode === 'ACCOUNT_LOCKED') {
        return {
          type: AuthExceptionType.ACCOUNT_LOCKED,
          recoverable: false,
          strategy: AuthRecoveryStrategy.SHOW_MODAL,
          severity: 'CRITICAL'
        };
      }
      
      if (errorCode === 'ACCOUNT_SUSPENDED') {
        return {
          type: AuthExceptionType.ACCOUNT_SUSPENDED,
          recoverable: false,
          strategy: AuthRecoveryStrategy.SHOW_MODAL,
          severity: 'CRITICAL'
        };
      }
      
      return {
        type: AuthExceptionType.PERMISSION_DENIED,
        recoverable: false,
        strategy: AuthRecoveryStrategy.NO_ACTION,
        severity: 'MEDIUM'
      };
    }

    // 根据错误消息分类
    if (errorMessage.includes('session') && errorMessage.includes('timeout')) {
      return {
        type: AuthExceptionType.SESSION_TIMEOUT,
        recoverable: true,
        strategy: AuthRecoveryStrategy.AUTO_REFRESH,
        severity: 'MEDIUM'
      };
    }

    if (errorMessage.includes('concurrent') || errorMessage.includes('multiple')) {
      return {
        type: AuthExceptionType.CONCURRENT_LOGIN,
        recoverable: true,
        strategy: AuthRecoveryStrategy.SHOW_MODAL,
        severity: 'HIGH'
      };
    }

    // 默认分类
    return {
      type: AuthExceptionType.LOGIN_REQUIRED,
      recoverable: true,
      strategy: AuthRecoveryStrategy.REDIRECT_LOGIN,
      severity: 'MEDIUM'
    };
  }, []);

  /**
   * 报告认证异常
   */
  const reportAuthException = useCallback(async (error, context = {}) => {
    try {
      const classification = classifyAuthException(error, context);
      
      const enhancedContext = {
        type: 'auth-exception',
        authError: {
          classification,
          isAuthenticated,
          recoveryAttempts: recoveryAttempts,
          lastErrorTime: lastErrorTime,
          userAgent: navigator.userAgent,
          url: window.location.href
        },
        ...context
      };

      const result = await frontendExceptionService.reportException(error, enhancedContext);
      
      return { classification, reportResult: result };
      
    } catch (reportError) {
      console.warn('[useAuthException] Failed to report auth exception:', reportError);
      return { classification: classifyAuthException(error, context), reportResult: null };
    }
  }, [classifyAuthException, isAuthenticated, recoveryAttempts, lastErrorTime]);

  /**
   * 自动刷新 token
   */
  const attemptTokenRefresh = useCallback(async () => {
    if (!enableAutoRefresh || refreshAttemptsRef.current >= maxRefreshAttempts) {
      return false;
    }

    try {
      refreshAttemptsRef.current += 1;
      
      await refreshToken();
      
      // 验证刷新是否成功
      await getCurrentUser();
      
      // 重置计数器
      refreshAttemptsRef.current = 0;
      
      return true;
      
    } catch (refreshError) {
      console.warn(`[useAuthException] Token refresh attempt ${refreshAttemptsRef.current} failed:`, refreshError);
      
      // 如果达到最大重试次数，报告刷新失败
      if (refreshAttemptsRef.current >= maxRefreshAttempts) {
        await reportAuthException(new Error('Token refresh failed after maximum attempts'), {
          type: AuthExceptionType.REFRESH_FAILED,
          attempts: refreshAttemptsRef.current
        });
      }
      
      return false;
    }
  }, [enableAutoRefresh, maxRefreshAttempts, refreshToken, getCurrentUser, reportAuthException]);

  /**
   * 执行恢复策略
   */
  const executeRecoveryStrategy = useCallback(async (strategy, error, context = {}) => {
    switch (strategy) {
      case AuthRecoveryStrategy.AUTO_REFRESH:
        return await attemptTokenRefresh();
        
      case AuthRecoveryStrategy.REDIRECT_LOGIN:
        // 清除认证状态
        await logout();
        
        // 保存当前页面用于登录后重定向
        const currentPath = window.location.pathname + window.location.search;
        if (currentPath !== '/login') {
          sessionStorage.setItem('redirectAfterLogin', currentPath);
        }
        
        // 重定向到登录页面
        window.location.href = '/login';
        return true;
        
      case AuthRecoveryStrategy.SHOW_MODAL:
        // 触发模态框显示
        if (onAuthError) {
          onAuthError(error, context);
        }
        return false;
        
      case AuthRecoveryStrategy.SILENT_RETRY:
        // 静默重试（延迟后重新尝试）
        await new Promise(resolve => setTimeout(resolve, refreshRetryDelay));
        return await attemptTokenRefresh();
        
      case AuthRecoveryStrategy.NO_ACTION:
      default:
        return false;
    }
  }, [attemptTokenRefresh, logout, refreshRetryDelay, onAuthError]);

  /**
   * 处理认证异常
   */
  const handleAuthException = useCallback(async (error, context = {}) => {
    // 防止并发处理
    if (isRecoveringRef.current) {
      return { recovered: false, reason: 'already_recovering' };
    }

    try {
      isRecoveringRef.current = true;
      setIsRecovering(true);
      setLastErrorTime(Date.now());

      // 报告异常并获取分类
      const { classification } = await reportAuthException(error, context);
      
      // 更新状态
      setAuthError({
        error,
        classification,
        timestamp: Date.now(),
        context
      });

      // 调用自定义错误处理器
      if (onAuthError) {
        onAuthError(error, { classification, context });
      }

      // 如果不可恢复或未启用恢复，直接返回
      if (!enableRecovery || !classification.recoverable) {
        return { recovered: false, reason: 'not_recoverable', classification };
      }

      // 执行恢复策略
      const recovered = await executeRecoveryStrategy(classification.strategy, error, context);
      
      if (recovered) {
        // 恢复成功
        setAuthError(null);
        setRecoveryAttempts(0);
        refreshAttemptsRef.current = 0;
        
        if (onRecoverySuccess) {
          onRecoverySuccess(error, classification);
        }
        
        return { recovered: true, classification };
      } else {
        // 恢复失败
        setRecoveryAttempts(prev => prev + 1);
        
        if (onRecoveryFailed) {
          onRecoveryFailed(error, classification);
        }
        
        return { recovered: false, reason: 'recovery_failed', classification };
      }

    } catch (handlingError) {
      console.error('[useAuthException] Error handling auth exception:', handlingError);
      
      // 报告处理错误
      await reportAuthException(handlingError, {
        type: 'auth_exception_handling_error',
        originalError: error.message
      });
      
      return { recovered: false, reason: 'handling_error', error: handlingError };
      
    } finally {
      isRecoveringRef.current = false;
      setIsRecovering(false);
    }
  }, [
    reportAuthException, 
    enableRecovery, 
    executeRecoveryStrategy, 
    onAuthError, 
    onRecoverySuccess, 
    onRecoveryFailed
  ]);

  /**
   * 清除认证错误状态
   */
  const clearAuthError = useCallback(() => {
    setAuthError(null);
    setRecoveryAttempts(0);
    setLastErrorTime(null);
    refreshAttemptsRef.current = 0;
  }, []);

  /**
   * 手动触发 token 刷新
   */
  const manualRefresh = useCallback(async () => {
    if (isRecoveringRef.current) {
      return { success: false, reason: 'already_recovering' };
    }

    try {
      setIsRecovering(true);
      const success = await attemptTokenRefresh();
      
      if (success) {
        clearAuthError();
      }
      
      return { success };
      
    } catch (error) {
      await reportAuthException(error, { type: 'manual_refresh_error' });
      return { success: false, error };
      
    } finally {
      setIsRecovering(false);
    }
  }, [attemptTokenRefresh, clearAuthError, reportAuthException]);

  /**
   * 检查是否需要认证
   */
  const checkAuthRequired = useCallback(async () => {
    if (!isAuthenticated) {
      const error = new Error('Authentication required');
      await handleAuthException(error, { type: 'auth_check' });
      return false;
    }
    return true;
  }, [isAuthenticated, handleAuthException]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (recoveryTimeoutRef.current) {
        clearTimeout(recoveryTimeoutRef.current);
      }
    };
  }, []);

  // 监听认证状态变化
  useEffect(() => {
    if (isAuthenticated && authError) {
      // 认证状态恢复，清除错误
      clearAuthError();
    }
  }, [isAuthenticated, authError, clearAuthError]);

  return {
    // 状态
    authError,
    isRecovering,
    recoveryAttempts,
    lastErrorTime,
    
    // 方法
    handleAuthException,
    clearAuthError,
    manualRefresh,
    checkAuthRequired,
    classifyAuthException,
    
    // 工具
    AuthExceptionType,
    AuthRecoveryStrategy
  };
}

export default useAuthException;