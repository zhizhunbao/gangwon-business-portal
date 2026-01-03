/**
 * useLogger Hook - 带模块路径的日志 Hook
 * 
 * 传入文件路径，自动解析出模块名和文件名。
 * 
 * @example
 * // React 组件中使用
 * const log = useLogger('src/member/components/MessageList.jsx');
 * log.info('Component', 'Rendered successfully');
 * 
 * // 普通 JS 文件中使用
 * const log = createLogger('src/shared/utils/format.js');
 * log.info('Service', 'Formatting data');
 */

import { useMemo } from 'react';
import { loggerCore, LOG_LAYERS } from '../logger/core.js';

/**
 * 从文件路径解析模块名和完整文件路径
 * @param {string} filePath - 文件路径，如 'src/member/components/MessageList.jsx'
 * @returns {Object} { module, fullPath }
 */
function parseFilePath(filePath) {
  if (!filePath) {
    return { module: '', fullPath: '' };
  }
  
  // 去掉开头的 ./
  let cleanPath = filePath.replace(/^\.\/+/, '');
  
  // 确保路径以 src/ 开头
  if (!cleanPath.startsWith('src/')) {
    cleanPath = 'src/' + cleanPath;
  }
  
  // 提取模块路径（去掉文件名，转换为点分格式，保留 src 前缀）
  const lastSlash = cleanPath.lastIndexOf('/');
  let module = '';
  if (lastSlash > 0) {
    module = cleanPath.substring(0, lastSlash).replace(/\//g, '.');
  }
  
  return { module, fullPath: cleanPath };
}

/**
 * 创建带模块路径的 logger 实例（非 React 环境使用）
 * @param {string} filePath - 文件路径，如 'src/member/components/MessageList.jsx'
 * @returns {Object} logger 实例
 */
export function createLogger(filePath) {
  const { module, fullPath } = parseFilePath(filePath);
  
  const createLogFn = (level) => (layer, message, extra = {}) => {
    loggerCore.log(level, layer, message, {
      ...extra,
      _module: module,
      _file_path: fullPath
    });
  };

  return {
    debug: createLogFn('DEBUG'),
    info: createLogFn('INFO'),
    warn: createLogFn('WARNING'),
    error: createLogFn('ERROR'),
    critical: createLogFn('CRITICAL'),
    
    // 便捷方法：预设 layer
    component: (message, extra) => createLogFn('INFO')(LOG_LAYERS.COMPONENT, message, extra),
    service: (message, extra) => createLogFn('INFO')(LOG_LAYERS.SERVICE, message, extra),
    store: (message, extra) => createLogFn('INFO')(LOG_LAYERS.STORE, message, extra),
    auth: (message, extra) => createLogFn('INFO')(LOG_LAYERS.AUTH, message, extra),
    hook: (message, extra) => createLogFn('INFO')(LOG_LAYERS.HOOK, message, extra),
    performance: (message, extra) => createLogFn('INFO')(LOG_LAYERS.PERFORMANCE, message, extra),
    router: (message, extra) => createLogFn('INFO')(LOG_LAYERS.ROUTER, message, extra),
    
    // 带级别的便捷方法
    componentWarn: (message, extra) => createLogFn('WARNING')(LOG_LAYERS.COMPONENT, message, extra),
    componentError: (message, extra) => createLogFn('ERROR')(LOG_LAYERS.COMPONENT, message, extra),
    serviceWarn: (message, extra) => createLogFn('WARNING')(LOG_LAYERS.SERVICE, message, extra),
    serviceError: (message, extra) => createLogFn('ERROR')(LOG_LAYERS.SERVICE, message, extra),
  };
}

/**
 * React Hook：创建带模块路径的 logger
 * @param {string} filePath - 文件路径，如 'src/member/components/MessageList.jsx'
 * @returns {Object} logger 实例
 */
export function useLogger(filePath) {
  return useMemo(() => createLogger(filePath), [filePath]);
}

/**
 * 带模块路径的日志函数（供其他模块使用）
 * @param {string} filePath - 文件路径
 * @param {string} level - 日志级别
 * @param {string} layer - 日志层级
 * @param {string} message - 日志消息
 * @param {Object} extra - 额外数据
 */
export function logWithModule(filePath, level, layer, message, extra = {}) {
  const { module, fullPath } = parseFilePath(filePath);
  loggerCore.log(level, layer, message, {
    ...extra,
    _module: module,
    _file_path: fullPath
  });
}

// 导出解析函数供其他模块使用
export { parseFilePath };

export default useLogger;
