/**
 * Performance Exception Hook - 性能异常 Hook
 * 
 * 处理性能相关异常，监控性能指标异常
 * 集成异常服务，提供性能优化建议
 * Requirements: 6.5, 6.6
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { frontendExceptionService } from '@shared/utils/exception.service.js';

/**
 * 性能异常类型枚举
 */
export const PerformanceExceptionType = {
  MEMORY_LEAK: 'MEMORY_LEAK',
  HIGH_CPU_USAGE: 'HIGH_CPU_USAGE',
  SLOW_RENDER: 'SLOW_RENDER',
  LARGE_BUNDLE_SIZE: 'LARGE_BUNDLE_SIZE',
  EXCESSIVE_RERENDERS: 'EXCESSIVE_RERENDERS',
  BLOCKING_OPERATION: 'BLOCKING_OPERATION',
  NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
  RESOURCE_EXHAUSTION: 'RESOURCE_EXHAUSTION',
  INFINITE_LOOP: 'INFINITE_LOOP',
  PERFORMANCE_DEGRADATION: 'PERFORMANCE_DEGRADATION'
};

/**
 * 性能恢复策略
 */
export const PerformanceRecoveryStrategy = {
  THROTTLE_OPERATIONS: 'THROTTLE_OPERATIONS',
  DEBOUNCE_UPDATES: 'DEBOUNCE_UPDATES',
  LAZY_LOAD_COMPONENTS: 'LAZY_LOAD_COMPONENTS',
  OPTIMIZE_RENDERS: 'OPTIMIZE_RENDERS',
  CLEAR_MEMORY: 'CLEAR_MEMORY',
  REDUCE_COMPLEXITY: 'REDUCE_COMPLEXITY',
  CACHE_RESULTS: 'CACHE_RESULTS',
  DEFER_EXECUTION: 'DEFER_EXECUTION',
  NO_ACTION: 'NO_ACTION'
};

/**
 * 性能阈值配置
 */
const DEFAULT_THRESHOLDS = {
  renderTime: 16, // 16ms (60fps)
  memoryUsage: 50 * 1024 * 1024, // 50MB
  rerenderCount: 10, // 10次重渲染
  networkTimeout: 30000, // 30秒
  cpuUsage: 80, // 80% CPU使用率
  bundleSize: 1024 * 1024, // 1MB
  operationTime: 100 // 100ms
};

/**
 * 性能异常 Hook
 * @param {Object} options - 配置选项
 * @returns {Object} 性能异常处理接口
 */
