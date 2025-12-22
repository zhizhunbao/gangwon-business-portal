/**
 * AOP Initializer - AOP系统初始化器
 * 
 * 统一初始化所有AOP拦截器，确保系统级日志记录的完整性。
 * 
 * Features:
 * - 统一管理所有拦截器
 * - 提供初始化和清理接口
 * - 支持配置化启用/禁用
 * - 提供统计信息汇总
 * 
 * Requirements: 4.3, 4.4
 */

import {
  installComponentInterceptor,
  uninstallComponentInterceptor,
  isComponentInterceptorInstalled,
  getComponentInterceptorStats,
  
  installHookInterceptor,
  uninstallHookInterceptor,
  isHookInterceptorInstalled,
  getHookInterceptorStats,
  
  installStoreInterceptor,
  uninstallStoreInterceptor,
  isStoreInterceptorInstalled,
  getStoreInterceptorStats,
  
  installPerformanceInterceptor,
  uninstallPerformanceInterceptor,
  isPerformanceInterceptorInstalled,
  getPerformanceInterceptorStats,
  
  installAuthInterceptor,
  uninstallAuthInterceptor,
  isAuthInterceptorInstalled,
  getAuthInterceptorStats
} from '@shared/interceptors';

// AOP配置
const aopConfig = {
  enableComponentLogging: true,
  enableHookLogging: true,
  enableStoreLogging: true,
  enableAuthLogging: true,
  enablePerformanceMonitoring: true,
  
  // 性能监控配置
  performance: {
    enableNetworkMonitoring: true,
    enableMemoryMonitoring: true,
    enableNavigationMonitoring: true,
    slowRequestThreshold: 1000,
    slowRenderThreshold: 16,
    memoryWarningThreshold: 50 * 1024 * 1024,
    reportInterval: 60000 // 1分钟
  },
  
  // 环境相关配置
  development: {
    enableAllLogging: true,
    verboseLogging: true
  },
  
  production: {
    enableComponentLogging: false, // 生产环境关闭组件日志
    enableHookLogging: false,      // 生产环境关闭Hook日志
    enableStoreLogging: true,      // 保留Store日志用于调试
    enableAuthLogging: true,       // 保留Auth日志用于安全审计
    enablePerformanceMonitoring: true // 保留性能监控
  }
};

// 初始化状态
let isInitialized = false;
let installedInterceptors = [];

/**
 * 获取环境相关配置
 * @returns {Object} 配置对象
 */
function getEnvironmentConfig() {
  const baseConfig = { ...aopConfig };
  
  if (import.meta.env.PROD) {
    // 生产环境配置
    Object.assign(baseConfig, aopConfig.production);
  } else {
    // 开发环境配置
    Object.assign(baseConfig, aopConfig.development);
  }
  
  // 环境变量覆盖
  if (import.meta.env.VITE_ENABLE_COMPONENT_LOGGING !== undefined) {
    baseConfig.enableComponentLogging = import.meta.env.VITE_ENABLE_COMPONENT_LOGGING === 'true';
  }
  
  if (import.meta.env.VITE_ENABLE_HOOK_LOGGING !== undefined) {
    baseConfig.enableHookLogging = import.meta.env.VITE_ENABLE_HOOK_LOGGING === 'true';
  }
  
  if (import.meta.env.VITE_ENABLE_STORE_LOGGING !== undefined) {
    baseConfig.enableStoreLogging = import.meta.env.VITE_ENABLE_STORE_LOGGING === 'true';
  }
  
  if (import.meta.env.VITE_ENABLE_AUTH_LOGGING !== undefined) {
    baseConfig.enableAuthLogging = import.meta.env.VITE_ENABLE_AUTH_LOGGING === 'true';
  }
  
  if (import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING !== undefined) {
    baseConfig.enablePerformanceMonitoring = import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING === 'true';
  }
  
  return baseConfig;
}

/**
 * 初始化AOP系统
 * @param {Object} customConfig - 自定义配置
 * @returns {Object} 初始化结果
 */
