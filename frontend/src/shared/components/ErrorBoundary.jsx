/**
 * Error Boundary Component
 * 
 * React error boundary to catch JavaScript errors in child components
 * and display a fallback UI instead of crashing the whole app.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@shared/utils/helpers';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    this.setState({ error, errorInfo });

    // Call custom error callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    if (this.props.onReset) {
      this.props.onReset(this.state.error, this.state.errorInfo);
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: this.state.retryCount + 1,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    const { maxRetries = 3 } = this.props;
    
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback(
          this.state.error, 
          this.state.errorInfo, 
          this.handleReset,
          {
            retryCount: this.state.retryCount,
            canRetry: this.state.retryCount < maxRetries,
          }
        );
      }

      // Default fallback UI - wrap in ErrorBoundaryContent to use hooks
      return <ErrorBoundaryContent 
        error={this.state.error}
        errorInfo={this.state.errorInfo}
        retryCount={this.state.retryCount}
        maxRetries={maxRetries}
        onReset={this.handleReset}
        onReload={this.handleReload}
      />;
    }

    return this.props.children;
  }
}

// Separate component to use hooks
function ErrorBoundaryContent({ error, errorInfo, retryCount, maxRetries, onReset, onReload }) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-center min-h-screen p-8 bg-gray-100">
      <div className="max-w-[700px] w-full bg-white rounded-lg p-12 shadow-lg text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">
          {t('error.boundary.title', '오류가 발생했습니다')}
        </h1>
        <p className="text-gray-600 leading-relaxed mb-8">
          {t('error.boundary.message', '죄송합니다. 애플리케이션에 예기치 않은 오류가 발생했습니다. 다시 시도하거나 페이지를 새로고침해 주세요.')}
        </p>
        
        {import.meta.env.DEV && error && (
          <details className="text-left my-8 p-4 bg-gray-50 rounded border border-gray-200">
            <summary className="cursor-pointer font-medium text-gray-900 mb-2">
              {t('error.boundary.detailsTitle', '오류 상세 (개발 환경 전용)')}
            </summary>
            <pre className="mt-4 p-4 bg-white border border-gray-200 rounded overflow-x-auto text-xs text-red-600 whitespace-pre-wrap break-all">
              {error.toString()}
              {errorInfo?.componentStack}
            </pre>
          </details>
        )}

        <div className="flex flex-wrap gap-3 justify-center mt-8">
          <button
            type="button"
            onClick={onReset}
            disabled={retryCount >= maxRetries}
            className={cn(
              "px-6 py-3 border-none rounded font-medium text-base cursor-pointer transition-all duration-200",
              retryCount >= maxRetries
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            )}
          >
            {retryCount >= maxRetries 
              ? t('error.boundary.maxRetriesReached', '최대 재시도 횟수 도달')
              : retryCount > 0 
                ? t('error.boundary.retryWithCount', '다시 시도 ({{count}}/{{max}})', { count: retryCount, max: maxRetries })
                : t('error.boundary.retryButton', '다시 시도')
            }
          </button>

          <button
            type="button"
            onClick={onReload}
            className="px-6 py-3 border border-gray-300 rounded font-medium text-base cursor-pointer transition-all duration-200 bg-gray-100 text-gray-900 hover:bg-gray-200"
          >
            {t('error.boundary.reloadButton', '페이지 새로고침')}
          </button>
        </div>
        
        {retryCount > 0 && (
          <p className="text-xs text-gray-400 mt-4">
            {t('error.boundary.retryCount', '{{count}}회 재시도함', { count: retryCount })}
          </p>
        )}
      </div>
    </div>
  );
}

export default ErrorBoundary;
