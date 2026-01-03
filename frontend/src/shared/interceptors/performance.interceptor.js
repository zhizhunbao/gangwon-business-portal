/**
 * Performance Interceptor - 性能监控拦截器
 * 
 * 自动监控应用性能指标
 * 
 * Requirements: 4.3, 4.4
 */

import { LOG_LAYERS, generateRequestId } from '@shared/logger';
import { createLogger } from '@shared/hooks/useLogger';
import { LOGGING_CONFIG, shouldExcludeFromPerformanceMonitoring } from '@shared/logger/config';

const FILE_PATH = 'src/shared/interceptors/performance.interceptor.js';
const log = createLogger(FILE_PATH);

let isInstalled = false;

const performanceConfig = {
  enableNetworkMonitoring: LOGGING_CONFIG.performance.enableNetworkMonitoring,
  enableRenderMonitoring: LOGGING_CONFIG.performance.enableMemoryMonitoring,
  enableMemoryMonitoring: LOGGING_CONFIG.performance.enableMemoryMonitoring,
  enableNavigationMonitoring: true,
  slowRequestThreshold: LOGGING_CONFIG.performance.slowRequestThreshold,
  slowRenderThreshold: 16,
  memoryWarningThreshold: LOGGING_CONFIG.performance.memoryWarningThreshold,
  reportInterval: LOGGING_CONFIG.performance.reportInterval
};

const performanceStats = {
  networkRequests: [],
  renderMetrics: [],
  memoryUsage: [],
  navigationMetrics: [],
  slowOperations: [],
  errors: []
};

let monitoringInterval = null;
let memoryMonitoringInterval = null;

function monitorNetworkPerformance() {
  if (!performanceConfig.enableNetworkMonitoring) return;
  
  try {
    const originalFetch = window.fetch;
    window.fetch = async function interceptedFetch(resource, options = {}) {
      const startTime = performance.now();
      const url = typeof resource === 'string' ? resource : resource.url;
      const method = options.method || 'GET';
      const requestId = generateRequestId();
      
      const isLoggingRequest = shouldExcludeFromPerformanceMonitoring(url);
      
      try {
        const response = await originalFetch(resource, options);
        const endTime = performance.now();
        const duration = Math.round(endTime - startTime);
        
        if (!isLoggingRequest && duration > performanceConfig.slowRequestThreshold) {
          log.warn(LOG_LAYERS.PERFORMANCE, `Slow network_request: ${method} ${url} (${duration}ms > ${performanceConfig.slowRequestThreshold}ms)`, {
            request_id: requestId,
            metric_name: 'network_request',
            metric_value: duration,
            metric_unit: 'ms',
            method,
            url,
            status: response.status,
            duration_ms: duration,
            threshold_ms: performanceConfig.slowRequestThreshold,
            is_slow: true
          });
          
          performanceStats.slowOperations.push({
            type: 'fetch',
            method,
            url,
            duration
          });
        }
        
        if (!isLoggingRequest) {
          performanceStats.networkRequests.push({
            method,
            url,
            status: response.status,
            duration
          });
          
          if (performanceStats.networkRequests.length > 100) {
            performanceStats.networkRequests = performanceStats.networkRequests.slice(-50);
          }
        }
        
        return response;
      } catch (error) {
        if (!isLoggingRequest) {
          performanceStats.errors.push({
            type: 'fetch',
            method,
            url,
            error: error.message
          });
        }
        
        throw error;
      }
    };
    
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;
    
    XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
      this._startTime = performance.now();
      this._method = method;
      this._url = url;
      this._requestId = generateRequestId();
      this._isLoggingRequest = shouldExcludeFromPerformanceMonitoring(url);
      
      return originalXHROpen.call(this, method, url, async, user, password);
    };
    
    XMLHttpRequest.prototype.send = function(data) {
      const xhr = this;
      
      const originalOnReadyStateChange = xhr.onreadystatechange;
      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
          const duration = Math.round(performance.now() - xhr._startTime);
          
          if (!xhr._isLoggingRequest && duration > performanceConfig.slowRequestThreshold) {
            log.warn(LOG_LAYERS.PERFORMANCE, `Slow network_request: ${xhr._method} ${xhr._url} (${duration}ms > ${performanceConfig.slowRequestThreshold}ms)`, {
              request_id: xhr._requestId,
              metric_name: 'network_request',
              metric_value: duration,
              metric_unit: 'ms',
              method: xhr._method,
              url: xhr._url,
              status: xhr.status,
              duration_ms: duration,
              threshold_ms: performanceConfig.slowRequestThreshold,
              is_slow: true
            });
            
            performanceStats.slowOperations.push({
              type: 'xhr',
              method: xhr._method,
              url: xhr._url,
              duration
            });
          }
          
          if (!xhr._isLoggingRequest) {
            performanceStats.networkRequests.push({
              method: xhr._method,
              url: xhr._url,
              status: xhr.status,
              duration
            });
          }
        }
        
        if (originalOnReadyStateChange) {
          originalOnReadyStateChange.call(this);
        }
      };
      
      return originalXHRSend.call(this, data);
    };
    
  } catch (error) {
    console.error('[PerformanceInterceptor] Failed to monitor network performance:', error);
  }
}