export function initializeAOP(customConfig = {}) {
  if (isInitialized) {
    console.warn('[AOP] Already initialized');
    return { success: false, message: 'Already initialized' };
  }
  
  try {
    // 合并配置
    const config = { ...getEnvironmentConfig(), ...customConfig };
    const results = [];
    
    // 安装组件拦截器
    if (config.enableComponentLogging) {
      const success = installComponentInterceptor();
      if (success) {
        installedInterceptors.push('component');
        results.push({ interceptor: 'component', success: true });
      } else {
        results.push({ interceptor: 'component', success: false, error: 'Installation failed' });
      }
    }
    
    // 安装Hook拦截器
    if (config.enableHookLogging) {
      const success = installHookInterceptor();
      if (success) {
        installedInterceptors.push('hook');
        results.push({ interceptor: 'hook', success: true });
      } else {
        results.push({ interceptor: 'hook', success: false, error: 'Installation failed' });
      }
    }
    
    // 安装Store拦截器
    if (config.enableStoreLogging) {
      const success = installStoreInterceptor();
      if (success) {
        installedInterceptors.push('store');
        results.push({ interceptor: 'store', success: true });
      } else {
        results.push({ interceptor: 'store', success: false, error: 'Installation failed' });
      }
    }
    
    // 安装Auth拦截器
    if (config.enableAuthLogging) {
      const success = installAuthInterceptor();
      if (success) {
        installedInterceptors.push('auth');
        results.push({ interceptor: 'auth', success: true });
      } else {
        results.push({ interceptor: 'auth', success: false, error: 'Installation failed' });
      }
    }
    
    // 安装性能拦截器
    if (config.enablePerformanceMonitoring) {
      const success = installPerformanceInterceptor(config.performance);
      if (success) {
        installedInterceptors.push('performance');
        results.push({ interceptor: 'performance', success: true });
      } else {
        results.push({ interceptor: 'performance', success: false, error: 'Installation failed' });
      }
    }
    
    isInitialized = true;
    
    // 只在开发环境且启用调试日志时显示详细信息
    if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_AOP_DEBUG_LOGS === 'true') {
      console.log('[AOP] Initialized successfully', {
        installedInterceptors,
        config,
        results
      });
    }
    
    return {
      success: true,
      installedInterceptors: [...installedInterceptors],
      results,
      config
    };
    
  } catch (error) {
    console.error('[AOP] Failed to initialize:', error);
    return {
      success: false,
      error: error.message,
      installedInterceptors: [...installedInterceptors]
    };
  }
}

/**
 * 清理AOP系统
 * @returns {Object} 清理结果
 */
export function cleanupAOP() {
  if (!isInitialized) {
    console.warn('[AOP] Not initialized');
    return { success: false, message: 'Not initialized' };
  }
  
  try {
    const results = [];
    
    // 卸载所有已安装的拦截器
    installedInterceptors.forEach(interceptorName => {
      try {
        let success = false;
        
        switch (interceptorName) {
          case 'component':
            success = uninstallComponentInterceptor();
            break;
          case 'hook':
            success = uninstallHookInterceptor();
            break;
          case 'store':
            success = uninstallStoreInterceptor();
            break;
          case 'auth':
            success = uninstallAuthInterceptor();
            break;
          case 'performance':
            success = uninstallPerformanceInterceptor();
            break;
        }
        
        results.push({ interceptor: interceptorName, success });
      } catch (error) {
        results.push({ interceptor: interceptorName, success: false, error: error.message });
      }
    });
    
    installedInterceptors = [];
    isInitialized = false;
    
    if (import.meta.env.DEV) {
      console.log('[AOP] Cleaned up successfully', { results });
    }
    
    return { success: true, results };
    
  } catch (error) {
    console.error('[AOP] Failed to cleanup:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 获取AOP系统状态
 * @returns {Object} 状态信息
 */
export function getAOPStatus() {
  return {
    isInitialized,
    installedInterceptors: [...installedInterceptors],
    interceptorStatus: {
      component: isComponentInterceptorInstalled(),
      hook: isHookInterceptorInstalled(),
      store: isStoreInterceptorInstalled(),
      auth: isAuthInterceptorInstalled(),
      performance: isPerformanceInterceptorInstalled()
    }
  };
}

/**
 * 获取AOP统计信息
 * @returns {Object} 统计信息
 */
export function getAOPStats() {
  const stats = {
    timestamp: new Date().toISOString(),
    isInitialized,
    installedInterceptors: [...installedInterceptors]
  };
  
  try {
    if (isComponentInterceptorInstalled()) {
      stats.component = getComponentInterceptorStats();
    }
    
    if (isHookInterceptorInstalled()) {
      stats.hook = getHookInterceptorStats();
    }
    
    if (isStoreInterceptorInstalled()) {
      stats.store = getStoreInterceptorStats();
    }
    
    if (isAuthInterceptorInstalled()) {
      stats.auth = getAuthInterceptorStats();
    }
    
    if (isPerformanceInterceptorInstalled()) {
      stats.performance = getPerformanceInterceptorStats();
    }
  } catch (error) {
    stats.error = error.message;
  }
  
  return stats;
}

/**
 * 更新AOP配置
 * @param {Object} newConfig - 新配置
 */
export function updateAOPConfig(newConfig) {
  Object.assign(aopConfig, newConfig);
}

// 默认导出
export default {
  initialize: initializeAOP,
  cleanup: cleanupAOP,
  getStatus: getAOPStatus,
  getStats: getAOPStats,
  updateConfig: updateAOPConfig
};