import { apiClient } from './api.service';
import { getStorage } from '@shared/utils/storage';

const API_PREFIX = '/api/v1/logging';

export const LOG_LEVELS = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  CRITICAL: 'CRITICAL',
};

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

class LoggerService {
  constructor() {
    this.traceId = generateTraceId();
    this.recentLogs = new Map();
    this.dedupWindow = 10000;
    setInterval(() => this.cleanupRecentLogs(), 30000);
  }
  
  generateLogKey(message, extra = {}) {
    const requestPath = extra.request_path || '';
    const requestMethod = extra.request_method || '';
    const level = extra.level || '';
    const responseStatus = extra.response_status || '';
    return `${level}-${requestMethod}-${requestPath}-${responseStatus}-${message}`;
  }
  
  cleanupRecentLogs() {
    const now = Date.now();
    for (const [key, timestamp] of this.recentLogs.entries()) {
      if (now - timestamp > this.dedupWindow) {
        this.recentLogs.delete(key);
      }
    }
  }

  async log(level, message, extra = {}) {
    const logKey = this.generateLogKey(message, { ...extra, level });
    const shouldDedup = level !== 'DEBUG' || extra.force_dedup;
    
    if (shouldDedup) {
      const now = Date.now();
      const lastTimestamp = this.recentLogs.get(logKey);
      if (lastTimestamp && (now - lastTimestamp) < this.dedupWindow) {
        // Don't log duplicate skipped messages to console - too noisy
        // They're still deduplicated and sent to backend
        return;
      }
      this.recentLogs.set(logKey, now);
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
      ip_address: null,
      user_agent: navigator.userAgent,
      request_method: extra.request_method,
      request_path: extra.request_path || window.location.pathname,
      request_data: sanitizeData(extra.request_data),
      response_status: extra.response_status,
      duration_ms: extra.duration_ms,
      extra_data: { ...getClientInfo(), ...extra.extra_data },
    };

    apiClient.post(`${API_PREFIX}/frontend/logs`, logEntry).catch((error) => {
      if (import.meta.env.DEV) {
        console.warn(`[Logger] Failed to send log:`, error.message);
      }
    });

    // Only log to console in development, and only for important levels
    // INFO logs are too verbose for console - they're still sent to backend
    if (import.meta.env.DEV) {
      // Only show WARNING, ERROR, CRITICAL in console to reduce noise
      // INFO and DEBUG are still sent to backend but not shown in console
      if (level === 'ERROR' || level === 'CRITICAL' || level === 'WARNING') {
        const consoleMethod = level === 'ERROR' || level === 'CRITICAL' ? 'error' : 'warn';
        console[consoleMethod](`[${level}]`, message, extra);
      }
      // Optionally show DEBUG in console if needed (uncomment to enable)
      // else if (level === 'DEBUG') {
      //   console.debug(`[${level}]`, message, extra);
      // }
    }
  }

  debug(message, extra = {}) { return this.log(LOG_LEVELS.DEBUG, message, extra); }
  info(message, extra = {}) { return this.log(LOG_LEVELS.INFO, message, extra); }
  warn(message, extra = {}) { return this.log(LOG_LEVELS.WARNING, message, extra); }
  error(message, extra = {}) { return this.log(LOG_LEVELS.ERROR, message, extra); }
  critical(message, extra = {}) { return this.log(LOG_LEVELS.CRITICAL, message, extra); }
}

const loggerService = new LoggerService();

/**
 * Auto-logging decorator for service methods
 * @param {string} operationName - Name of the operation being logged
 * @param {Object} options - Logging options
 * @param {boolean} options.logResultCount - Whether to log result count
 * @param {string} options.serviceName - Name of the service
 * @param {string} options.methodName - Name of the method
 * @returns {Function} Decorator function
 */
export function autoLog(operationName, options = {}) {
  return function(targetFunction) {
    return async function(...args) {
      const startTime = Date.now();
      const { serviceName, methodName, logResultCount } = options;
      
      try {
        // Log start of operation
        loggerService.debug(`Starting ${operationName}`, {
          module: serviceName,
          function: methodName,
          operation: operationName,
          args: args.length > 0 ? 'provided' : 'none'
        });
        
        const result = await targetFunction.apply(this, args);
        const duration = Date.now() - startTime;
        
        // Log successful completion
        const logData = {
          module: serviceName,
          function: methodName,
          operation: operationName,
          duration_ms: duration,
          status: 'success'
        };
        
        if (logResultCount && result) {
          if (Array.isArray(result)) {
            logData.result_count = result.length;
          } else if (result.items && Array.isArray(result.items)) {
            logData.result_count = result.items.length;
          } else if (result.total !== undefined) {
            logData.result_count = result.total;
          }
        }
        
        loggerService.info(`Completed ${operationName}`, logData);
        
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        // Log error
        loggerService.error(`Failed ${operationName}`, {
          module: serviceName,
          function: methodName,
          operation: operationName,
          duration_ms: duration,
          status: 'error',
          error_message: error.message,
          error_type: error.constructor.name
        });
        
        throw error;
      }
    };
  };
}

export default loggerService;