function monitorNavigationPerformance() {
  if (!performanceConfig.enableNavigationMonitoring) return;
  
  try {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        if (navigation) {
          const metrics = {
            dns_lookup: Math.round(navigation.domainLookupEnd - navigation.domainLookupStart),
            tcp_connect: Math.round(navigation.connectEnd - navigation.connectStart),
            request_response: Math.round(navigation.responseEnd - navigation.requestStart),
            dom_parse: Math.round(navigation.domContentLoadedEventEnd - navigation.responseEnd),
            resource_load: Math.round(navigation.loadEventEnd - navigation.domContentLoadedEventEnd),
            total_load_time: Math.round(navigation.loadEventEnd - navigation.navigationStart),
            timestamp: new Date().toISOString()
          };
          
          log.info(LOG_LAYERS.PERFORMANCE, 'Page Navigation Performance', {
            navigation_type: navigation.type,
            ...metrics
          });
          
          performanceStats.navigationMetrics.push(metrics);
        }
      }, 0);
    });
    
    document.addEventListener('visibilitychange', () => {
      log.debug(LOG_LAYERS.PERFORMANCE, `Page Visibility Changed: ${document.visibilityState}`, {
        visibility_state: document.visibilityState,
        timestamp: new Date().toISOString()
      });
    });
    
  } catch (error) {
    console.error('[PerformanceInterceptor] Failed to monitor navigation performance:', error);
  }
}

function monitorMemoryUsage() {
  if (!performanceConfig.enableMemoryMonitoring || !performance.memory) return;
  
  try {
    const memory = performance.memory;
    const memoryUsage = {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      limit: memory.jsHeapSizeLimit,
      usage_percentage: Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100),
      timestamp: new Date().toISOString()
    };
    
    const isHighMemory = memory.usedJSHeapSize > performanceConfig.memoryWarningThreshold;
    
    const message = isHighMemory 
      ? `Slow memory_usage: App (${Math.round(memory.usedJSHeapSize / 1024 / 1024)}MB > ${Math.round(performanceConfig.memoryWarningThreshold / 1024 / 1024)}MB)`
      : `Perf: memory_usage = ${Math.round(memory.usedJSHeapSize / 1024 / 1024)}MB`;
    
    if (isHighMemory) {
      log.warn(LOG_LAYERS.PERFORMANCE, message, {
        metric_name: 'memory_usage',
        metric_value: memory.usedJSHeapSize,
        metric_unit: 'bytes',
        threshold_ms: performanceConfig.memoryWarningThreshold,
        is_slow: isHighMemory,
        ...memoryUsage
      });
    } else {
      log.info(LOG_LAYERS.PERFORMANCE, message, {
        metric_name: 'memory_usage',
        metric_value: memory.usedJSHeapSize,
        metric_unit: 'bytes',
        ...memoryUsage
      });
    }
    
    performanceStats.memoryUsage.push(memoryUsage);
    
    if (performanceStats.memoryUsage.length > 100) {
      performanceStats.memoryUsage = performanceStats.memoryUsage.slice(-50);
    }
    
  } catch (error) {
    console.error('[PerformanceInterceptor] Failed to monitor memory usage:', error);
  }
}

export function installPerformanceInterceptor(config = {}) {
  if (isInstalled) {
    console.warn('[PerformanceInterceptor] Already installed');
    return false;
  }
  
  try {
    Object.assign(performanceConfig, config);
    
    monitorNetworkPerformance();
    
    if (import.meta.env.DEV) {
      monitorNavigationPerformance();
      memoryMonitoringInterval = setInterval(monitorMemoryUsage, 30000);
    }
    
    isInstalled = true;
    
    if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_AOP_DEBUG_LOGS === 'true') {
      console.log('[PerformanceInterceptor] Installed successfully');
    }
    
    return true;
  } catch (error) {
    console.error('[PerformanceInterceptor] Failed to install:', error);
    return false;
  }
}

export function uninstallPerformanceInterceptor() {
  if (!isInstalled) {
    console.warn('[PerformanceInterceptor] Not installed');
    return false;
  }
  
  try {
    if (monitoringInterval) {
      clearInterval(monitoringInterval);
      monitoringInterval = null;
    }
    
    if (memoryMonitoringInterval) {
      clearInterval(memoryMonitoringInterval);
      memoryMonitoringInterval = null;
    }
    
    isInstalled = false;
    
    return true;
  } catch (error) {
    console.error('[PerformanceInterceptor] Failed to uninstall:', error);
    return false;
  }
}

export function isPerformanceInterceptorInstalled() {
  return isInstalled;
}

export function getPerformanceInterceptorStats() {
  return {
    isInstalled,
    config: { ...performanceConfig },
    networkRequests: performanceStats.networkRequests.length,
    memorySnapshots: performanceStats.memoryUsage.length,
    slowOperations: performanceStats.slowOperations.length,
    errors: performanceStats.errors.length,
    recentNetworkRequests: performanceStats.networkRequests.slice(-5),
    recentMemoryUsage: performanceStats.memoryUsage.slice(-5),
    recentSlowOperations: performanceStats.slowOperations.slice(-5)
  };
}

export function resetPerformanceInterceptorStats() {
  performanceStats.networkRequests = [];
  performanceStats.renderMetrics = [];
  performanceStats.memoryUsage = [];
  performanceStats.navigationMetrics = [];
  performanceStats.slowOperations = [];
  performanceStats.errors = [];
}

export function updatePerformanceConfig(newConfig) {
  Object.assign(performanceConfig, newConfig);
}

export default {
  install: installPerformanceInterceptor,
  uninstall: uninstallPerformanceInterceptor,
  isInstalled: isPerformanceInterceptorInstalled,
  getStats: getPerformanceInterceptorStats,
  resetStats: resetPerformanceInterceptorStats,
  updateConfig: updatePerformanceConfig
};
