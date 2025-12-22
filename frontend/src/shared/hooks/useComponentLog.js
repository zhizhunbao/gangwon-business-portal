/**
 * Component Log Hook - 组件生命周期日志记录 Hook
 *
 * 用于记录 React 组件生命周期事件的日志 Hook。
 *
 * Features:
 * - 记录组件 mount/unmount 事件
 * - 自动追踪组件生命周期
 * - 集成日志上下文管理
 * - 支持组件渲染性能监控
 *
 * Requirements: 4.3, 4.4
 */

import React, { useEffect, useRef, useCallback } from "react";
import { info, debug, warn, LOG_LAYERS } from "@shared/utils/logger";

/**
 * 组件日志记录 Hook
 * @param {string} componentName - 组件名称
 * @param {Object} options - 配置选项
 * @returns {Object} 日志记录工具函数
 */
export function useComponentLog(componentName, options = {}) {
  const {
    enableLogging = true,
    logLevel = "info",
    trackProps = false,
    trackRenders = false,
    slowRenderThreshold = 16, // ms (60fps = 16.67ms per frame)
  } = options;

  const mountTimeRef = useRef(null);
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef(null);
  const propsRef = useRef(null);

  // 组件 Mount 日志 - Requirements 4.3
  useEffect(() => {
    if (!enableLogging) return;

    try {
      mountTimeRef.current = performance.now();

      const logMessage = `Component Mount: ${componentName}`;
      const logData = {
        component_name: componentName,
        lifecycle_event: "mount",
        mount_timestamp: new Date().toISOString(),
        component_stack: getComponentStack(),
      };

      if (logLevel === "debug") {
        debug(LOG_LAYERS.COMPONENT, logMessage, logData);
      } else {
        info(LOG_LAYERS.COMPONENT, logMessage, logData);
      }
    } catch (error) {
      console.warn("Failed to log component mount:", error);
    }

    // 组件 Unmount 日志 - Requirements 4.4
    return () => {
      if (!enableLogging) return;

      try {
        const mountDuration = mountTimeRef.current
          ? Math.round(performance.now() - mountTimeRef.current)
          : null;

        const logMessage = `Component Unmount: ${componentName}`;
        const logData = {
          component_name: componentName,
          lifecycle_event: "unmount",
          mount_duration_ms: mountDuration,
          render_count: renderCountRef.current,
          total_renders: renderCountRef.current,
          unmount_timestamp: new Date().toISOString(),
        };

        if (logLevel === "debug") {
          debug(LOG_LAYERS.COMPONENT, logMessage, logData);
        } else {
          info(LOG_LAYERS.COMPONENT, logMessage, logData);
        }
      } catch (error) {
        console.warn("Failed to log component unmount:", error);
      }
    };
  }, [componentName, enableLogging, logLevel]);

  // 记录组件渲染的工具函数
  const logRender = useCallback(
    (renderInfo = {}) => {
      if (!enableLogging || !trackRenders) return;

      try {
        const renderStartTime = performance.now();
        renderCountRef.current += 1;

        // 返回一个函数来记录渲染完成
        return () => {
          const renderTime = Math.round(performance.now() - renderStartTime);
          lastRenderTimeRef.current = renderTime;

          const logData = {
            component_name: componentName,
            lifecycle_event: "render",
            render_time_ms: renderTime,
            render_count: renderCountRef.current,
            render_number: renderCountRef.current,
            render_info: sanitizeRenderInfo(renderInfo),
          };

          // 慢渲染警告
          if (renderTime > slowRenderThreshold) {
            warn(
              LOG_LAYERS.COMPONENT,
              `Slow Component Render: ${componentName}`,
              {
                ...logData,
                performance_issue: "SLOW_COMPONENT_RENDER",
                threshold_ms: slowRenderThreshold,
                exceeded_by_ms: renderTime - slowRenderThreshold,
              }
            );
          } else {
            debug(
              LOG_LAYERS.COMPONENT,
              `Component Render: ${componentName}`,
              logData
            );
          }
        };
      } catch (error) {
        console.warn("Failed to log component render:", error);
        return () => {}; // 返回空函数避免错误
      }
    },
    [componentName, enableLogging, trackRenders, slowRenderThreshold]
  );

  // 记录组件事件的工具函数
  const logEvent = useCallback(
    (eventName, eventData = {}) => {
      if (!enableLogging) return;

      try {
        info(
          LOG_LAYERS.COMPONENT,
          `Component Event: ${componentName}.${eventName}`,
          {
            component_name: componentName,
            event_name: eventName,
            event_data: sanitizeRenderInfo(eventData),
            render_count: renderCountRef.current,
          }
        );
      } catch (error) {
        console.warn("Failed to log component event:", error);
      }
    },
    [componentName, enableLogging]
  );

  // 记录组件错误的工具函数
  const logError = useCallback(
    (error, errorInfo = {}) => {
      if (!enableLogging) return;

      try {
        warn(LOG_LAYERS.COMPONENT, `Component Error: ${componentName}`, {
          component_name: componentName,
          error_message: error.message,
          error_stack: error.stack,
          error_name: error.name,
          error_info: sanitizeRenderInfo(errorInfo),
          render_count: renderCountRef.current,
        });
      } catch (logError) {
        console.warn("Failed to log component error:", logError);
      }
    },
    [componentName, enableLogging]
  );

  // 记录 Props 变更的工具函数
  const logPropsChange = useCallback(
    (newProps) => {
      if (!enableLogging || !trackProps) return;

      try {
        const oldProps = propsRef.current;
        const changedProps = getChangedProps(oldProps, newProps);

        if (changedProps.length > 0) {
          debug(
            LOG_LAYERS.COMPONENT,
            `Component Props Change: ${componentName}`,
            {
              component_name: componentName,
              lifecycle_event: "props_change",
              changed_props: changedProps,
              render_count: renderCountRef.current,
            }
          );
        }

        propsRef.current = newProps;
      } catch (error) {
        console.warn("Failed to log component props change:", error);
      }
    },
    [componentName, enableLogging, trackProps]
  );

  return {
    logRender,
    logEvent,
    logError,
    logPropsChange,
    getRenderCount: () => renderCountRef.current,
    getLastRenderTime: () => lastRenderTimeRef.current,
    getMountDuration: () =>
      mountTimeRef.current
        ? Math.round(performance.now() - mountTimeRef.current)
        : null,
  };
}

