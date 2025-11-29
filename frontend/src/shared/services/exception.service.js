/**
 * Exception Service
 * 
 * Service for recording application exceptions to the backend.
 * This service captures frontend errors and exceptions and sends them to the backend
 * for centralized error tracking and debugging.
 */

import { apiClient } from './api.service';
import { getStorage } from '@shared/utils/storage';

const API_PREFIX = '/api/v1/exceptions';

/**
 * Generate a trace ID for request tracking
 */
function generateTraceId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get current user ID from storage
 */
function getCurrentUserId() {
  try {
    const userInfo = getStorage('user_info');
    if (userInfo) {
      const user = typeof userInfo === 'string' ? JSON.parse(userInfo) : userInfo;
      return user.id || user.user_id;
    }
  } catch (e) {
    // Ignore errors
  }
  return null;
}

/**
 * Get client information
 */
function getClientInfo() {
  return {
    user_agent: navigator.userAgent,
    url: window.location.href,
    referrer: document.referrer,
    language: navigator.language,
    screen: {
      width: window.screen.width,
      height: window.screen.height,
    },
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
  };
}

/**
 * Sanitize request data to avoid sending sensitive information
 */
function sanitizeData(data) {
  if (!data) return null;
  
  try {
    const sanitized = { ...data };
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'password_hash', 'token', 'access_token', 'refresh_token', 'secret', 'api_key'];
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    });
    
    // Limit size to avoid huge payloads
    const jsonStr = JSON.stringify(sanitized);
    if (jsonStr.length > 1000) {
      return { ...sanitized, _truncated: true, _original_size: jsonStr.length };
    }
    
    return sanitized;
  } catch (e) {
    return { _error: 'Failed to sanitize data' };
  }
}

/**
 * Local storage key for exceptions queue
 */
const STORAGE_KEY = 'app_exceptions_queue';
const MAX_STORAGE_SIZE = 100; // Maximum items to store locally

/**
 * Save queue to local storage
 */
function saveQueueToStorage(exceptions) {
  try {
    // Limit storage size to avoid exceeding localStorage limits
    const exceptionsToStore = exceptions.slice(0, MAX_STORAGE_SIZE);
    
    if (exceptionsToStore.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(exceptionsToStore));
    }
  } catch (e) {
    // If storage is full, try to clear old items
    console.warn('Failed to save exceptions to localStorage:', e);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (clearError) {
      // Ignore clear errors
    }
  }
}

/**
 * Load queue from local storage
 */
function loadQueueFromStorage() {
  try {
    const exceptionsStr = localStorage.getItem(STORAGE_KEY);
    const exceptions = exceptionsStr ? JSON.parse(exceptionsStr) : [];
    
    // Clear storage after loading
    localStorage.removeItem(STORAGE_KEY);
    
    return exceptions;
  } catch (e) {
    console.warn('Failed to load exceptions from localStorage:', e);
    return [];
  }
}

/**
 * Exception Service Class
 */
class ExceptionService {
  constructor() {
    this.queue = [];
    this.flushInterval = null;
    this.maxQueueSize = 50;
    this.flushDelay = 5000; // 5 seconds
    this.traceId = generateTraceId();
    
    // Load pending exceptions from local storage on startup
    this.loadPendingExceptions();
    
    // Start periodic flush
    this.startFlushInterval();
    
    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      this.saveQueueToStorage();
      // Try to flush, but don't wait (page might close)
      this.flush().catch(() => {});
    });
    
    // Save queue to storage periodically
    this.saveInterval = setInterval(() => {
      this.saveQueueToStorage();
    }, 2000); // Save every 2 seconds
  }
  
  /**
   * Load pending exceptions from local storage
   */
  loadPendingExceptions() {
    const exceptions = loadQueueFromStorage();
    
    // Add loaded exceptions to queue
    exceptions.forEach(exception => {
      this.queue.push(exception);
    });
    
    if (exceptions.length > 0) {
      console.info(`Loaded ${exceptions.length} exceptions from local storage`);
    }
  }
  
  /**
   * Save current queue to local storage
   */
  saveQueueToStorage() {
    if (this.queue.length > 0) {
      saveQueueToStorage(this.queue);
    }
  }

  /**
   * Start periodic flush interval
   */
  startFlushInterval() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    
    this.flushInterval = setInterval(() => {
      this.flush();
    }, this.flushDelay);
  }

  /**
   * Record an exception
   */
  async recordException(exception, context = {}) {
    const exceptionEntry = {
      source: 'frontend',
      exception_type: exception.name || 'Error',
      exception_message: exception.message || String(exception),
      error_code: context.error_code,
      status_code: context.status_code,
      trace_id: context.trace_id || this.traceId,
      user_id: getCurrentUserId(),
      ip_address: null, // Will be set by backend
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
      context_data: {
        ...getClientInfo(),
        ...context.context_data,
      },
    };

    // Add to queue first (for persistence)
    this.queue.push(exceptionEntry);
    this.saveQueueToStorage();
    
    // Try to send immediately for exceptions
    try {
      await apiClient.post(`${API_PREFIX}/frontend`, exceptionEntry);
      // If successful, remove from queue
      const index = this.queue.findIndex(item => item === exceptionEntry);
      if (index !== -1) {
        this.queue.splice(index, 1);
        this.saveQueueToStorage();
      }
    } catch (e) {
      // If sending fails, keep in queue (already added above)
      console.error('Failed to send exception to backend:', e);
    }

    // Also log to console
    console.error('Exception recorded:', exception, context);
  }

  /**
   * Flush queued exceptions to backend
   */
  async flush() {
    if (this.queue.length === 0) {
      return;
    }

    const exceptionsToSend = [...this.queue];
    const successfullySent = [];

    try {
      // Send exceptions individually
      for (const exception of exceptionsToSend) {
        try {
          await apiClient.post(`${API_PREFIX}/frontend`, exception);
          successfullySent.push(exception);
        } catch (e) {
          // If sending fails, keep in queue (but limit retries)
          if (!exception._retry_count || exception._retry_count < 3) {
            exception._retry_count = (exception._retry_count || 0) + 1;
            // Keep in queue
          } else {
            // Too many retries, remove from queue
            console.warn('Exception failed to send after multiple retries, removing from queue:', exception);
          }
        }
      }
      
      // Remove successfully sent items from queue
      this.queue = this.queue.filter(item => !successfullySent.includes(item));
      
      // Update local storage
      this.saveQueueToStorage();
    } catch (e) {
      // If all fails, keep everything in queue
      console.error('Failed to flush exceptions to backend:', e);
      this.saveQueueToStorage();
    }
  }
}

// Create singleton instance
const exceptionService = new ExceptionService();

// Set up global error handlers
if (typeof window !== 'undefined') {
  // Handle unhandled errors
  window.addEventListener('error', (event) => {
    exceptionService.recordException(event.error || new Error(event.message), {
      request_path: window.location.pathname,
      context_data: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    exceptionService.recordException(
      event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
      {
        request_path: window.location.pathname,
        context_data: {
          type: 'unhandled_promise_rejection',
        },
      }
    );
  });
}

export default exceptionService;

