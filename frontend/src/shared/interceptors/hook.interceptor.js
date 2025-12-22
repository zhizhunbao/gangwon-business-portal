/**
 * Hook Interceptor - React Hook拦截器
 * 
 * 自动为React Hooks添加AOP日志功能，实现Hook级别的自动日志记录。
 * 
 * Features:
 * - 拦截React Hook调用
 * - 记录Hook执行时间和性能
 * - 自动错误捕获和报告
 * - Hook依赖变化追踪
 * - 支持自定义Hook监控
 * 
 * Requirements: 4.3, 4.4
 */

import React from 'react';
import { info, debug, warn, LOG_LAYERS } from '@shared/utils/logger';

// 存储原始的React Hooks
const originalHooks = {
  useState: React.useState,
  useEffect: React.useEffect,
  useContext: React.useContext,
  useReducer: React.useReducer,
  useCallback: React.useCallback,
  useMemo: React.useMemo,
  useRef: React.useRef,
  useImperativeHandle: React.useImperativeHandle,
  useLayoutEffect: React.useLayoutEffect,
  useDebugValue: React.useDebugValue
};

// 拦截器状态
let isInstalled = false;
let hookCallCount = 0;

// Hook统计信息
const hookStats = {
  totalCalls: 0,
  callsByType: {},
  slowHooks: [],
  errors: []
};

/**
 * 获取调用栈中的组件名称
 * @returns {string} 组件名称
 */
function getCallerComponentName() {
  try {
    const error = new Error();
    const stack = error.stack || '';
    
    // 查找React组件相关的栈信息
    const lines = stack.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('at ') && 
          !line.includes('hookInterceptor') && 
          !line.includes('React.') &&
          !line.includes('node_modules')) {
        
        // 提取函数名
        const match = line.match(/at\s+([^\s(]+)/);
        if (match && match[1]) {
          return match[1];
        }
      }
    }
    
    return 'Unknown';
  } catch (error) {
    return 'Unknown';
  }
}

/**
 * 创建Hook拦截器
 * @param {string} hookName - Hook名称
 * @param {Function} originalHook - 原始Hook函数
 * @returns {Function} 拦截后的Hook函数
 */
