/**
 * Application Entry Point
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '@shared/styles/index.css';

// Import global exception handler
import { globalExceptionHandler } from '@shared/utils/exception.global.js';

// Import AOP initializer for comprehensive logging
import { initializeAOP } from '@shared/utils/aop.initializer';

// 禁用 React DevTools 提示和 react-quill 的 findDOMNode 警告
if (typeof window !== 'undefined') {
  const originalConsoleWarn = console.warn;
  console.warn = (...args) => {
    const message = args[0];
    
    // 忽略 React DevTools 提示
    if (message && typeof message === 'string' && message.includes('Download the React DevTools')) {
      return;
    }
    
    // 忽略 react-quill 的 findDOMNode 弃用警告
    if (message && typeof message === 'string' && message.includes('findDOMNode is deprecated')) {
      return;
    }
    
    originalConsoleWarn.apply(console, args);
  };
}

// Initialize global exception handler
function initializeExceptionHandler() {
  try {
    // Configure exception handler based on environment
    const config = {
      enableConsoleLogging: false, // 关闭控制台日志，减少噪音
      enableDebugMode: false,      // 关闭调试模式
      sampleRate: import.meta.env.PROD ? 0.1 : 1.0, // 10% sampling in production
      maxErrorsPerSession: import.meta.env.PROD ? 50 : 100,
      
      // Custom filters for development
      customFilters: [
        // Filter out development-only errors
        (error, context) => {
          if (import.meta.env.DEV) {
            // Allow all errors in development
            return true;
          }
          
          // Filter out some common development errors in production
          const message = error.message.toLowerCase();
          if (message.includes('chunk load error') || 
              message.includes('loading chunk')) {
            return false;
          }
          
          return true;
        }
      ]
    };
    
    // Update configuration
    globalExceptionHandler.updateConfig(config);
    
    // Install global handlers
    globalExceptionHandler.install();
    
    // 只在开发环境且启用调试日志时输出初始化信息
    if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_AOP_DEBUG_LOGS === 'true') {
      console.log('[Exception Handler] Global exception handler initialized');
    }
    
  } catch (error) {
    console.error('[Exception Handler] Failed to initialize:', error);
  }
}

// Enable MSW in development (disabled by default - use real backend API)
async function enableMocking() {
  // MSW is disabled by default. Set VITE_USE_MOCK=true in .env to enable
  if (import.meta.env.VITE_USE_MOCK === 'true' && import.meta.env.DEV) {
    const { worker } = await import('./mocks/browser');
    
    return worker.start({
      onUnhandledRequest(request, print) {
        // Only intercept API requests, ignore route requests
        if (request.url.includes('/api/')) {
          print.warning();
        }
        // Silently ignore non-API requests (routes, static assets, etc.)
      },
      serviceWorker: {
        url: '/mockServiceWorker.js'
      },
      quiet: false // Enable logging to see if MSW is working
    }).catch((error) => {
      console.error('[MSW] Failed to start Mock Service Worker:', error);
    });
  }
  
  // MSW disabled - using real backend API
  return Promise.resolve();
}

// Initialize application
async function initializeApp() {
  try {
    // Initialize AOP system for comprehensive logging
    const aopResult = initializeAOP({
      // 可以在这里覆盖默认配置
      // 使用环境变量配置，如果未设置则使用默认值
      enableComponentLogging: import.meta.env.VITE_ENABLE_COMPONENT_LOGGING !== 'false' && import.meta.env.DEV, // 只在开发环境启用组件日志，但可以通过环境变量禁用
      enableHookLogging: import.meta.env.VITE_ENABLE_HOOK_LOGGING !== 'false' && import.meta.env.DEV,      // 只在开发环境启用Hook日志
      enableStoreLogging: import.meta.env.VITE_ENABLE_STORE_LOGGING !== 'false',                    // 总是启用Store日志，除非明确禁用
      enableAuthLogging: import.meta.env.VITE_ENABLE_AUTH_LOGGING !== 'false',                     // 总是启用Auth日志，除非明确禁用
      enablePerformanceMonitoring: import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING !== 'false',          // 总是启用性能监控，除非明确禁用
      performance: {
        reportInterval: import.meta.env.DEV ? 30000 : 300000, // 开发环境30秒，生产环境5分钟
        memoryWarningThreshold: import.meta.env.VITE_MEMORY_WARNING_THRESHOLD ? 
          parseInt(import.meta.env.VITE_MEMORY_WARNING_THRESHOLD) * 1024 * 1024 : 
          200 * 1024 * 1024 // 默认200MB
      }
    });
    
    // 只在开发环境且启用调试日志时显示AOP初始化信息
    if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_AOP_DEBUG_LOGS === 'true' && aopResult.success) {
      console.log('[App] AOP system initialized:', aopResult.installedInterceptors);
    } else if (!aopResult.success) {
      console.error('[App] AOP system failed to initialize:', aopResult.error);
    }
    
    // Initialize exception handler first
    initializeExceptionHandler();
    
    // Enable mocking if needed
    await enableMocking();
    
    // Render application
    ReactDOM.createRoot(document.getElementById('root')).render(
      <App />
    );
    
  } catch (error) {
    console.error('[App] Failed to initialize application:', error);
    
    // Try to report the initialization error
    if (globalExceptionHandler) {
      globalExceptionHandler.reportException(error, {
        phase: 'initialization',
        critical: true
      });
    }
    
    // Show fallback UI
    document.getElementById('root').innerHTML = `
      <div style="padding: 20px; text-align: center; color: #721c24; background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; margin: 20px;">
        <h2>应用初始化失败</h2>
        <p>应用程序无法正常启动，请刷新页面重试。</p>
        <p style="font-size: 12px; color: #666; margin-top: 10px;">错误信息: ${error.message}</p>
      </div>
    `;
  }
}

// Start the application
initializeApp();

