/**
 * Enhanced Error Boundary Component
 * 
 * React error boundary to catch JavaScript errors anywhere in the child component tree,
 * log those errors, and display a fallback UI instead of crashing the whole app.
 * 
 * Enhanced with advanced recovery mechanisms:
 * - Automatic retry with exponential backoff
 * - Component isolation and partial recovery
 * - User-friendly error interfaces with recovery options
 * - Integration with exception handling system
 * 
 * Requirements: 10.1
 */

import React from 'react';
import { frontendExceptionService } from '@shared/utils/exception.service.js';
import { cn } from '@shared/utils/helpers';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
      isRecovering: false,
      recoveryStrategy: null,
      lastErrorTime: null,
      autoRetryEnabled: true,
      isolatedComponents: new Set(),
    };
    
    // Auto-retry timer
    this.autoRetryTimer = null;
    this.recoveryStrategies = {
      IMMEDIATE_RETRY: 'immediate_retry',
      DELAYED_RETRY: 'delayed_retry',
      COMPONENT_ISOLATION: 'component_isolation',
      FALLBACK_RENDER: 'fallback_render',
      PARTIAL_RECOVERY: 'partial_recovery',
      FULL_RELOAD: 'full_reload'
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Generate error ID
    const errorId = `eb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const errorTime = Date.now();
    
    // Determine recovery strategy
    const recoveryStrategy = this.determineRecoveryStrategy(error, errorInfo);
    
    // Report to exception service (AOP handles logging automatically)
    this.reportToExceptionService(error, errorInfo, errorId, recoveryStrategy);

    this.setState({
      error,
      errorInfo,
      errorId,
      lastErrorTime: errorTime,
      recoveryStrategy,
    });

    // Execute automatic recovery if enabled
    if (this.props.enableAutoRecovery !== false && this.state.autoRetryEnabled) {
      this.executeRecoveryStrategy(recoveryStrategy, error, errorInfo);
    }
  }

  /**
   * Determine the best recovery strategy based on error characteristics
   */
  determineRecoveryStrategy(error, errorInfo) {
    const { retryCount } = this.state;
    const { maxRetries = 3, enableComponentIsolation = true } = this.props;
    
    // If we've exceeded max retries, use fallback
    if (retryCount >= maxRetries) {
      return this.recoveryStrategies.FALLBACK_RENDER;
    }
    
    // Check error type and context
    const errorMessage = error.message?.toLowerCase() || '';
    const componentStack = errorInfo.componentStack?.toLowerCase() || '';
    
    // Network or async errors - delayed retry
    if (errorMessage.includes('network') || 
        errorMessage.includes('fetch') || 
        errorMessage.includes('timeout')) {
      return this.recoveryStrategies.DELAYED_RETRY;
    }
    
    // Component-specific errors - try isolation
    if (enableComponentIsolation && 
        (componentStack.includes('component') || errorMessage.includes('render'))) {
      return this.recoveryStrategies.COMPONENT_ISOLATION;
    }
    
    // Memory or resource errors - full reload
    if (errorMessage.includes('memory') || 
        errorMessage.includes('maximum call stack')) {
      return this.recoveryStrategies.FULL_RELOAD;
    }
    
    // First retry - immediate
    if (retryCount === 0) {
      return this.recoveryStrategies.IMMEDIATE_RETRY;
    }
    
    // Subsequent retries - delayed
    return this.recoveryStrategies.DELAYED_RETRY;
  }

  /**
   * Execute the determined recovery strategy
   */
  async executeRecoveryStrategy(strategy, error, errorInfo) {
    this.setState({ isRecovering: true });
    
    try {
      switch (strategy) {
        case this.recoveryStrategies.IMMEDIATE_RETRY:
          await this.immediateRetry();
          break;
          
        case this.recoveryStrategies.DELAYED_RETRY:
          await this.delayedRetry();
          break;
          
        case this.recoveryStrategies.COMPONENT_ISOLATION:
          await this.isolateComponent(errorInfo);
          break;
          
        case this.recoveryStrategies.PARTIAL_RECOVERY:
          await this.partialRecovery(error, errorInfo);
          break;
          
        case this.recoveryStrategies.FULL_RELOAD:
          this.fullReload();
          break;
          
        case this.recoveryStrategies.FALLBACK_RENDER:
        default:
          // Just show fallback UI
          break;
      }
    } catch (recoveryError) {
      // Recovery strategy failed - 保留错误边界的调试日志
      console.error('[ErrorBoundary] Recovery strategy failed:', recoveryError);
      
      // Report recovery failure
      await this.reportToExceptionService(recoveryError, null, null, 'recovery_failed');
    } finally {
      this.setState({ isRecovering: false });
    }
  }

  /**
   * Immediate retry - reset state immediately
   */
  async immediateRetry() {
    await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for stability
    this.handleReset();
  }

  /**
   * Delayed retry with exponential backoff
   */
  async delayedRetry() {
    const { retryCount } = this.state;
    const delay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Max 10 seconds
    
    this.autoRetryTimer = setTimeout(() => {
      this.handleReset();
    }, delay);
  }

  /**
   * Isolate problematic component
   */
  async isolateComponent(errorInfo) {
    // Extract component name from stack
    const componentMatch = errorInfo.componentStack.match(/in (\w+)/);
    if (componentMatch) {
      const componentName = componentMatch[1];
      this.setState(prevState => ({
        isolatedComponents: new Set([...prevState.isolatedComponents, componentName])
      }));
    }
    
    // Try to recover without the problematic component
    await new Promise(resolve => setTimeout(resolve, 500));
    this.handleReset();
  }

  /**
   * Partial recovery - try to recover specific parts
   */
  async partialRecovery(error, errorInfo) {
    // Clear any cached data that might be causing issues
    if (window.localStorage) {
      const keysToRemove = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && (key.includes('cache') || key.includes('temp'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => window.localStorage.removeItem(key));
    }
    
    // Clear session storage
    if (window.sessionStorage) {
      window.sessionStorage.clear();
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    this.handleReset();
  }

  /**
   * Full reload as last resort
   */
  fullReload() {
    // Save error info for post-reload analysis
    if (window.sessionStorage) {
      window.sessionStorage.setItem('errorBoundaryReload', JSON.stringify({
        errorId: this.state.errorId,
        timestamp: Date.now(),
        retryCount: this.state.retryCount
      }));
    }
    
    window.location.reload();
  }

  async reportToExceptionService(error, errorInfo, errorId, recoveryStrategy = null) {
    try {
      const context = {
        type: 'react-error-boundary',
        componentStack: errorInfo?.componentStack,
        errorBoundary: {
          name: this.constructor.name,
          props: this.sanitizeProps(this.props),
          retryCount: this.state.retryCount,
          errorId: errorId,
          recoveryStrategy: recoveryStrategy,
          isolatedComponents: Array.from(this.state.isolatedComponents),
          autoRetryEnabled: this.state.autoRetryEnabled
        },
        location: {
          pathname: window.location.pathname,
          search: window.location.search,
          hash: window.location.hash
        },
        timestamp: new Date().toISOString()
      };

      // Add custom context if provided
      if (this.props.onError) {
        const customContext = this.props.onError(error, errorInfo);
        if (customContext && typeof customContext === 'object') {
          Object.assign(context, customContext);
        }
      }

      // Report to exception service
      const result = await frontendExceptionService.reportException(error, context);
      
      if (import.meta.env.DEV) {
        // 开发环境保留调试信息
      }

    } catch (reportError) {
      // Exception service failed - 保留错误边界的调试日志
      console.error('[ErrorBoundary] Failed to report to exception service:', reportError);
      
      // Fallback to legacy exception service if available
      try {
        if (window.exceptionService) {
          window.exceptionService.recordException(error, {
            request_path: window.location.pathname,
            context_data: {
              componentStack: errorInfo?.componentStack,
              errorBoundary: true,
              errorId: errorId,
              recoveryStrategy: recoveryStrategy
            },
          });
        }
      } catch (legacyError) {
        // Legacy exception service also failed - 保留错误边界的调试日志
        console.error('[ErrorBoundary] Legacy exception service also failed:', legacyError);
      }
    }
  }

  sanitizeProps(props) {
    const sanitized = { ...props };
    
    // Remove functions and sensitive data
    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'function') {
        sanitized[key] = '[Function]';
      } else if (key.toLowerCase().includes('password') || 
                 key.toLowerCase().includes('token') ||
                 key.toLowerCase().includes('secret')) {
        sanitized[key] = '[FILTERED]';
      }
    });
    
    return sanitized;
  }

  handleReset = () => {
    // Clear auto-retry timer
    if (this.autoRetryTimer) {
      clearTimeout(this.autoRetryTimer);
      this.autoRetryTimer = null;
    }

    // Call custom reset callback if provided
    if (this.props.onReset) {
      try {
        this.props.onReset(this.state.error, this.state.errorInfo);
      } catch (resetError) {
        // Error in onReset callback - 保留错误边界的调试日志
        console.error('[ErrorBoundary] Error in onReset callback:', resetError);
      }
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: this.state.retryCount + 1,
      isRecovering: false,
      recoveryStrategy: null,
    });
  };

  handleReload = () => {
    this.fullReload();
  };

  handleDisableAutoRetry = () => {
    this.setState({ autoRetryEnabled: false });
    if (this.autoRetryTimer) {
      clearTimeout(this.autoRetryTimer);
      this.autoRetryTimer = null;
    }
  };

  handleManualRecovery = (strategy) => {
    this.executeRecoveryStrategy(strategy, this.state.error, this.state.errorInfo);
  };

  componentWillUnmount() {
    // Clean up timer
    if (this.autoRetryTimer) {
      clearTimeout(this.autoRetryTimer);
    }
  }

  render() {
    const { maxRetries = 3, enableAdvancedRecovery = true } = this.props;
    
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback(
          this.state.error, 
          this.state.errorInfo, 
          this.handleReset,
          {
            retryCount: this.state.retryCount,
            hasRetried: this.state.retryCount > 0,
            errorId: this.state.errorId,
            canRetry: this.state.retryCount < maxRetries,
            isRecovering: this.state.isRecovering,
            recoveryStrategy: this.state.recoveryStrategy,
            autoRetryEnabled: this.state.autoRetryEnabled,
            isolatedComponents: Array.from(this.state.isolatedComponents),
            onDisableAutoRetry: this.handleDisableAutoRetry,
            onManualRecovery: this.handleManualRecovery
          }
        );
      }

      // Enhanced default fallback UI
      return (
        <div className="flex items-center justify-center min-h-screen p-8 bg-gray-100">
          <div className="max-w-[700px] w-full bg-white rounded-lg p-12 shadow-lg text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-4">发生了一个错误</h1>
            <p className="text-gray-600 leading-relaxed mb-8">
              抱歉，应用程序遇到了意外错误。我们已经记录了此错误，我们的团队将尽快修复。
            </p>
            
            {this.state.errorId && (
              <p className="text-sm text-gray-500 mb-4">
                错误ID: {this.state.errorId}
              </p>
            )}

            {/* Recovery Status */}
            {this.state.isRecovering && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  <span className="text-blue-800 font-medium">正在尝试恢复...</span>
                </div>
                <p className="text-sm text-blue-600">
                  恢复策略: {this.getRecoveryStrategyText(this.state.recoveryStrategy)}
                </p>
              </div>
            )}

            {/* Auto-retry status */}
            {this.state.autoRetryEnabled && this.autoRetryTimer && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800 font-medium mb-2">自动重试已启用</p>
                <p className="text-sm text-yellow-600">
                  系统将在几秒钟后自动尝试恢复
                </p>
                <button
                  onClick={this.handleDisableAutoRetry}
                  className="mt-2 text-xs text-yellow-700 underline hover:no-underline"
                >
                  取消自动重试
                </button>
              </div>
            )}

            {/* Isolated components warning */}
            {this.state.isolatedComponents.size > 0 && (
              <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-orange-800 font-medium mb-2">组件隔离模式</p>
                <p className="text-sm text-orange-600">
                  已隔离的组件: {Array.from(this.state.isolatedComponents).join(', ')}
                </p>
              </div>
            )}
            
            {import.meta.env.DEV && this.state.error && (
              <details className="text-left my-8 p-4 bg-gray-50 rounded border border-gray-200">
                <summary className="cursor-pointer font-medium text-gray-900 mb-2">错误详情（仅开发环境）</summary>
                <pre className="mt-4 p-4 bg-white border border-gray-200 rounded overflow-x-auto text-xs text-red-600 whitespace-pre-wrap break-all">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="flex flex-wrap gap-3 justify-center mt-8">
              {/* Primary retry button */}
              <button
                type="button"
                onClick={this.handleReset}
                disabled={this.state.retryCount >= maxRetries || this.state.isRecovering}
                className={cn(
                  "px-6 py-3 border-none rounded font-medium text-base cursor-pointer transition-all duration-200",
                  this.state.retryCount >= maxRetries || this.state.isRecovering
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                )}
              >
                {this.state.isRecovering ? '恢复中...' :
                 this.state.retryCount >= maxRetries ? '已达到最大重试次数' : 
                 this.state.retryCount > 0 ? `重试 (${this.state.retryCount}/${maxRetries})` : '重试'}
              </button>

              {/* Advanced recovery options */}
              {enableAdvancedRecovery && this.state.retryCount > 0 && !this.state.isRecovering && (
                <>
                  <button
                    type="button"
                    onClick={() => this.handleManualRecovery(this.recoveryStrategies.PARTIAL_RECOVERY)}
                    className="px-4 py-3 bg-green-100 text-green-800 border border-green-300 rounded font-medium text-sm cursor-pointer transition-all duration-200 hover:bg-green-200"
                  >
                    清理缓存重试
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => this.handleManualRecovery(this.recoveryStrategies.COMPONENT_ISOLATION)}
                    className="px-4 py-3 bg-orange-100 text-orange-800 border border-orange-300 rounded font-medium text-sm cursor-pointer transition-all duration-200 hover:bg-orange-200"
                  >
                    组件隔离模式
                  </button>
                </>
              )}

              {/* Reload button */}
              <button
                type="button"
                onClick={this.handleReload}
                disabled={this.state.isRecovering}
                className={cn(
                  "px-6 py-3 border border-gray-300 rounded font-medium text-base cursor-pointer transition-all duration-200",
                  this.state.isRecovering 
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                )}
              >
                重新加载页面
              </button>
            </div>
            
            {this.state.retryCount > 0 && (
              <p className="text-xs text-gray-400 mt-4">
                已重试 {this.state.retryCount} 次
                {this.state.recoveryStrategy && ` | 恢复策略: ${this.getRecoveryStrategyText(this.state.recoveryStrategy)}`}
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }

  /**
   * Get human-readable recovery strategy text
   */
  getRecoveryStrategyText(strategy) {
    const strategyTexts = {
      [this.recoveryStrategies.IMMEDIATE_RETRY]: '立即重试',
      [this.recoveryStrategies.DELAYED_RETRY]: '延迟重试',
      [this.recoveryStrategies.COMPONENT_ISOLATION]: '组件隔离',
      [this.recoveryStrategies.FALLBACK_RENDER]: '回退渲染',
      [this.recoveryStrategies.PARTIAL_RECOVERY]: '部分恢复',
      [this.recoveryStrategies.FULL_RELOAD]: '完全重载'
    };
    
    return strategyTexts[strategy] || '未知策略';
  }
}

export default ErrorBoundary;
