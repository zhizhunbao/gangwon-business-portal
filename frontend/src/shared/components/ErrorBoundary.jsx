/**
 * Error Boundary Component
 * 
 * React error boundary to catch JavaScript errors anywhere in the child component tree,
 * log those errors, and display a fallback UI instead of crashing the whole app.
 */

import React from 'react';
import loggerService from '@shared/services/logger.service';
import exceptionService from '@shared/services/exception.service';
import { cn } from '@shared/utils/helpers';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to our exception service
    loggerService.error('Error caught by boundary', {
      module: 'ErrorBoundary',
      function: 'componentDidCatch',
      error_message: error.message,
      error_name: error.name
    });
    
    exceptionService.recordException(error, {
      request_path: window.location.pathname,
      context_data: {
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
      },
    });

    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.state.errorInfo, this.handleReset);
      }

      // Default fallback UI
      return (
        <div className="flex items-center justify-center min-h-screen p-8 bg-gray-100">
          <div className="max-w-[600px] w-full bg-white rounded-lg p-12 shadow-lg text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-4">发生了一个错误</h1>
            <p className="text-gray-600 leading-relaxed mb-8">
              抱歉，应用程序遇到了意外错误。我们已经记录了此错误，我们的团队将尽快修复。
            </p>
            
            {import.meta.env.DEV && this.state.error && (
              <details className="text-left my-8 p-4 bg-gray-50 rounded border border-gray-200">
                <summary className="cursor-pointer font-medium text-gray-900 mb-2">错误详情（仅开发环境）</summary>
                <pre className="mt-4 p-4 bg-white border border-gray-200 rounded overflow-x-auto text-xs text-red-600 whitespace-pre-wrap break-all">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="flex gap-4 justify-center mt-8">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-6 py-3 bg-blue-600 text-white border-none rounded font-medium text-base cursor-pointer transition-all duration-200 hover:bg-blue-700"
              >
                重试
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="px-6 py-3 bg-gray-100 text-gray-900 border border-gray-300 rounded font-medium text-base cursor-pointer transition-all duration-200 hover:bg-gray-200"
              >
                重新加载页面
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
