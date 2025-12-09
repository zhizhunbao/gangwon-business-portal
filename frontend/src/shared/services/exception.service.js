import { apiClient } from './api.service';
import { getStorage } from '@shared/utils/storage';
import loggerService from './logger.service';

const API_PREFIX = '/api/v1/exceptions';

function generateTraceId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getCurrentUserId() {
  try {
    const userInfo = getStorage('user_info');
    if (userInfo) {
      const user = typeof userInfo === 'string' ? JSON.parse(userInfo) : userInfo;
      return user.id || user.user_id;
    }
  } catch (e) {}
  return null;
}

function getClientInfo() {
  return {
    user_agent: navigator.userAgent,
    url: window.location.href,
    referrer: document.referrer,
    language: navigator.language,
    screen: { width: window.screen.width, height: window.screen.height },
    viewport: { width: window.innerWidth, height: window.innerHeight },
  };
}

function sanitizeData(data) {
  if (!data) return null;
  try {
    const sanitized = { ...data };
    const sensitiveFields = ['password', 'password_hash', 'token', 'access_token', 'refresh_token', 'secret', 'api_key'];
    sensitiveFields.forEach(field => {
      if (sanitized[field]) sanitized[field] = '***REDACTED***';
    });
    const jsonStr = JSON.stringify(sanitized);
    if (jsonStr.length > 1000) {
      return { ...sanitized, _truncated: true, _original_size: jsonStr.length };
    }
    return sanitized;
  } catch (e) {
    return { _error: 'Failed to sanitize data' };
  }
}

class ExceptionService {
  constructor() {
    this.traceId = generateTraceId();
  }

  async recordException(exception, context = {}) {
    const exceptionEntry = {
      source: 'frontend',
      exception_type: exception.name || 'Error',
      exception_message: exception.message || String(exception),
      error_code: context.error_code,
      status_code: context.status_code,
      trace_id: context.trace_id || this.traceId,
      user_id: getCurrentUserId(),
      ip_address: null,
      user_agent: navigator.userAgent,
      request_method: context.request_method,
      request_path: context.request_path || window.location.pathname,
      request_data: sanitizeData(context.request_data),
      stack_trace: exception.stack || null,
      exception_details: {
        name: exception.name,
        message: exception.message,
        fileName: exception.fileName,
        lineNumber: exception.lineNumber,
        columnNumber: exception.columnNumber,
      },
      context_data: { ...getClientInfo(), ...context.context_data },
    };

    // Log the exception using loggerService
    loggerService.error(`Exception: ${exceptionEntry.exception_type}`, {
      module: 'ExceptionService',
      function: 'recordException',
      exception_type: exceptionEntry.exception_type,
      exception_message: exceptionEntry.exception_message,
      error_code: exceptionEntry.error_code,
      status_code: exceptionEntry.status_code,
      request_path: exceptionEntry.request_path,
      request_method: exceptionEntry.request_method,
      trace_id: exceptionEntry.trace_id,
      user_id: exceptionEntry.user_id,
    });

    apiClient.post(`${API_PREFIX}/frontend`, exceptionEntry).catch((error) => {
      if (import.meta.env.DEV) {
        console.error('Failed to send exception:', error);
      }
    });

    if (import.meta.env.DEV) {
      console.error('Exception recorded:', exception, context);
    }
  }
}

const exceptionService = new ExceptionService();

if (typeof window !== 'undefined') {
  // Global error handler - catches uncaught JavaScript errors
  window.addEventListener('error', (event) => {
    const error = event.error || new Error(event.message);
    loggerService.error('Global error caught', {
      module: 'ExceptionService',
      function: 'globalErrorHandler',
      error_message: error.message,
      error_name: error.name,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      request_path: window.location.pathname,
    });
    
    exceptionService.recordException(error, {
      request_path: window.location.pathname,
      error_code: 'GLOBAL_ERROR',
      context_data: { filename: event.filename, lineno: event.lineno, colno: event.colno },
    });
  });

  // Global unhandled promise rejection handler
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
    loggerService.error('Unhandled promise rejection', {
      module: 'ExceptionService',
      function: 'unhandledRejectionHandler',
      error_message: error.message,
      error_name: error.name,
      request_path: window.location.pathname,
    });
    
    exceptionService.recordException(error, {
      request_path: window.location.pathname,
      error_code: 'UNHANDLED_PROMISE_REJECTION',
      context_data: { type: 'unhandled_promise_rejection' },
    });
  });
}

export default exceptionService;
