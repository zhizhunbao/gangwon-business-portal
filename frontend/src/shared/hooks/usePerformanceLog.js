/**
 * Performance Log Hook - 性能日志记录 Hook
 *
 * 用于记录组件渲染性能和 Web Vitals 指标的日志 Hook。
 *
 * Features:
 * - 记录组件渲染耗时
 * - 渲染超过 100ms 记录 WARNING
 * - 收集 Web Vitals（FCP, LCP, TTI）
 * - 支持模块路径注入
 *
 * Requirements: 4.5, 4.6, 4.7, 4.8, 4.9
 */

import React, { useEffect, useRef, useCallback } from "react";
import { LOG_LAYERS } from "@shared/logger";
import { logWithModule } from "./useLogger";

/**
 * 性能日志记录 Hook
 * @param {string} componentName - 组件名称
 * @param {Object} options - 配置选项
 * @param {string} options.filePath - 文件路径
 */
export function usePerformanceLog(componentName, options = {}) {
  const {
    filePath = null,
    enableLogging = true,
    trackRenderTime = true,
    trackWebVitals = true,
    renderWarningThreshold = 100,
    fcpWarningThreshold = 2000,
    lcpWarningThreshold = 2500,
    ttiWarningThreshold = 3800,
  } = options;

  const renderStartTimeRef = useRef(null);
  const renderCountRef = useRef(0);
  const performanceObserverRef = useRef(null);
  const webVitalsRef = useRef({
    fcp: null,
    lcp: null,
    tti: null,
  });

  // 内部日志函数
  const log = useCallback((level, message, data) => {
    logWithModule(filePath, level, LOG_LAYERS.PERFORMANCE, message, data);
  }, [filePath]);

  // 记录 Web Vital 指标
  const logWebVital = useCallback(
    (metric, value, threshold) => {
      if (!enableLogging) return;

      try {
        const logData = {
          component_name: componentName,
          metric_name: metric,
          metric_value: Math.round(value),
          metric_value_ms: Math.round(value),
          threshold_ms: threshold,
          web_vitals: { ...webVitalsRef.current },
        };

        if (value > threshold) {
          log('WARNING', `Poor Web Vital: ${metric} (${Math.round(value)}ms)`, {
            ...logData,
            performance_issue: `POOR_${metric}`,
            exceeded_by_ms: Math.round(value - threshold),
          });
        } else {
          log('INFO', `Web Vital: ${metric} (${Math.round(value)}ms)`, logData);
        }
      } catch (error) {
        console.warn("Failed to log Web Vital:", error);
      }
    },
    [componentName, enableLogging, log]
  );

  // 初始化 Web Vitals 监控
  useEffect(() => {
    if (!enableLogging || !trackWebVitals) return;

    if (typeof PerformanceObserver === "undefined") {
      console.warn("PerformanceObserver not supported");
      return;
    }

    try {
      const fcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name === "first-contentful-paint") {
            webVitalsRef.current.fcp = entry.startTime;
            logWebVital("FCP", entry.startTime, fcpWarningThreshold);
          }
        });
      });

      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          webVitalsRef.current.lcp = lastEntry.startTime;
          logWebVital("LCP", lastEntry.startTime, lcpWarningThreshold);
        }
      });

      const navigationObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === "navigation") {
            const tti = entry.domInteractive;
            webVitalsRef.current.tti = tti;
            logWebVital("TTI", tti, ttiWarningThreshold);
          }
        });
      });

      try {
        fcpObserver.observe({ entryTypes: ["paint"] });
        lcpObserver.observe({ entryTypes: ["largest-contentful-paint"] });
        navigationObserver.observe({ entryTypes: ["navigation"] });

        performanceObserverRef.current = {
          fcp: fcpObserver,
          lcp: lcpObserver,
          navigation: navigationObserver,
        };
      } catch (error) {
        console.warn("Failed to start performance observers:", error);
      }
    } catch (error) {
      console.warn("Failed to initialize Web Vitals monitoring:", error);
    }

    return () => {
      if (performanceObserverRef.current) {
        try {
          Object.values(performanceObserverRef.current).forEach((observer) => {
            observer.disconnect();
          });
        } catch (error) {
          console.warn("Failed to disconnect performance observers:", error);
        }
      }
    };
  }, [
    enableLogging,
    trackWebVitals,
    fcpWarningThreshold,
    lcpWarningThreshold,
    ttiWarningThreshold,
    logWebVital,
  ]);

  // 开始渲染性能测量
  const startRenderMeasure = useCallback(() => {
    if (!enableLogging || !trackRenderTime) return () => {};

    renderStartTimeRef.current = performance.now();
    renderCountRef.current += 1;

    return () => {
      if (!renderStartTimeRef.current) return;

      const renderTime = Math.round(
        performance.now() - renderStartTimeRef.current
      );

      try {
        const logData = {
          component_name: componentName,
          render_time_ms: renderTime,
          render_count: renderCountRef.current,
          render_number: renderCountRef.current,
          threshold_ms: renderWarningThreshold,
        };

        if (renderTime > renderWarningThreshold) {
          log('WARNING', `Slow Component Render: ${componentName} (${renderTime}ms)`, {
            ...logData,
            performance_issue: "SLOW_COMPONENT_RENDER",
            exceeded_by_ms: renderTime - renderWarningThreshold,
          });
        } else {
          log('DEBUG', `Component Render: ${componentName} (${renderTime}ms)`, logData);
        }
      } catch (error) {
        console.warn("Failed to log render performance:", error);
      }

      renderStartTimeRef.current = null;
    };
  }, [componentName, enableLogging, trackRenderTime, renderWarningThreshold, log]);

  // 记录自定义性能指标
  const logCustomMetric = useCallback(
    (metricName, value, unit = "ms", threshold = null) => {
      if (!enableLogging) return;

      try {
        const logData = {
          component_name: componentName,
          metric_name: metricName,
          metric_value: value,
          metric_unit: unit,
          threshold: threshold,
        };

        if (threshold && value > threshold) {
          log('WARNING', `Poor Performance Metric: ${metricName} (${value}${unit})`, {
            ...logData,
            performance_issue: `POOR_${metricName.toUpperCase()}`,
            exceeded_by: value - threshold,
          });
        } else {
          log('INFO', `Performance Metric: ${metricName} (${value}${unit})`, logData);
        }
      } catch (error) {
        console.warn("Failed to log custom metric:", error);
      }
    },
    [componentName, enableLogging, log]
  );

  // 获取当前 Web Vitals 快照
  const getWebVitalsSnapshot = useCallback(() => {
    return { ...webVitalsRef.current };
  }, []);

  // 记录页面加载性能
  const logPageLoadPerformance = useCallback(() => {
    if (!enableLogging) return;

    try {
      const navigation = performance.getEntriesByType("navigation")[0];
      if (!navigation) return;

      const loadTime = navigation.loadEventEnd - navigation.fetchStart;
      const domContentLoaded =
        navigation.domContentLoadedEventEnd - navigation.fetchStart;
      const firstByte = navigation.responseStart - navigation.fetchStart;

      log('INFO', `Page Load Performance: ${componentName}`, {
        component_name: componentName,
        page_load_time_ms: Math.round(loadTime),
        dom_content_loaded_ms: Math.round(domContentLoaded),
        first_byte_ms: Math.round(firstByte),
        dns_lookup_ms: Math.round(
          navigation.domainLookupEnd - navigation.domainLookupStart
        ),
        tcp_connect_ms: Math.round(
          navigation.connectEnd - navigation.connectStart
        ),
        web_vitals: getWebVitalsSnapshot(),
      });
    } catch (error) {
      console.warn("Failed to log page load performance:", error);
    }
  }, [componentName, enableLogging, getWebVitalsSnapshot, log]);

  return {
    startRenderMeasure,
    logCustomMetric,
    logPageLoadPerformance,
    getWebVitalsSnapshot,
    getRenderCount: () => renderCountRef.current,
  };
}

