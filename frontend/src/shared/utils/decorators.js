/**
 * Auto-logging wrapper for service methods
 * 
 * Automatically logs method calls, extracts resource IDs and result counts,
 * and handles exceptions.
 * 
 * @example
 * // Option 1: Use as wrapper function
 * const wrappedMethod = autoLog('create_member', { logResourceId: true })(originalMethod);
 * 
 * // Option 2: Use in class (if decorators are supported)
 * @autoLog('create_member', { logResourceId: true })
 * async createMember(data) {
 *   return await apiService.post('/api/v1/members', data);
 * }
 */

import loggerService from '@shared/services/logger.service';
import exceptionService from '@shared/services/exception.service';

/**
 * Extract resource ID from response data
 * Tries common ID field names: id, member_id, user_id, project_id, etc.
 */
function extractResourceId(result) {
  if (!result || typeof result !== 'object') return null;
  
  // Common ID field names (in order of preference)
  const idFields = ['id', 'member_id', 'user_id', 'project_id', 'content_id', 
                    'performance_id', 'support_id', 'admin_id', 'news_id', 
                    'notice_id', 'banner_id'];
  
  for (const field of idFields) {
    if (result[field] !== undefined && result[field] !== null) {
      return result[field];
    }
  }
  
  // Check nested objects (e.g., response.user.id)
  if (result.user?.id) return result.user.id;
  if (result.data?.id) return result.data.id;
  
  return null;
}

/**
 * Extract result count from response data
 * Tries common count field names: total, count, items.length, data.length, etc.
 */
function extractResultCount(result) {
  if (!result) return null;
  
  // Direct count fields
  if (typeof result.total === 'number') return result.total;
  if (typeof result.count === 'number') return result.count;
  if (typeof result.total_count === 'number') return result.total_count;
  
  // Array lengths
  if (Array.isArray(result)) return result.length;
  if (Array.isArray(result.items)) return result.items.length;
  if (Array.isArray(result.data)) return result.data.length;
  if (Array.isArray(result.results)) return result.results.length;
  
  // Nested arrays
  if (result.data?.items && Array.isArray(result.data.items)) {
    return result.data.items.length;
  }
  
  return null;
}

/**
 * Extract request path from function arguments or method name
 */