/**
 * 获取组件调用栈信息
 * @returns {string} 组件栈信息
 */
function getComponentStack() {
  try {
    const error = new Error();
    const stack = error.stack || "";

    // 提取 React 组件相关的栈信息
    const lines = stack
      .split("\n")
      .filter(
        (line) => line.includes("at ") && !line.includes("useComponentLog")
      )
      .slice(0, 3);

    return lines.map((line) => line.trim()).join(" -> ");
  } catch (error) {
    return "unknown";
  }
}

/**
 * 清理渲染信息，移除敏感数据
 * @param {any} info - 渲染信息
 * @returns {any} 清理后的信息
 */
function sanitizeRenderInfo(info) {
  if (!info || typeof info !== "object") {
    return info;
  }

  try {
    const sanitized = { ...info };

    // 移除敏感字段
    const sensitiveFields = ["password", "token", "secret", "key", "auth"];
    sensitiveFields.forEach((field) => {
      if (sanitized[field]) {
        sanitized[field] = "[FILTERED]";
      }
    });

    // 限制对象大小
    const jsonStr = JSON.stringify(sanitized);
    if (jsonStr.length > 300) {
      return {
        _truncated: true,
        _original_size: jsonStr.length,
        _preview: jsonStr.substring(0, 50),
      };
    }

    return sanitized;
  } catch (error) {
    return { _error: "Failed to sanitize render info" };
  }
}

/**
 * 获取 Props 变更信息
 * @param {Object} oldProps - 旧的 Props
 * @param {Object} newProps - 新的 Props
 * @returns {string[]} 变更的 Props 列表
 */
function getChangedProps(oldProps, newProps) {
  const changedProps = [];

  if (!oldProps || !newProps) {
    return changedProps;
  }

  // 检查新增或变更的 props
  for (const key in newProps) {
    if (newProps[key] !== oldProps[key]) {
      changedProps.push(key);
    }
  }

  // 检查删除的 props
  for (const key in oldProps) {
    if (!(key in newProps)) {
      changedProps.push(`-${key}`);
    }
  }

  return changedProps;
}

/**
 * 组件日志装饰器 HOC
 * @param {string} componentName - 组件名称
 * @param {Object} options - 配置选项
 * @returns {Function} HOC 函数
 */
export function withComponentLog(componentName, options = {}) {
  return function (WrappedComponent) {
    return function LoggedComponent(props) {
      const { logEvent, logError, logPropsChange } = useComponentLog(
        componentName,
        options
      );

      // 记录 Props 变更
      useEffect(() => {
        logPropsChange(props);
      }, [props, logPropsChange]);

      try {
        return React.createElement(WrappedComponent, props);
      } catch (error) {
        logError(error, { props });
        throw error;
      }
    };
  };
}

export default useComponentLog;
