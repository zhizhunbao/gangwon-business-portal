/**
 * Component Log Hook - 组件生命周期日志记录 Hook
 *
 * 用于记录 React 组件生命周期事件的日志 Hook。
 *
 * Features:
 * - 记录组件 mount/unmount 事件
 * - 自动追踪组件生命周期
 * - 支持组件渲染性能监控
 * - 支持模块路径注入
 *
 * Requirements: 4.3, 4.4
 */

import React, { useEffect, useRef, useCallback } from "react";
import { LOG_LAYERS } from "@shared/logger";
import { getLayerLogLevel } from "@shared/logger/config";
import { logWithModule } from "./useLogger";

/**
 * 组件日志记录 Hook
 * @param {string} componentName - 组件名称
 * @param {Object} options - 配置选项
 * @param {string} options.filePath - 文件路径，如 'member/components/MessageList.jsx'
 * @returns {Object} 日志记录工具函数
 */
export function useComponentLog(componentName, options = {}) {
  const {
    filePath = null,
    enableLogging = true,
    trackProps = false,
    trackRenders = false,
    slowRenderThreshold = 16, // ms (60fps = 16.67ms per frame)
  } = options;

  const mountTimeRef = useRef(null);
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef(null);
  const propsRef = useRef(null);

  // 获取日志级别
  const componentLogLevel = getLayerLogLevel('component');
  const logLevel = componentLogLevel === 'DEBUG' ? 'DEBUG' : 'INFO';

  // 内部日志函数
  const log = useCallback((level, message, data) => {
    logWithModule(filePath, level, LOG_LAYERS.COMPONENT, message, data);
  }, [filePath]);

  // 组件 Mount 日志 - Requirements 4.3
  useEffect(() => {
    if (!enableLogging) return;

    try {
      mountTimeRef.current = performance.now();

      log(logLevel, `Component: ${componentName} mounted`, {
        component_name: componentName,
        lifecycle: "mount",
      });
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

        log(logLevel, `Component: ${componentName} unmounted`, {
          component_name: componentName,
          lifecycle: "unmount",
          duration_ms: mountDuration,
        });
      } catch (error) {
        console.warn("Failed to log component unmount:", error);
      }
    };
  }, [componentName, enableLogging, log, logLevel]);

  // 记录组件渲染的工具函数
  const logRender = useCallback(
    (renderInfo = {}) => {
      if (!enableLogging || !trackRenders) return () => {};

      try {
        const renderStartTime = performance.now();
        renderCountRef.current += 1;

        return () => {
          const renderTime = Math.round(performance.now() - renderStartTime);
          lastRenderTimeRef.current = renderTime;

          const logData = {
            component_name: componentName,
            lifecycle: "update",
            props: sanitizeRenderInfo(renderInfo),
            duration_ms: renderTime,
          };

          if (renderTime > slowRenderThreshold) {
            log('WARNING', `Component: ${componentName} slow render`, {
              ...logData,
              threshold_ms: slowRenderThreshold,
            });
          } else {
            log('DEBUG', `Component: ${componentName} update`, logData);
          }
        };
      } catch (error) {
        console.warn("Failed to log component render:", error);
        return () => {};
      }
    },
    [componentName, enableLogging, trackRenders, slowRenderThreshold, log]
  );

  // 记录组件事件的工具函数
  const logEvent = useCallback(
    (eventName, eventData = {}) => {
      if (!enableLogging) return;

      try {
        log('INFO', `Component: ${componentName} ${eventName}`, {
          component_name: componentName,
          lifecycle: eventName,
          props: sanitizeRenderInfo(eventData),
        });
      } catch (error) {
        console.warn("Failed to log component event:", error);
      }
    },
    [componentName, enableLogging, log]
  );

  // 记录组件错误的工具函数
  const logError = useCallback(
    (error, errorInfo = {}) => {
      if (!enableLogging) return;

      try {
        log('WARNING', `Component: ${componentName} error`, {
          component_name: componentName,
          lifecycle: "error",
          props: sanitizeRenderInfo(errorInfo),
          error_message: error.message,
          error_stack: error.stack,
        });
      } catch (logError) {
        console.warn("Failed to log component error:", logError);
      }
    },
    [componentName, enableLogging, log]
  );

  // 记录 Props 变更的工具函数
  const logPropsChange = useCallback(
    (newProps) => {
      if (!enableLogging || !trackProps) return;

      try {
        const oldProps = propsRef.current;
        const changedProps = getChangedProps(oldProps, newProps);

        if (changedProps.length > 0) {
          log('DEBUG', `Component: ${componentName} props changed`, {
            component_name: componentName,
            lifecycle: "update",
            props: { changed_fields: changedProps },
          });
        }

        propsRef.current = newProps;
      } catch (error) {
        console.warn("Failed to log component props change:", error);
      }
    },
    [componentName, enableLogging, trackProps, log]
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
 * 清理渲染信息，移除敏感数据
 */
function sanitizeRenderInfo(info) {
  if (!info || typeof info !== "object") {
    return info;
  }

  try {
    const sanitized = { ...info };
    const sensitiveFields = ["password", "token", "secret", "key", "auth"];
    sensitiveFields.forEach((field) => {
      if (sanitized[field]) {
        sanitized[field] = "[FILTERED]";
      }
    });

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
 */
function getChangedProps(oldProps, newProps) {
  const changedProps = [];

  if (!oldProps || !newProps) {
    return changedProps;
  }

  for (const key in newProps) {
    if (newProps[key] !== oldProps[key]) {
      changedProps.push(key);
    }
  }

  for (const key in oldProps) {
    if (!(key in newProps)) {
      changedProps.push(`-${key}`);
    }
  }

  return changedProps;
}

/**
 * 组件日志装饰器 HOC
 */
export function withComponentLog(componentName, options = {}) {
  return function (WrappedComponent) {
    return function LoggedComponent(props) {
      const { logEvent, logError, logPropsChange } = useComponentLog(
        componentName,
        options
      );

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