function extractRequestPath(serviceName, methodName, args) {
  // Try to extract from first argument if it's a URL string
  if (args && args.length > 0 && typeof args[0] === 'string' && args[0].startsWith('/')) {
    return args[0];
  }
  
  // Try to extract from second argument if first is params
  if (args && args.length > 1 && typeof args[1] === 'string' && args[1].startsWith('/')) {
    return args[1];
  }
  
  // Fallback: construct from service and method name
  const servicePath = serviceName.replace('Service', '').toLowerCase();
  const methodPath = methodName.replace(/([A-Z])/g, '/$1').toLowerCase().replace(/^\//, '');
  return `/api/v1/${servicePath}/${methodPath}`;
}

/**
 * Get HTTP method from function name
 */
function inferHttpMethod(methodName) {
  const name = methodName.toLowerCase();
  if (name.startsWith('create') || name.startsWith('add') || name.startsWith('register') || name.startsWith('login')) {
    return 'POST';
  }
  if (name.startsWith('update') || name.startsWith('edit') || name.startsWith('change') || name.startsWith('modify')) {
    return 'PUT';
  }
  if (name.startsWith('delete') || name.startsWith('remove')) {
    return 'DELETE';
  }
  if (name.startsWith('get') || name.startsWith('list') || name.startsWith('fetch') || name.startsWith('load')) {
    return 'GET';
  }
  return 'POST'; // Default
}

/**
 * Auto-logging wrapper factory
 * 
 * Can be used as:
 * 1. Decorator (if supported): @autoLog('operation', options)
 * 2. Function wrapper: autoLog('operation', options)(method)
 * 
 * @param {string} operationName - Operation name for logging (e.g., 'create_member')
 * @param {Object} options - Wrapper options
 * @param {string} options.successMessage - Custom success message
 * @param {string} options.errorMessage - Custom error message
 * @param {boolean} options.logResourceId - Whether to log resource ID (default: true)
 * @param {boolean} options.logResultCount - Whether to log result count (default: false)
 * @param {string} options.logLevel - Log level for success (default: 'INFO')
 * @param {boolean} options.skipException - Whether to skip exception recording (default: false)
 * @param {string} options.serviceName - Service name (auto-detected if used as decorator)
 * @param {string} options.methodName - Method name (auto-detected if used as decorator)
 * @returns {Function} Wrapper function or decorator
 */
export function autoLog(operationName, options = {}) {
  const {
    successMessage,
    errorMessage,
    logResourceId = true,
    logResultCount = false,
    logLevel = 'INFO',
    skipException = false,
    serviceName: providedServiceName,
    methodName: providedMethodName,
  } = options;

  // Wrapper function that can be used as decorator or function wrapper
  function wrapper(target, propertyKey, descriptor) {
    // If used as decorator (target is class prototype, propertyKey is method name)
    if (descriptor && descriptor.value) {
      const originalMethod = descriptor.value;
      const serviceName = providedServiceName || (target.constructor?.name || 'Service');
      const methodName = providedMethodName || propertyKey;
      
      descriptor.value = createWrappedMethod(originalMethod, serviceName, methodName);
      return descriptor;
    }
    
    // If used as function wrapper (target is the function itself)
    if (typeof target === 'function') {
      const serviceName = providedServiceName || 'Service';
      const methodName = providedMethodName || target.name || 'anonymous';
      return createWrappedMethod(target, serviceName, methodName);
    }
    
    return target;
  }
  
  function createWrappedMethod(originalMethod, serviceName, methodName) {
    return async function(...args) {
      // Extract request path from arguments or infer from method name
      const requestPath = extractRequestPath(serviceName, methodName, args);
      const requestMethod = inferHttpMethod(methodName);
      
      // Log attempt
      const attemptMessage = successMessage || `${operationName} attempt`;
      loggerService.info(attemptMessage, {
        module: serviceName,
        function: methodName,
        request_path: requestPath,
        request_method: requestMethod,
      });

      try {
        // Execute original method
        const result = await originalMethod.apply(this, args);
        
        // Extract resource ID and result count
        const resourceId = logResourceId ? extractResourceId(result) : null;
        const resultCount = logResultCount ? extractResultCount(result) : null;
        
        // Build success log data
        const successLogData = {
          module: serviceName,
          function: methodName,
          request_path: requestPath,
          request_method: requestMethod,
          response_status: 200,
        };
        
        // Add resource ID if available
        if (resourceId !== null) {
          // Use appropriate field name based on service
          if (serviceName.includes('Member') || serviceName.includes('Auth')) {
            successLogData.user_id = resourceId;
          } else if (serviceName.includes('Project')) {
            successLogData.project_id = resourceId;
          } else if (serviceName.includes('Content')) {
            successLogData.content_id = resourceId;
          } else if (serviceName.includes('Performance')) {
            successLogData.performance_id = resourceId;
          } else if (serviceName.includes('Support')) {
            successLogData.support_id = resourceId;
          } else {
            successLogData.resource_id = resourceId;
          }
        }
        
        // Add result count if available
        if (resultCount !== null) {
          successLogData.result_count = resultCount;
        }
        
        // Log success
        const successMsg = successMessage || `${operationName} successful`;
        loggerService.log(logLevel, successMsg, successLogData);
        
        return result;
      } catch (error) {
        // Build error log data
        const errorLogData = {
          module: serviceName,
          function: methodName,
          request_path: requestPath,
          request_method: requestMethod,
          error_message: error.message,
          error_code: error.code || `${operationName.toUpperCase()}_FAILED`,
        };
        
        // Log error
        const errorMsg = errorMessage || `${operationName} failed`;
        loggerService.error(errorMsg, errorLogData);
        
        // Record exception if not skipped
        if (!skipException) {
          exceptionService.recordException(error, {
            request_method: requestMethod,
            request_path: requestPath,
            error_code: error.code || `${operationName.toUpperCase()}_FAILED`,
          });
        }
        
        throw error;
      }
    };
  }
  
  return wrapper;
}

export default { autoLog };

