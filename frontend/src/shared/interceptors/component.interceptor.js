/**
 * Component Interceptor - React 组件拦截器（API 兼容层）
 *
 * ⚠️ 实际实现在 hook.interceptor.js 中
 *
 * Requirements: 4.3, 4.4
 */

import { LOG_LAYERS } from '@shared/logger';
import { createLogger } from '@shared/hooks/useLogger';

const FILE_PATH = 'src/shared/interceptors/component.interceptor.js';
const log = createLogger(FILE_PATH);

let isInstalled = false;

export function logComponentMount(componentName) {
  log.debug(LOG_LAYERS.COMPONENT, `Component: ${componentName} mounted`, {
    component_name: componentName,
    lifecycle: 'mount',
  });
}

export function logComponentUnmount(componentName, renderCount = 0, mountDurationMs = 0) {
  log.debug(LOG_LAYERS.COMPONENT, `Component: ${componentName} unmounted`, {
    component_name: componentName,
    lifecycle: 'unmount',
    render_count: renderCount,
    mount_duration_ms: mountDurationMs,
  });
}

export function installComponentInterceptor() {
  if (isInstalled) {
    return false;
  }

  isInstalled = true;

  if (
    import.meta.env.DEV &&
    import.meta.env.VITE_ENABLE_AOP_DEBUG_LOGS === 'true'
  ) {
    console.log('[ComponentInterceptor] Installed (actual impl in hook.interceptor.js)');
  }

  return true;
}

export function uninstallComponentInterceptor() {
  if (!isInstalled) {
    return false;
  }

  isInstalled = false;
  return true;
}

export function isComponentInterceptorInstalled() {
  return isInstalled;
}

export function getComponentInterceptorStats() {
  return {
    isInstalled,
    note: 'Actual stats maintained in hook.interceptor.js',
  };
}

export default {
  install: installComponentInterceptor,
  uninstall: uninstallComponentInterceptor,
  isInstalled: isComponentInterceptorInstalled,
  getStats: getComponentInterceptorStats,
  logMount: logComponentMount,
  logUnmount: logComponentUnmount,
};
