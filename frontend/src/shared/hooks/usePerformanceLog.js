/**
 * Performance Log Hook - 性能日志记录 Hook
 *
 * 用于记录组件渲染性能和 Web Vitals 指标的日志 Hook。
 *
 * Features:
 * - 记录组件渲染耗时
 * - 渲染超过 100ms 记录 WARNING
 * - 收集 Web Vitals（FCP, LCP, TTI）
 * - FCP > 2s, LCP > 2.5s, TTI > 3.8s 记录 WARNING
 *
 * Requirements: 4.5, 4.6, 4.7, 4.8, 4.9
 */

import React, { useEffect, useRef, useCallback } from "react";
import { info, warn, debug, LOG_LAYERS } from "@shared/utils/logger";

/**
 * 性能日志记录 Hook
 * @param {string} componentName - 组件名称
 * @param {Object} options - 配置选项
 * @returns {Object} 性能记录工具函数
 */
export function usePerformanceLog(componentName, options = {}) {
  const {
    enableLogging = true,
    trackRenderTime = true,
    trackWebVitals = true,
    renderWarningThreshold = 100, // ms - Requirements 4.5
    fcpWarningThreshold = 2000, // ms - Requirements 4.7
    lcpWarningThreshold = 2500, // ms - Requirements 4.8
    ttiWarningThreshold = 3800, // ms - Requirements 4.9
  } = options;

  const renderStartTimeRef = useRef(null);
  const renderCountRef = useRef(0);
  const performanceObserverRef = useRef(null);
  const webVitalsRef = useRef({
    fcp: null,
    lcp: null,
    tti: null,
  });

  // 初始化 Web Vitals 监控 - Requirements 4.6
  useEffect(() => {
    if (!enableLogging || !trackWebVitals) return;

    // 检查浏览器支持
    if (typeof PerformanceObserver === "undefined") {
      console.warn("PerformanceObserver not supported");
      return;
    }

    try {
      // 监控 FCP (First Contentful Paint)
      const fcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name === "first-contentful-paint") {
            webVitalsRef.current.fcp = entry.startTime;
            logWebVital("FCP", entry.startTime, fcpWarningThreshold);
          }
        });
      });

      // 监控 LCP (Largest Contentful Paint)
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          webVitalsRef.current.lcp = lastEntry.startTime;
          logWebVital("LCP", lastEntry.startTime, lcpWarningThreshold);
        }
      });

      // 监控导航时间（用于计算 TTI）
      const navigationObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === "navigation") {
            // 简化的 TTI 计算：domInteractive 时间
            const tti = entry.domInteractive;
            webVitalsRef.current.tti = tti;
            logWebVital("TTI", tti, ttiWarningThreshold);
          }
        });
      });

      // 启动观察器
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

    // 清理观察器
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
  ]);

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

        // 根据阈值记录警告 - Requirements 4.7, 4.8, 4.9
        if (value > threshold) {
          warn(
            LOG_LAYERS.PERFORMANCE,
            `Poor Web Vital: ${metric} (${Math.round(value)}ms)`,
            {
              ...logData,
              performance_issue: `POOR_${metric}`,
              exceeded_by_ms: Math.round(value - threshold),
            }
          );
        } else {
          info(
            LOG_LAYERS.PERFORMANCE,
            `Web Vital: ${metric} (${Math.round(value)}ms)`,
            logData
          );
        }
      } catch (error) {
        console.warn("Failed to log Web Vital:", error);
      }
    },
    [componentName, enableLogging]
  );

  // 开始渲染性能测量
  const startRenderMeasure = useCallback(() => {
    if (!enableLogging || !trackRenderTime) return () => {};

    renderStartTimeRef.current = performance.now();
    renderCountRef.current += 1;

    // 返回结束测量函数
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

        // 慢渲染警告 - Requirements 4.5
        if (renderTime > renderWarningThreshold) {
          warn(
            LOG_LAYERS.PERFORMANCE,
            `Slow Component Render: ${componentName} (${renderTime}ms)`,
            {
              ...logData,
              performance_issue: "SLOW_COMPONENT_RENDER",
              exceeded_by_ms: renderTime - renderWarningThreshold,
            }
          );
        } else {
          debug(
            LOG_LAYERS.PERFORMANCE,
            `Component Render: ${componentName} (${renderTime}ms)`,
            logData
          );
        }
      } catch (error) {
        console.warn("Failed to log render performance:", error);
      }

      renderStartTimeRef.current = null;
    };
  }, [componentName, enableLogging, trackRenderTime, renderWarningThreshold]);

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

        // 如果有阈值且超过阈值，记录警告
        if (threshold && value > threshold) {
          warn(
            LOG_LAYERS.PERFORMANCE,
            `Poor Performance Metric: ${metricName} (${value}${unit})`,
            {
              ...logData,
              performance_issue: `POOR_${metricName.toUpperCase()}`,
              exceeded_by: value - threshold,
            }
          );
        } else {
          info(
            LOG_LAYERS.PERFORMANCE,
            `Performance Metric: ${metricName} (${value}${unit})`,
            logData
          );
        }
      } catch (error) {
        console.warn("Failed to log custom metric:", error);
      }
    },
    [componentName, enableLogging]
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

      info(LOG_LAYERS.PERFORMANCE, `Page Load Performance: ${componentName}`, {
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
  }, [componentName, enableLogging, getWebVitalsSnapshot]);

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
 * @param {string} componentName - 组件名称
 * @param {Object} options - 配置选项
 * @returns {Function} HOC 函数
 */
export function withPerformanceLog(componentName, options = {}) {
  return function (WrappedComponent) {
    return function PerformanceLoggedComponent(props) {
      const { startRenderMeasure } = usePerformanceLog(componentName, options);

      // 测量渲染性能
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
 * @param {Object} options - 配置选项
 */
export function initializeWebVitalsMonitoring(options = {}) {
  const {
    enableLogging = true,
    fcpWarningThreshold = 2000,
    lcpWarningThreshold = 2500,
    ttiWarningThreshold = 3800,
  } = options;

  if (!enableLogging || typeof PerformanceObserver === "undefined") {
    return;
  }

  // 全局 Web Vitals 监控
  try {
    // 监控 CLS (Cumulative Layout Shift)
    const clsObserver = new PerformanceObserver((list) => {
      let clsValue = 0;
      const entries = list.getEntries();

      entries.forEach((entry) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      });

      if (clsValue > 0.1) {
        // CLS threshold
        warn(LOG_LAYERS.PERFORMANCE, `Poor CLS: ${clsValue.toFixed(4)}`, {
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