function createHookInterceptor(hookName, originalHook) {
  return function interceptedHook(...args) {
    const startTime = performance.now();
    const componentName = getCallerComponentName();
    const callId = ++hookCallCount;
    
    // 更新统计信息
    hookStats.totalCalls++;
    hookStats.callsByType[hookName] = (hookStats.callsByType[hookName] || 0) + 1;
    
    try {
      // 记录Hook调用开始
      debug(LOG_LAYERS.HOOK, `Hook Call Start: ${hookName}`, {
        hook_name: hookName,
        component_name: componentName,
        call_id: callId,
        args_count: args.length,
        timestamp: new Date().toISOString()
      });
      
      // 调用原始Hook
      const result = originalHook.apply(this, args);
      
      // 计算执行时间
      const executionTime = Math.round(performance.now() - startTime);
      
      // 记录Hook调用完成
      debug(LOG_LAYERS.HOOK, `Hook Call Complete: ${hookName}`, {
        hook_name: hookName,
        component_name: componentName,
        call_id: callId,
        execution_time_ms: executionTime,
        has_result: result !== undefined
      });
      
      // 检查慢Hook
      if (executionTime > 5) { // 5ms阈值
        warn(LOG_LAYERS.HOOK, `Slow Hook Detected: ${hookName}`, {
          hook_name: hookName,
          component_name: componentName,
          execution_time_ms: executionTime,
          performance_issue: 'SLOW_HOOK_EXECUTION',
          threshold_ms: 5
        });
        
        hookStats.slowHooks.push({
          hookName,
          componentName,
          executionTime,
          timestamp: new Date().toISOString()
        });
      }
      
      return result;
      
    } catch (error) {
      const executionTime = Math.round(performance.now() - startTime);
      
      // 记录Hook错误
      warn(LOG_LAYERS.HOOK, `Hook Error: ${hookName}`, {
        hook_name: hookName,
        component_name: componentName,
        call_id: callId,
        execution_time_ms: executionTime,
        error_message: error.message,
        error_stack: error.stack
      });
      
      hookStats.errors.push({
        hookName,
        componentName,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  };
}

/**
 * 创建useEffect拦截器（特殊处理）
 * @param {Function} originalUseEffect - 原始useEffect
 * @returns {Function} 拦截后的useEffect
 */
function createUseEffectInterceptor(originalUseEffect) {
  return function interceptedUseEffect(effect, deps) {
    const componentName = getCallerComponentName();
    const callId = ++hookCallCount;
    
    // 包装effect函数
    const wrappedEffect = function() {
      const startTime = performance.now();
      
      try {
        debug(LOG_LAYERS.HOOK, `Effect Start: ${componentName}`, {
          hook_name: 'useEffect',
          component_name: componentName,
          call_id: callId,
          has_dependencies: Array.isArray(deps),
          deps_count: Array.isArray(deps) ? deps.length : 0
        });
        
        const result = effect();
        
        const executionTime = Math.round(performance.now() - startTime);
        
        debug(LOG_LAYERS.HOOK, `Effect Complete: ${componentName}`, {
          hook_name: 'useEffect',
          component_name: componentName,
          call_id: callId,
          execution_time_ms: executionTime,
          has_cleanup: typeof result === 'function'
        });
        
        // 如果返回清理函数，也要包装它
        if (typeof result === 'function') {
          return function wrappedCleanup() {
            const cleanupStartTime = performance.now();
            
            try {
              debug(LOG_LAYERS.HOOK, `Effect Cleanup Start: ${componentName}`, {
                hook_name: 'useEffect',
                component_name: componentName,
                call_id: callId,
                lifecycle_event: 'cleanup'
              });
              
              const cleanupResult = result();
              
              const cleanupTime = Math.round(performance.now() - cleanupStartTime);
              
              debug(LOG_LAYERS.HOOK, `Effect Cleanup Complete: ${componentName}`, {
                hook_name: 'useEffect',
                component_name: componentName,
                call_id: callId,
                cleanup_time_ms: cleanupTime
              });
              
              return cleanupResult;
            } catch (error) {
              warn(LOG_LAYERS.HOOK, `Effect Cleanup Error: ${componentName}`, {
                hook_name: 'useEffect',
                component_name: componentName,
                call_id: callId,
                error_message: error.message
              });
              throw error;
            }
          };
        }
        
        return result;
      } catch (error) {
        const executionTime = Math.round(performance.now() - startTime);
        
        warn(LOG_LAYERS.HOOK, `Effect Error: ${componentName}`, {
          hook_name: 'useEffect',
          component_name: componentName,
          call_id: callId,
          execution_time_ms: executionTime,
          error_message: error.message
        });
        
        throw error;
      }
    };
    
    return originalUseEffect(wrappedEffect, deps);
  };
}

/**
 * 安装Hook拦截器
 * @returns {boolean} 是否安装成功
 */
export function installHookInterceptor() {
  if (isInstalled) {
    console.warn('[HookInterceptor] Already installed');
    return false;
  }
  
  try {
    // 拦截常用的React Hooks
    React.useState = createHookInterceptor('useState', originalHooks.useState);
    React.useEffect = createUseEffectInterceptor(originalHooks.useEffect);
    React.useContext = createHookInterceptor('useContext', originalHooks.useContext);
    React.useReducer = createHookInterceptor('useReducer', originalHooks.useReducer);
    React.useCallback = createHookInterceptor('useCallback', originalHooks.useCallback);
    React.useMemo = createHookInterceptor('useMemo', originalHooks.useMemo);
    React.useRef = createHookInterceptor('useRef', originalHooks.useRef);
    React.useImperativeHandle = createHookInterceptor('useImperativeHandle', originalHooks.useImperativeHandle);
    React.useLayoutEffect = createUseEffectInterceptor(originalHooks.useLayoutEffect);
    
    isInstalled = true;
    
    // 只在开发环境且启用调试日志时显示安装成功信息
    if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_AOP_DEBUG_LOGS === 'true') {
      console.log('[HookInterceptor] Installed successfully');
    }
    
    return true;
  } catch (error) {
    console.error('[HookInterceptor] Failed to install:', error);
    return false;
  }
}

/**
 * 卸载Hook拦截器
 * @returns {boolean} 是否卸载成功
 */
export function uninstallHookInterceptor() {
  if (!isInstalled) {
    console.warn('[HookInterceptor] Not installed');
    return false;
  }
  
  try {
    // 恢复原始Hooks
    Object.keys(originalHooks).forEach(hookName => {
      if (React[hookName]) {
        React[hookName] = originalHooks[hookName];
      }
    });
    
    isInstalled = false;
    
    if (import.meta.env.DEV) {
      console.log('[HookInterceptor] Uninstalled successfully');
    }
    
    return true;
  } catch (error) {
    console.error('[HookInterceptor] Failed to uninstall:', error);
    return false;
  }
}

/**
 * 检查拦截器是否已安装
 * @returns {boolean} 是否已安装
 */
export function isHookInterceptorInstalled() {
  return isInstalled;
}

/**
 * 获取Hook统计信息
 * @returns {Object} 统计信息
 */
export function getHookInterceptorStats() {
  return {
    isInstalled,
    totalCalls: hookStats.totalCalls,
    callsByType: { ...hookStats.callsByType },
    slowHooksCount: hookStats.slowHooks.length,
    errorsCount: hookStats.errors.length,
    recentSlowHooks: hookStats.slowHooks.slice(-5),
    recentErrors: hookStats.errors.slice(-5)
  };
}

/**
 * 重置Hook统计信息
 */
export function resetHookInterceptorStats() {
  hookStats.totalCalls = 0;
  hookStats.callsByType = {};
  hookStats.slowHooks = [];
  hookStats.errors = [];
  hookCallCount = 0;
}

// 默认导出
export default {
  install: installHookInterceptor,
  uninstall: uninstallHookInterceptor,
  isInstalled: isHookInterceptorInstalled,
  getStats: getHookInterceptorStats,
  resetStats: resetHookInterceptorStats
};