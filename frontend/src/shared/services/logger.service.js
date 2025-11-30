/**
 * Logger Service
 * 
 * Service for recording application logs to the backend.
 * This service captures frontend logs and sends them directly to the backend
 * for centralized logging and debugging. If direct send fails, logs are queued
 * as a fallback mechanism and retried periodically.
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
    this.queue = []; // Only used as fallback when direct send fails
    this.flushInterval = null;
    this.maxQueueSize = 50;
    this.flushDelay = 10000; // 10 seconds - only flush queued logs (fallback)
    this.traceId = generateTraceId();
    // Deduplication: track recent logs to prevent duplicates
    this.recentLogs = new Map(); // key: logKey, value: timestamp
    this.dedupWindow = 3000; // 3 seconds window for deduplication
    
    // Load pending logs from local storage on startup (in case of previous failures)
    this.loadPendingLogs();
    
    // Start periodic flush for queued logs only (fallback mechanism)
    this.startFlushInterval();
    
    // Flush on page unload (for any queued logs from failed direct sends)
    window.addEventListener('beforeunload', () => {
      this.saveQueueToStorage();
      // Try to flush queued logs, but don't wait (page might close)
      if (this.queue.length > 0) {
        this.flush().catch(() => {});
      }
    });
    
    // Save queue to storage periodically (only for fallback queue)
    this.saveInterval = setInterval(() => {
      if (this.queue.length > 0) {
        this.saveQueueToStorage();
      }
    }, 5000); // Save every 5 seconds (less frequent since most logs are sent directly)
    
    // Clean up old deduplication entries periodically
    this.cleanupInterval = setInterval(() => {
      this.cleanupRecentLogs();
    }, 10000); // Clean up every 10 seconds
  }
  
  /**
   * Generate a unique key for log deduplication
   */
  generateLogKey(message, extra = {}) {
    // Use trace_id, message, and request_path to create unique key
    const traceId = extra.trace_id || this.traceId;
    const requestPath = extra.request_path || '';
    const level = extra.level || '';
    return `${traceId}-${level}-${message}-${requestPath}`;
  }
  
  /**
   * Check if a log is duplicate within the deduplication window
   */
  isDuplicate(logKey) {
    const now = Date.now();
    const lastTimestamp = this.recentLogs.get(logKey);
    
    if (lastTimestamp && (now - lastTimestamp) < this.dedupWindow) {
      return true;
    }
    
    // Update or add the log key with current timestamp
    this.recentLogs.set(logKey, now);
    return false;
  }
  
  /**
   * Clean up old entries from recentLogs map
   */
  cleanupRecentLogs() {
    const now = Date.now();
    for (const [key, timestamp] of this.recentLogs.entries()) {
      if (now - timestamp > this.dedupWindow) {
        this.recentLogs.delete(key);
      }
    }
  }
  
  /**
   * Load pending logs from local storage
   */
  loadPendingLogs() {
    const logs = loadQueueFromStorage();
    
    if (logs.length === 0) {
      return;
    }
    
    // Apply deduplication to loaded logs
    const uniqueLogs = [];
    const seenKeys = new Set();
    
    logs.forEach(log => {
      // Generate key for deduplication
      const logKey = this.generateLogKey(log.message, {
        trace_id: log.trace_id,
        request_path: log.request_path,
        level: log.level,
      });
      
      // Check if we've seen this log key before (in this batch)
      if (!seenKeys.has(logKey)) {
        seenKeys.add(logKey);
        uniqueLogs.push(log);
      }
    });
    
    // Add unique logs to queue
    uniqueLogs.forEach(log => {
      this.queue.push(log);
    });
    
    if (logs.length > 0) {
      const skippedCount = logs.length - uniqueLogs.length;
      console.info(
        `Loaded ${uniqueLogs.length} logs from local storage` +
        (skippedCount > 0 ? ` (${skippedCount} duplicates skipped)` : '')
      );
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
   * Add log entry and send directly to backend (no queueing)
   * Falls back to queue only if direct send fails
   */
  async log(level, message, extra = {}) {
    // Generate unique key for deduplication
    const logKey = this.generateLogKey(message, { ...extra, level });
    
    // Check for duplicates (skip DEBUG level logs in development to reduce noise)
    // Only deduplicate for INFO and above, or if explicitly requested
    const shouldDedup = level !== 'DEBUG' || extra.force_dedup;
    if (shouldDedup && this.isDuplicate(logKey)) {
      // Skip duplicate log, but still log to console in dev
      if (import.meta.env.DEV) {
        const consoleMethod = level === 'ERROR' || level === 'CRITICAL' ? 'error' :
                             level === 'WARNING' ? 'warn' :
                             level === 'DEBUG' ? 'debug' : 'log';
        console[consoleMethod](`[${level}] [DUPLICATE SKIPPED]`, message);
      }
      return;
    }
    
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

    // Try to send directly to backend (non-blocking fire-and-forget)
    // If it fails, the error handler will add to queue as fallback
    apiClient.post(`${API_PREFIX}/frontend/logs`, logEntry)
      .then(() => {
        // Successfully sent, no need to queue
      })
      .catch((error) => {
        // If direct send fails, add to queue as fallback
        // This handles network errors, backend unavailable, etc.
        this.queue.push(logEntry);
        this.saveQueueToStorage();
        
        // Log to console if in development
        if (import.meta.env.DEV) {
          console.warn(`[Logger] Failed to send log directly, added to queue:`, error.message);
        }
        
        // Trigger flush if queue is getting large
        if (this.queue.length >= this.maxQueueSize) {
          // Don't await to avoid blocking
          this.flush().catch(err => {
            if (import.meta.env.DEV) {
              console.error('[Logger] Flush failed:', err);
            }
          });
        }
      });

    // Also log to console in development
    if (import.meta.env.DEV) {
      const consoleMethod = level === 'ERROR' || level === 'CRITICAL' ? 'error' :
                           level === 'WARNING' ? 'warn' :
                           level === 'DEBUG' ? 'debug' : 'log';
      console[consoleMethod](`[${level}]`, message, extra);
    }
  }

  /**
   * Flush queued logs to backend (fallback mechanism)
   * This is only used for logs that failed to send directly
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
            // Keep in queue for next flush attempt
          } else {
            // Too many retries, remove from queue to prevent memory leak
            if (import.meta.env.DEV) {
              console.warn('Log failed to send after multiple retries, removing from queue:', log);
            }
          }
        }
      }
      
      // Remove successfully sent items from queue
      this.queue = this.queue.filter(item => !successfullySent.includes(item));
      
      // Update local storage only if queue changed
      if (successfullySent.length > 0) {
        this.saveQueueToStorage();
      }
    } catch (e) {
      // If all fails, keep everything in queue
      if (import.meta.env.DEV) {
        console.error('Failed to flush logs to backend:', e);
      }
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

