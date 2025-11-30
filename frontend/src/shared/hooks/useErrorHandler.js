/**
 * useErrorHandler Hook
 * 
 * Custom hook for consistent error handling across components.
 * Automatically logs errors to logger and exception services.
 */

import { useCallback } from 'react';
import loggerService from '@shared/services/logger.service';
import exceptionService from '@shared/services/exception.service';

/**
 * Custom hook for handling errors consistently
 * 
 * @returns {Function} handleError - Function to handle errors
 */
export function useErrorHandler() {
  const handleError = useCallback((error, context = {}) => {
    // Determine if this is a critical error that should be recorded as exception
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
    
    // Also log to console in development for debugging
    if (import.meta.env.DEV) {
      const logMethod = isCritical ? 'error' : 'warn';
      console[logMethod](`[ErrorHandler] ${errorMessage}`, {
        error,
        context,
      });
    }
    
    return errorMessage;
  }, []);
  
  return handleError;
}

/**
 * Higher-order function to wrap async operations with error handling
 * 
 * @param {Function} asyncFn - Async function to wrap
 * @param {Function} onError - Optional error handler callback
 * @param {Object} context - Optional context for error logging
 * @returns {Function} Wrapped function
 */
export function withErrorHandler(asyncFn, onError, context = {}) {
  return async (...args) => {
    try {
      return await asyncFn(...args);
    } catch (error) {
      // Call the error handler if provided
      if (onError) {
        return onError(error, context);
      }
      throw error; // Re-throw if no handler
    }
  };
}

