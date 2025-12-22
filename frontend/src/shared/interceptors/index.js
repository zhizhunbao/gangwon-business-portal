/**
 * Interceptors Module - 拦截器模块入口
 * 
 * 统一导出所有拦截器相关功能。
 */

// API 拦截器
export {
  createRequestInterceptor,
  createResponseInterceptor,
  createErrorInterceptor,
  createApiInterceptors
} from './api.interceptor.js';

// 认证拦截器 (原有的认证装饰器)
export {
  createAuthInterceptor,
  applyAuthInterceptor,
  authMethodDecorator,
  AUTH_METHODS
} from './auth.interceptor.js';

// Auth服务拦截器 (新的AOP认证拦截器)
export {
  installAuthInterceptor,
  uninstallAuthInterceptor,
  isAuthInterceptorInstalled,
  interceptAuthService,
  getAuthInterceptorStats,
  resetAuthInterceptorStats
} from './auth.interceptor.js';

// 组件拦截器
export {
  installComponentInterceptor,
  uninstallComponentInterceptor,
  isComponentInterceptorInstalled,
  getComponentInterceptorStats
} from './component.interceptor.js';

// Hook拦截器
export {
  installHookInterceptor,
  uninstallHookInterceptor,
  isHookInterceptorInstalled,
  getHookInterceptorStats,
  resetHookInterceptorStats
} from './hook.interceptor.js';

// Store拦截器
export {
  installStoreInterceptor,
  uninstallStoreInterceptor,
  isStoreInterceptorInstalled,
  interceptStore,
  getStoreInterceptorStats,
  resetStoreInterceptorStats
} from './store.interceptor.js';

// 性能拦截器
export {
  installPerformanceInterceptor,
  uninstallPerformanceInterceptor,
  isPerformanceInterceptorInstalled,
  getPerformanceInterceptorStats,
  resetPerformanceInterceptorStats,
  updatePerformanceConfig
} from './performance.interceptor.js';

// 默认导出 API 拦截器
export { default } from './api.interceptor.js';