/**
 * 性能监控装饰器 HOC
 */
export function withPerformanceLog(componentName, options = {}) {
  return function (WrappedComponent) {
    return function PerformanceLoggedComponent(props) {
      const { startRenderMeasure } = usePerformanceLog(componentName, options);

      const endRenderMeasure = startRenderMeasure();

      useEffect(() => {
        endRenderMeasure();
      });

      return React.createElement(WrappedComponent, props);
    };
  };
}

/**
 * 全局 Web Vitals 监控初始化
 */
export function initializeWebVitalsMonitoring(options = {}) {
  const {
    filePath = null,
    enableLogging = true,
  } = options;

  if (!enableLogging || typeof PerformanceObserver === "undefined") {
    return;
  }

  try {
    const clsObserver = new PerformanceObserver((list) => {
      let clsValue = 0;
      const entries = list.getEntries();

      entries.forEach((entry) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      });

      if (clsValue > 0.1) {
        logWithModule(filePath, 'WARNING', LOG_LAYERS.PERFORMANCE, `Poor CLS: ${clsValue.toFixed(4)}`, {
          metric_name: "CLS",
          metric_value: clsValue,
          performance_issue: "POOR_CLS",
          threshold: 0.1,
        });
      }
    });

    clsObserver.observe({ entryTypes: ["layout-shift"] });
  } catch (error) {
    console.warn("Failed to initialize global Web Vitals monitoring:", error);
  }
}

export default usePerformanceLog;
