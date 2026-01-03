/**
 * Router Interceptor - 路由拦截器
 * 
 * 监听路由变化，记录导航日志
 * 
 * Requirements: 3.4
 */

import { LOG_LAYERS } from '@shared/logger';
import { createLogger } from '@shared/hooks/useLogger';

const FILE_PATH = 'src/shared/interceptors/router.interceptor.js';
const log = createLogger(FILE_PATH);

let isInstalled = false;
let unsubscribe = null;
let prevPath = null;

function getAuthState() {
  try {
    const { useAuthStore } = require('@shared/stores');
    const state = useAuthStore.getState();
    return {
      isAuthenticated: state.isAuthenticated,
      userRole: state.user?.role || null,
    };
  } catch {
    return { isAuthenticated: false, userRole: null };
  }
}

function logRouteChange(location, action) {
  const fromPath = prevPath || '(initial)';
  const toPath = location.pathname;
  
  if (fromPath === toPath && fromPath !== '(initial)') {
    return;
  }
  
  const { isAuthenticated, userRole } = getAuthState();
  
  const extraData = {
    action: action || 'PUSH',
    from_path: fromPath,
    to_path: toPath,
    is_authenticated: isAuthenticated,
  };
  
  if (location.search) {
    extraData.search = location.search;
  }
  
  if (userRole) {
    extraData.user_role = userRole;
  }
  
  log.info(LOG_LAYERS.ROUTER, `Route: ${fromPath} -> ${toPath}`, extraData);
  
  prevPath = toPath;
}

export function installRouterInterceptor(router) {
  if (isInstalled) {
    return false;
  }
  
  if (!router || typeof router.subscribe !== 'function') {
    console.error('[RouterInterceptor] Invalid router instance');
    return false;
  }
  
  if (router.state?.location) {
    logRouteChange(router.state.location, 'INITIAL');
  }
  
  unsubscribe = router.subscribe((state) => {
    if (state.location) {
      logRouteChange(state.location, state.historyAction);
    }
  });
  
  isInstalled = true;
  
  if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_AOP_DEBUG_LOGS === 'true') {
    console.log('[RouterInterceptor] Installed');
  }
  
  return true;
}

export function uninstallRouterInterceptor() {
  if (!isInstalled) {
    return false;
  }
  
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  
  prevPath = null;
  isInstalled = false;
  
  return true;
}

export function isRouterInterceptorInstalled() {
  return isInstalled;
}

export default {
  install: installRouterInterceptor,
  uninstall: uninstallRouterInterceptor,
  isInstalled: isRouterInterceptorInstalled,
};