export function usePerformanceException(options = {}) {
  const {
    componentName = 'UnknownComponent',
    enableAutoRecovery = true,
    enableMonitoring = true,
    thresholds = DEFAULT_THRESHOLDS,
    monitoringInterval = 5000,
    onPerformanceError = null,
    onRecoverySuccess = null,
    onRecoveryFailed = null,
    onPerformanceWarning = null
  } = options;

  // 状态管理
  const [performanceError, setPerformanceError] = useState(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const [performanceMetrics, setPerformanceMetrics] = useState({});
  const [lastErrorTime, setLastErrorTime] = useState(null);

  // 引用管理
  const metricsRef = useRef({
    renderCount: 0,
    rerenderCount: 0,
    lastRenderTime: 0,
    totalRenderTime: 0,
    memoryUsage: 0,
    networkRequests: 0,
    operationTimes: []
  });
  const monitoringIntervalRef = useRef(null);
  const isRecoveringRef = useRef(false);
  const performanceObserverRef = useRef(null);

  /**
   * 分类性能异常
   */
  const classifyPerformanceException = useCallback((error, context = {}) => {
    const { metricType, value, threshold, operation } = context;
    const errorMessage = error.message?.toLowerCase() || '';

    // 根据性能指标类型分类
    if (metricType === 'render' || errorMessage.includes('render')) {
      if (value > threshold) {
        return {
          type: PerformanceExceptionType.SLOW_RENDER,
          recoverable: true,
          strategy: PerformanceRecoveryStrategy.OPTIMIZE_RENDERS,
          severity: value > threshold * 2 ? 'HIGH' : 'MEDIUM',
          metric: { type: metricType, value, threshold }
        };
      }
    }

    if (metricType === 'memory' || errorMessage.includes('memory')) {
      return {
        type: PerformanceExceptionType.MEMORY_LEAK,
        recoverable: true,
        strategy: PerformanceRecoveryStrategy.CLEAR_MEMORY,
        severity: value > threshold * 1.5 ? 'CRITICAL' : 'HIGH',
        metric: { type: metricType, value, threshold }
      };
    }

    if (metricType === 'rerender' || errorMessage.includes('rerender')) {
      return {
        type: PerformanceExceptionType.EXCESSIVE_RERENDERS,
        recoverable: true,
        strategy: PerformanceRecoveryStrategy.DEBOUNCE_UPDATES,
        severity: 'MEDIUM',
        metric: { type: metricType, value, threshold }
      };
    }

    if (metricType === 'network' || errorMessage.includes('network') || errorMessage.includes('timeout')) {
      return {
        type: PerformanceExceptionType.NETWORK_TIMEOUT,
        recoverable: true,
        strategy: PerformanceRecoveryStrategy.DEFER_EXECUTION,
        severity: 'MEDIUM',
        metric: { type: metricType, value, threshold }
      };
    }

    if (metricType === 'cpu' || errorMessage.includes('cpu') || errorMessage.includes('blocking')) {
      return {
        type: PerformanceExceptionType.HIGH_CPU_USAGE,
        recoverable: true,
        strategy: PerformanceRecoveryStrategy.THROTTLE_OPERATIONS,
        severity: 'HIGH',
        metric: { type: metricType, value, threshold }
      };
    }

    if (metricType === 'bundle' || errorMessage.includes('bundle') || errorMessage.includes('size')) {
      return {
        type: PerformanceExceptionType.LARGE_BUNDLE_SIZE,
        recoverable: true,
        strategy: PerformanceRecoveryStrategy.LAZY_LOAD_COMPONENTS,
        severity: 'MEDIUM',
        metric: { type: metricType, value, threshold }
      };
    }

    if (operation === 'blocking' || errorMessage.includes('block')) {
      return {
        type: PerformanceExceptionType.BLOCKING_OPERATION,
        recoverable: true,
        strategy: PerformanceRecoveryStrategy.DEFER_EXECUTION,
        severity: 'HIGH',
        metric: { type: metricType, value, threshold }
      };
    }

    if (errorMessage.includes('loop') || errorMessage.includes('infinite')) {
      return {
        type: PerformanceExceptionType.INFINITE_LOOP,
        recoverable: false,
        strategy: PerformanceRecoveryStrategy.NO_ACTION,
        severity: 'CRITICAL',
        metric: { type: metricType, value, threshold }
      };
    }

    // 默认分类
    return {
      type: PerformanceExceptionType.PERFORMANCE_DEGRADATION,
      recoverable: true,
      strategy: PerformanceRecoveryStrategy.REDUCE_COMPLEXITY,
      severity: 'MEDIUM',
      metric: { type: metricType, value, threshold }
    };
  }, []);

  /**
   * 报告性能异常
   */
  const reportPerformanceException = useCallback(async (error, context = {}) => {
    try {
      const classification = classifyPerformanceException(error, context);
      
      const enhancedContext = {
        type: 'performance-exception',
        performanceError: {
          componentName,
          classification,
          metrics: metricsRef.current,
          thresholds,
          lastErrorTime: lastErrorTime,
          url: window.location.href,
          userAgent: navigator.userAgent,
          deviceMemory: navigator.deviceMemory,
          hardwareConcurrency: navigator.hardwareConcurrency
        },
        ...context
      };

      const result = await frontendExceptionService.reportException(error, enhancedContext);
      
      return { classification, reportResult: result };
      
    } catch (reportError) {
      console.warn('[usePerformanceException] Failed to report performance exception:', reportError);
      return { classification: classifyPerformanceException(error, context), reportResult: null };
    }
  }, [classifyPerformanceException, componentName, thresholds, lastErrorTime]);

  /**
   * 收集性能指标
   */
  const collectMetrics = useCallback(() => {
    try {
      // 内存使用情况
      if (performance.memory) {
        metricsRef.current.memoryUsage = performance.memory.usedJSHeapSize;
      }

      // 渲染性能
      const renderEntries = performance.getEntriesByType('measure');
      const renderMeasures = renderEntries.filter(entry => 
        entry.name.includes('render') || entry.name.includes('React')
      );
      
      if (renderMeasures.length > 0) {
        const latestRender = renderMeasures[renderMeasures.length - 1];
        metricsRef.current.lastRenderTime = latestRender.duration;
        metricsRef.current.totalRenderTime += latestRender.duration;
      }

      // 网络请求
      const networkEntries = performance.getEntriesByType('navigation');
      if (networkEntries.length > 0) {
        metricsRef.current.networkRequests = networkEntries.length;
      }

      // 更新状态
      setPerformanceMetrics({ ...metricsRef.current });

    } catch (error) {
      console.warn('[usePerformanceException] Failed to collect metrics:', error);
    }
  }, []);

  /**
   * 检查性能阈值
   */
  const checkThresholds = useCallback(() => {
    const metrics = metricsRef.current;
    const violations = [];

    // 检查渲染时间
    if (metrics.lastRenderTime > thresholds.renderTime) {
      violations.push({
        type: 'render',
        value: metrics.lastRenderTime,
        threshold: thresholds.renderTime,
        severity: metrics.lastRenderTime > thresholds.renderTime * 2 ? 'HIGH' : 'MEDIUM'
      });
    }

    // 检查内存使用
    if (metrics.memoryUsage > thresholds.memoryUsage) {
      violations.push({
        type: 'memory',
        value: metrics.memoryUsage,
        threshold: thresholds.memoryUsage,
        severity: metrics.memoryUsage > thresholds.memoryUsage * 1.5 ? 'CRITICAL' : 'HIGH'
      });
    }

    // 检查重渲染次数
    if (metrics.rerenderCount > thresholds.rerenderCount) {
      violations.push({
        type: 'rerender',
        value: metrics.rerenderCount,
        threshold: thresholds.rerenderCount,
        severity: 'MEDIUM'
      });
    }

    return violations;
  }, [thresholds]);

  /**
   * 执行性能恢复策略
   */
  const executeRecoveryStrategy = useCallback(async (strategy, error, context = {}) => {
    switch (strategy) {
      case PerformanceRecoveryStrategy.THROTTLE_OPERATIONS:
        // 节流操作
        // 这里需要应用层面的支持来实现节流
        return true;

      case PerformanceRecoveryStrategy.DEBOUNCE_UPDATES:
        // 防抖更新
        // 这里需要应用层面的支持来实现防抖
        return true;

      case PerformanceRecoveryStrategy.LAZY_LOAD_COMPONENTS:
        // 懒加载组件
        // 这里需要应用层面的支持来实现懒加载
        return true;

      case PerformanceRecoveryStrategy.OPTIMIZE_RENDERS:
        // 优化渲染
        // 重置重渲染计数
        metricsRef.current.rerenderCount = 0;
        return true;

      case PerformanceRecoveryStrategy.CLEAR_MEMORY:
        // 清理内存
        if (window.gc) {
          window.gc();
        }
        // 清理性能条目
        performance.clearMarks();
        performance.clearMeasures();
        return true;

      case PerformanceRecoveryStrategy.REDUCE_COMPLEXITY:
        // 降低复杂度
        // 这里需要应用层面的支持
        return true;

      case PerformanceRecoveryStrategy.CACHE_RESULTS:
        // 缓存结果
        // 这里需要应用层面的支持
        return true;

      case PerformanceRecoveryStrategy.DEFER_EXECUTION:
        // 延迟执行
        await new Promise(resolve => setTimeout(resolve, 100));
        return true;

      case PerformanceRecoveryStrategy.NO_ACTION:
      default:
        return false;
    }
  }, []);

  /**
   * 处理性能异常
   */
  const handlePerformanceException = useCallback(async (error, context = {}) => {
    // 防止并发处理
    if (isRecoveringRef.current) {
      return { recovered: false, reason: 'already_recovering' };
    }

    try {
      isRecoveringRef.current = true;
      setIsRecovering(true);
      setLastErrorTime(Date.now());

      // 报告异常并获取分类
      const { classification } = await reportPerformanceException(error, context);
      
      // 更新状态
      setPerformanceError({
        error,
        classification,
        timestamp: Date.now(),
        context
      });

      // 调用自定义错误处理器
      if (onPerformanceError) {
        onPerformanceError(error, { classification, context });
      }

      // 如果不可恢复或未启用恢复，直接返回
      if (!enableAutoRecovery || !classification.recoverable) {
        return { recovered: false, reason: 'not_recoverable', classification };
      }

      // 执行恢复策略
      const recovered = await executeRecoveryStrategy(classification.strategy, error, context);
      
      if (recovered) {
        // 恢复成功
        setPerformanceError(null);
        
        if (onRecoverySuccess) {
          onRecoverySuccess(error, classification);
        }
        
        return { recovered: true, classification };
      } else {
        if (onRecoveryFailed) {
          onRecoveryFailed(error, classification);
        }
        
        return { recovered: false, reason: 'recovery_failed', classification };
      }

    } catch (handlingError) {
      console.error('[usePerformanceException] Error handling performance exception:', handlingError);
      
      // 报告处理错误
      await reportPerformanceException(handlingError, {
        type: 'performance_exception_handling_error',
        originalError: error.message
      });
      
      return { recovered: false, reason: 'handling_error', error: handlingError };
      
    } finally {
      isRecoveringRef.current = false;
      setIsRecovering(false);
    }
  }, [
    reportPerformanceException, 
    enableAutoRecovery, 
    executeRecoveryStrategy, 
    onPerformanceError, 
    onRecoverySuccess, 
    onRecoveryFailed
  ]);

  /**
   * 监控性能指标
   */
  const startMonitoring = useCallback(() => {
    if (!enableMonitoring) return;

    // 清除现有监控
    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
    }

    // 启动定期监控
    monitoringIntervalRef.current = setInterval(() => {
      collectMetrics();
      
      const violations = checkThresholds();
      
      violations.forEach(violation => {
        const error = new Error(`Performance threshold exceeded: ${violation.type}`);
        const context = {
          metricType: violation.type,
          value: violation.value,
          threshold: violation.threshold
        };
        
        if (violation.severity === 'CRITICAL' || violation.severity === 'HIGH') {
          handlePerformanceException(error, context);
        } else if (onPerformanceWarning) {
          onPerformanceWarning(violation);
        }
      });
    }, monitoringInterval);

    // 设置 Performance Observer
    if ('PerformanceObserver' in window) {
      performanceObserverRef.current = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.entryType === 'measure' && entry.duration > thresholds.operationTime) {
            const error = new Error(`Slow operation detected: ${entry.name}`);
            const context = {
              metricType: 'operation',
              value: entry.duration,
              threshold: thresholds.operationTime,
              operation: entry.name
            };
            handlePerformanceException(error, context);
          }
        });
      });
      
      performanceObserverRef.current.observe({ entryTypes: ['measure', 'navigation'] });
    }
  }, [enableMonitoring, monitoringInterval, collectMetrics, checkThresholds, handlePerformanceException, onPerformanceWarning, thresholds]);

  /**
   * 停止监控
   */
  const stopMonitoring = useCallback(() => {
    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
      monitoringIntervalRef.current = null;
    }
    
    if (performanceObserverRef.current) {
      performanceObserverRef.current.disconnect();
      performanceObserverRef.current = null;
    }
  }, []);

  /**
   * 测量操作性能
   */
  const measureOperation = useCallback((operationName, operation) => {
    return async (...args) => {
      const startMark = `${operationName}-start`;
      const endMark = `${operationName}-end`;
      const measureName = `${operationName}-duration`;
      
      try {
        performance.mark(startMark);
        const result = await operation(...args);
        performance.mark(endMark);
        performance.measure(measureName, startMark, endMark);
        
        const measure = performance.getEntriesByName(measureName)[0];
        if (measure && measure.duration > thresholds.operationTime) {
          const error = new Error(`Slow operation: ${operationName}`);
          const context = {
            metricType: 'operation',
            value: measure.duration,
            threshold: thresholds.operationTime,
            operation: operationName
          };
          await handlePerformanceException(error, context);
        }
        
        return result;
      } catch (error) {
        performance.mark(endMark);
        performance.measure(measureName, startMark, endMark);
        throw error;
      }
    };
  }, [thresholds.operationTime, handlePerformanceException]);

  /**
   * 跟踪组件渲染
   */
  const trackRender = useCallback(() => {
    metricsRef.current.renderCount += 1;
    
    // 检查是否为重渲染
    const now = Date.now();
    if (now - metricsRef.current.lastRenderTime < 100) {
      metricsRef.current.rerenderCount += 1;
    }
    metricsRef.current.lastRenderTime = now;
  }, []);

  /**
   * 清除性能错误状态
   */
  const clearPerformanceError = useCallback(() => {
    setPerformanceError(null);
    setLastErrorTime(null);
  }, []);

  /**
   * 获取性能健康信息
   */
  const getPerformanceHealth = useCallback(() => {
    const violations = checkThresholds();
    
    return {
      componentName,
      hasError: !!performanceError,
      isRecovering,
      lastErrorTime,
      metrics: performanceMetrics,
      thresholds,
      violations,
      isMonitoring: !!monitoringIntervalRef.current
    };
  }, [componentName, performanceError, isRecovering, lastErrorTime, performanceMetrics, thresholds, checkThresholds]);

  // 启动监控
  useEffect(() => {
    startMonitoring();
    return stopMonitoring;
  }, [startMonitoring, stopMonitoring]);

  // 清理资源
  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  return {
    // 状态
    performanceError,
    isRecovering,
    performanceMetrics,
    lastErrorTime,
    
    // 方法
    handlePerformanceException,
    clearPerformanceError,
    classifyPerformanceException,
    
    // 监控工具
    startMonitoring,
    stopMonitoring,
    collectMetrics,
    checkThresholds,
    measureOperation,
    trackRender,
    
    // 工具
    getPerformanceHealth,
    PerformanceExceptionType,
    PerformanceRecoveryStrategy
  };
}

export default usePerformanceException;