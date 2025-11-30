/**
 * Error Handler Utility
 * 
 * Utility functions for consistent error handling across the application.
 */

import loggerService from '@shared/services/logger.service';
import exceptionService from '@shared/services/exception.service';

/**
 * Handle and log an error consistently
 * 
 * @param {Error|Object} error - The error to handle
 * @param {Object} context - Additional context information
 * @param {boolean} context.critical - Whether this is a critical error (defaults to true for 5xx)
 * @param {string} context.error_code - Custom error code
 * @param {string} context.request_method - HTTP method
 * @param {string} context.request_path - Request path
 * @param {number} context.status_code - HTTP status code
 * @param {Object} context.context_data - Additional context data
 * @returns {string} Error message
 */
export function handleError(error, context = {}) {
  // Determine if this is a critical error
  const isCritical = error?.response?.status >= 500 || 
                     error?.code === 'NETWORK_ERROR' ||
                     context.critical === true;
  
  // Extract error information
  const errorMessage = error?.response?.data?.message || 
                      error?.message || 
                      String(error) || 
                      'An unknown error occurred';
  const errorCode = error?.response?.data?.code || 
                   error?.code || 
                   context.error_code || 
                   'UNKNOWN_ERROR';
  const statusCode = error?.response?.status || context.status_code;
  
  // Record as exception for critical errors
  if (isCritical) {
    exceptionService.recordException(
      error instanceof Error ? error : new Error(errorMessage),
      {
        request_method: context.request_method,
        request_path: context.request_path || window.location.pathname,
        error_code: errorCode,
        status_code: statusCode,
        context_data: context.context_data || {},
      }
    );
  } else {
    // Log as warning for non-critical errors
    loggerService.warn(errorMessage, {
      request_method: context.request_method,
      request_path: context.request_path || window.location.pathname,
      error_code: errorCode,
      status_code: statusCode,
      error_message: errorMessage,
      context_data: context.context_data || {},
    });
  }
  
  // Also log to console in development
  if (import.meta.env.DEV) {
    const logMethod = isCritical ? 'error' : 'warn';
    console[logMethod](`[ErrorHandler] ${errorMessage}`, {
      error,
      context,
    });
  }
  
  return errorMessage;
}

/**
 * Wrap an async function with error handling
 * 
 * @param {Function} asyncFn - Async function to wrap
 * @param {Object} context - Context for error logging
 * @returns {Function} Wrapped function
 */
export function withErrorHandling(asyncFn, context = {}) {
  return async (...args) => {
    try {
      return await asyncFn(...args);
    } catch (error) {
      handleError(error, context);
      throw error; // Re-throw after logging
    }
  };
}

