/**
 * Error Boundary Component
 * 
 * React error boundary to catch JavaScript errors anywhere in the child component tree,
 * log those errors, and display a fallback UI instead of crashing the whole app.
 */

import React from 'react';
import exceptionService from '@shared/services/exception.service';
import './ErrorBoundary.css';

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
    exceptionService.recordException(error, {
      request_path: window.location.pathname,
      context_data: {
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
      },
    });

    // Also log to console in development
    if (import.meta.env.DEV) {
      console.error('Error caught by boundary:', error, errorInfo);
    }

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
        <div className="error-boundary">
          <div className="error-boundary__container">
            <div className="error-boundary__icon">⚠️</div>
            <h1 className="error-boundary__title">发生了一个错误</h1>
            <p className="error-boundary__message">
              抱歉，应用程序遇到了意外错误。我们已经记录了此错误，我们的团队将尽快修复。
            </p>
            
            {import.meta.env.DEV && this.state.error && (
              <details className="error-boundary__details">
                <summary>错误详情（仅开发环境）</summary>
                <pre className="error-boundary__stack">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="error-boundary__actions">
              <button
                type="button"
                onClick={this.handleReset}
                className="error-boundary__button error-boundary__button--primary"
              >
                重试
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="error-boundary__button error-boundary__button--secondary"
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
