/**
 * Component Interceptor - React组件拦截器
 * 
 * 自动为所有React组件添加AOP日志功能，实现组件级别的自动日志记录。
 * 
 * Features:
 * - 自动拦截React.createElement调用
 * - 为组件添加生命周期日志
 * - 支持组件渲染性能监控
 * - 自动错误捕获和报告
 * - 智能组件过滤，避免拦截系统组件
 * 
 * Requirements: 4.3, 4.4
 */

import React from 'react';
import { useComponentLog } from '@shared/hooks/useComponentLog';

// 存储原始的createElement函数
const originalCreateElement = React.createElement;

// 组件缓存，避免重复创建包装组件
const componentCache = new WeakMap();

// 拦截器状态
let isInstalled = false;

/**
 * 提取组件名称
 * @param {*} type - React组件类型
 * @returns {string} 组件名称
 */
function getComponentName(type) {
  if (typeof type === 'string') {
    return type; // HTML元素
  }
  
  if (typeof type === 'function') {
    return type.displayName || type.name || 'Anonymous';
  }
  
  if (type && typeof type === 'object') {
    if (type.$$typeof === Symbol.for('react.forward_ref')) {
      return getComponentName(type.render) || 'ForwardRef';
    }
    if (type.$$typeof === Symbol.for('react.memo')) {
      return getComponentName(type.type) || 'Memo';
    }
  }
  
  return 'Unknown';
}

/**
 * 判断是否需要拦截的组件
 * @param {*} type - React组件类型
 * @param {string} componentName - 组件名称
 * @returns {boolean} 是否需要拦截
 */
function shouldInterceptComponent(type, componentName) {
  // 跳过HTML元素
  if (typeof type === 'string') {
    return false;
  }
  
  // 跳过React内置组件
  if (componentName.startsWith('React.') || componentName.includes('Fragment')) {
    return false;
  }
  
  // 跳过一些特殊组件，避免无限循环或性能问题
  const skipComponents = [
    'Router', 'Route', 'Routes', 'BrowserRouter', 'HashRouter',
    'Provider', 'Consumer', 'Context',
    'Suspense', 'ErrorBoundary', 'RouteLogger',
    'StrictMode', 'Profiler',
    'Logged(' // 避免重复包装
  ];
  
  if (skipComponents.some(skip => componentName.includes(skip))) {
    return false;
  }
  
  return true;
}

/**
 * 创建带日志的组件包装器
 * @param {*} OriginalComponent - 原始组件
 * @param {string} componentName - 组件名称
 * @returns {React.Component} 包装后的组件
 */
function createLoggedComponent(OriginalComponent, componentName) {
  const LoggedComponent = React.forwardRef((props, ref) => {
    // 使用组件日志钩子 - Requirements 4.3, 4.4
    const { logEvent, logError } = useComponentLog(componentName, {
      enableLogging: true,
      logLevel: 'debug',
      trackRenders: true,
      trackProps: false, // 避免性能问题
      slowRenderThreshold: 16 // 60fps = 16.67ms per frame
    });
    
    try {
      // 如果是函数组件
      if (typeof OriginalComponent === 'function') {
        return OriginalComponent(props, ref);
      }
      
      // 如果是类组件或其他类型，使用原始createElement
      return originalCreateElement(OriginalComponent, { ...props, ref });
    } catch (error) {
      // 记录组件错误
      logError(error, { props });
      throw error;
    }
  });
  
  LoggedComponent.displayName = `Logged(${componentName})`;
  return LoggedComponent;
}

/**
 * 拦截的createElement函数
 * @param {*} type - 组件类型
 * @param {Object} props - 组件属性
 * @param {...any} children - 子元素
 * @returns {React.Element} React元素
 */
function interceptedCreateElement(type, props, ...children) {
  // 临时禁用机制 - 如果环境变量设置为false，直接返回原始createElement
  if (import.meta.env.VITE_ENABLE_COMPONENT_LOGGING === 'false') {
    return originalCreateElement(type, props, ...children);
  }
  
  const componentName = getComponentName(type);
  
  // 如果不需要拦截，直接调用原始函数
  if (!shouldInterceptComponent(type, componentName)) {
    return originalCreateElement(type, props, ...children);
  }
  
  // 只对函数/类组件使用缓存（WeakMap只能用对象作为key）
  // 字符串类型（HTML元素）不需要缓存
  if (typeof type === 'string') {
    // HTML元素不需要包装，直接返回
    return originalCreateElement(type, props, ...children);
  }
  
  // 确保type是一个有效的对象，WeakMap只接受对象作为key
  if (!type || (typeof type !== 'object' && typeof type !== 'function')) {
    // 如果不是对象或函数，直接返回原始createElement
    if (import.meta.env.DEV) {
      console.debug('[ComponentInterceptor] Skipping non-object type:', typeof type, type);
    }
    return originalCreateElement(type, props, ...children);
  }
  
  // 检查缓存，避免重复创建包装组件
  let LoggedComponent;
  try {
    LoggedComponent = componentCache.get(type);
    if (!LoggedComponent) {
      LoggedComponent = createLoggedComponent(type, componentName);
      componentCache.set(type, LoggedComponent);
    }
  } catch (error) {
    // 如果WeakMap操作失败，直接返回原始createElement
    if (import.meta.env.DEV) {
      console.warn('[ComponentInterceptor] WeakMap operation failed:', error.message);
      console.warn('[ComponentInterceptor] Type details:', {
        type: typeof type,
        value: type,
        componentName,
        isObject: typeof type === 'object',
        isFunction: typeof type === 'function',
        isNull: type === null,
        isUndefined: type === undefined
      });
    }
    return originalCreateElement(type, props, ...children);
  }
  
  // 使用包装后的组件
  return originalCreateElement(LoggedComponent, props, ...children);
}

/**
 * 安装组件拦截器
 * @returns {boolean} 是否安装成功
 */
export function installComponentInterceptor() {
  if (isInstalled) {
    console.warn('[ComponentInterceptor] Already installed');
    return false;
  }
  
  try {
    React.createElement = interceptedCreateElement;
    isInstalled = true;
    
    if (import.meta.env.DEV) {
      console.log('[ComponentInterceptor] Installed successfully');
    }
    
    return true;
  } catch (error) {
    console.error('[ComponentInterceptor] Failed to install:', error);
    return false;
  }
}

/**
 * 卸载组件拦截器
 * @returns {boolean} 是否卸载成功
 */
export function uninstallComponentInterceptor() {
  if (!isInstalled) {
    console.warn('[ComponentInterceptor] Not installed');
    return false;
  }
  
  try {
    React.createElement = originalCreateElement;
    isInstalled = false;
    
    // 清空缓存
    componentCache.clear?.();
    
    if (import.meta.env.DEV) {
      console.log('[ComponentInterceptor] Uninstalled successfully');
    }
    
    return true;
  } catch (error) {
    console.error('[ComponentInterceptor] Failed to uninstall:', error);
    return false;
  }
}

/**
 * 检查拦截器是否已安装
 * @returns {boolean} 是否已安装
 */
export function isComponentInterceptorInstalled() {
  return isInstalled;
}

/**
 * 获取拦截器统计信息
 * @returns {Object} 统计信息
 */
export function getComponentInterceptorStats() {
  return {
    isInstalled,
    cachedComponents: componentCache.size || 0,
    originalCreateElement: originalCreateElement === React.createElement
  };
}

// 默认导出
export default {
  install: installComponentInterceptor,
  uninstall: uninstallComponentInterceptor,
  isInstalled: isComponentInterceptorInstalled,
  getStats: getComponentInterceptorStats
};