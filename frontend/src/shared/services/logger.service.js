/**
 * Logger Service
 * 
 * Service for recording application logs to the backend.
 * This service captures frontend logs and sends them to the backend
 * for centralized logging and debugging.
 */

import { apiClient } from './api.service';
import { getStorage } from '@shared/utils/storage';

const API_PREFIX = '/api/v1/logging';

/**
 * Log levels
 */
export const LOG_LEVELS = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  CRITICAL: 'CRITICAL',
};

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
 * Local storage key for logs queue
 */
const STORAGE_KEY = 'app_logs_queue';
const MAX_STORAGE_SIZE = 100; // Maximum items to store locally

/**
 * Save queue to local storage
 */
function saveQueueToStorage(logs) {
  try {
    // Limit storage size to avoid exceeding localStorage limits
    const logsToStore = logs.slice(0, MAX_STORAGE_SIZE);
    
    if (logsToStore.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(logsToStore));
    }
  } catch (e) {
    // If storage is full, try to clear old items
    console.warn('Failed to save logs to localStorage:', e);
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
    const logsStr = localStorage.getItem(STORAGE_KEY);
    const logs = logsStr ? JSON.parse(logsStr) : [];
    
    // Clear storage after loading
    localStorage.removeItem(STORAGE_KEY);
    
    return logs;
  } catch (e) {
    console.warn('Failed to load logs from localStorage:', e);
    return [];
  }
}

/**
 * Logger Service Class
 */
class LoggerService {
  constructor() {
    this.queue = [];
    this.flushInterval = null;
    this.maxQueueSize = 50;
    this.flushDelay = 5000; // 5 seconds
    this.traceId = generateTraceId();
    
    // Load pending logs from local storage on startup
    this.loadPendingLogs();
    
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
   * Load pending logs from local storage
   */
  loadPendingLogs() {
    const logs = loadQueueFromStorage();
    
    // Add loaded logs to queue
    logs.forEach(log => {
      this.queue.push(log);
    });
    
    if (logs.length > 0) {
      console.info(`Loaded ${logs.length} logs from local storage`);
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
   * Add log entry to queue
   */
  async log(level, message, extra = {}) {
    const logEntry = {
      source: 'frontend',
      level,
      message: String(message),
      logger_name: extra.logger_name || 'frontend',
      module: extra.module,
      function: extra.function,
      line_number: extra.line_number,
      trace_id: extra.trace_id || this.traceId,
      user_id: getCurrentUserId(),
      ip_address: null, // Will be set by backend
      user_agent: navigator.userAgent,
      request_method: extra.request_method,
      request_path: extra.request_path || window.location.pathname,
      request_data: sanitizeData(extra.request_data),
      response_status: extra.response_status,
      duration_ms: extra.duration_ms,
      extra_data: {
        ...getClientInfo(),
        ...extra.extra_data,
      },
    };

    // Add to queue
    this.queue.push(logEntry);

    // Save to local storage immediately (for persistence)
    this.saveQueueToStorage();

    // Flush if queue is too large
    if (this.queue.length >= this.maxQueueSize) {
      await this.flush();
    }

    // Also log to console in development
    if (import.meta.env.DEV) {
      const consoleMethod = level === 'ERROR' || level === 'CRITICAL' ? 'error' :
                           level === 'WARNING' ? 'warn' :
                           level === 'DEBUG' ? 'debug' : 'log';
      console[consoleMethod](`[${level}]`, message, extra);
    }
  }

  /**
   * Flush queued logs to backend
   */
  async flush() {
    if (this.queue.length === 0) {
      return;
    }

    const logsToSend = [...this.queue];
    const successfullySent = [];

    try {
      // Send logs individually
      for (const log of logsToSend) {
        try {
          await apiClient.post(`${API_PREFIX}/frontend/logs`, log);
          successfullySent.push(log);
        } catch (e) {
          // If sending fails, keep in queue (but limit retries)
          if (!log._retry_count || log._retry_count < 3) {
            log._retry_count = (log._retry_count || 0) + 1;
            // Keep in queue
          } else {
            // Too many retries, remove from queue
            console.warn('Log failed to send after multiple retries, removing from queue:', log);
          }
        }
      }
      
      // Remove successfully sent items from queue
      this.queue = this.queue.filter(item => !successfullySent.includes(item));
      
      // Update local storage
      this.saveQueueToStorage();
    } catch (e) {
      // If all fails, keep everything in queue
      console.error('Failed to flush logs to backend:', e);
      this.saveQueueToStorage();
    }
  }

  /**
   * Convenience methods
   */
  debug(message, extra = {}) {
    return this.log(LOG_LEVELS.DEBUG, message, extra);
  }

  info(message, extra = {}) {
    return this.log(LOG_LEVELS.INFO, message, extra);
  }

  warn(message, extra = {}) {
    return this.log(LOG_LEVELS.WARNING, message, extra);
  }

  error(message, extra = {}) {
    return this.log(LOG_LEVELS.ERROR, message, extra);
  }

  critical(message, extra = {}) {
    return this.log(LOG_LEVELS.CRITICAL, message, extra);
  }
}

// Create singleton instance
const loggerService = new LoggerService();

export default loggerService;

