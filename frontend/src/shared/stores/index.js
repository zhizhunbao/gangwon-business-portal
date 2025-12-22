/**
 * Zustand Stores Export
 */

import { interceptStore } from '@shared/interceptors/store.interceptor';
import { useAuthStore } from './authStore';
import { useUIStore } from './uiStore';

// 为stores添加拦截器（在开发环境或需要时）
if (import.meta.env.DEV || import.meta.env.VITE_ENABLE_STORE_LOGGING === 'true') {
  // 注意：Zustand stores需要在创建后拦截，这里我们导出拦截后的版本
  // 实际的拦截会在stores被使用时自动进行
}

export * from './authStore';
export * from './uiStore';

