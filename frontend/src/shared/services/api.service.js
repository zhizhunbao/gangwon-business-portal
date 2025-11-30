/**
 * API Service - HTTP Client
 */

import axios from 'axios';
import { API_BASE_URL, API_PREFIX, ACCESS_TOKEN_KEY, HTTP_STATUS } from '@shared/utils/constants';
import { getStorage, setStorage, removeStorage } from '@shared/utils/storage';
import loggerService from './logger.service';
import exceptionService from './exception.service';

/**
 * Sanitize request data for logging (remove sensitive info, limit size)
 */
function sanitizeRequestData(data) {
  if (!data) return null;
  
  try {
    // If FormData, don't log the content
    if (data instanceof FormData) {
      return { _type: 'FormData', _size: 'hidden' };
    }
    
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
    if (jsonStr.length > 500) {
      return { ...sanitized, _truncated: true, _original_size: jsonStr.length };
    }
    
    return sanitized;
  } catch (e) {
    return { _error: 'Failed to sanitize data' };
  }
}

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add access token to headers
    const token = getStorage(ACCESS_TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add language header
    const language = getStorage('language') || 'ko';
    config.headers['Accept-Language'] = language;
    
    // If data is FormData, let axios handle Content-Type automatically
    // Don't override Content-Type for FormData to allow proper boundary setting
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    // Record request start time for duration calculation
    config._startTime = Date.now();
    
    // Don't log requests separately - we'll log the complete request/response in the response interceptor
    // This reduces duplicate logs and provides better context
    
    return config;
  },
  (error) => {
    // Log request error
    loggerService.error('API Request Error', {
      request_method: error.config?.method,
      request_path: error.config?.url,
      error: error.message,
    });
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    // Calculate duration
    const duration = response.config._startTime ? Date.now() - response.config._startTime : null;
    
    // Log complete request/response (skip logging endpoint to avoid recursion)
    if (!response.config.url?.includes('/logging/') && !response.config.url?.includes('/exceptions/')) {
      const level = response.status >= 400 ? 'WARNING' : 'INFO';
      // Log complete API call with both request and response info
      loggerService.log(level, `API: ${response.config.method?.toUpperCase()} ${response.config.url} -> ${response.status}`, {
        request_method: response.config.method,
        request_path: response.config.url,
        request_data: sanitizeRequestData(response.config.data),
        response_status: response.status,
        duration_ms: duration,
        force_dedup: true, // Force deduplication for API logs
      });
    }
    
    // For blob responses, return the response object directly
    if (response.config.responseType === 'blob') {
      return response;
    }
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;
    const duration = originalRequest?._startTime ? Date.now() - originalRequest._startTime : null;
    
    // Handle 401 Unauthorized
    if (error.response?.status === HTTP_STATUS.UNAUTHORIZED && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Try to refresh token
      try {
        const refreshToken = getStorage('refresh_token');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}${API_PREFIX}/auth/refresh`, {
            refresh_token: refreshToken
          });
          
          const { access_token } = response.data;
          setStorage(ACCESS_TOKEN_KEY, access_token);
          
          // Retry original request
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh token failed
        removeStorage(ACCESS_TOKEN_KEY);
        removeStorage('refresh_token');
        removeStorage('user_info');
        
        // Log refresh error
        exceptionService.recordException(refreshError, {
          request_method: 'POST',
          request_path: `${API_PREFIX}/auth/refresh`,
          error_code: 'TOKEN_REFRESH_FAILED',
          status_code: refreshError.response?.status,
        });
        
        // Only redirect to login if not on a public page
        // Public pages: /member (home), /member/about, /login, /register
        const currentPath = window.location.pathname;
        const isPublicPage = 
          currentPath === '/member' || 
          currentPath === '/member/about' ||
          currentPath === '/login' ||
          currentPath === '/register' ||
          currentPath.startsWith('/login') ||
          currentPath.startsWith('/register');
        
        if (!isPublicPage) {
          window.location.href = '/login';
        }
        
        return Promise.reject(refreshError);
      }
    }
    
    // Log API errors (skip logging endpoint to avoid recursion)
    if (!originalRequest?.url?.includes('/logging/') && !originalRequest?.url?.includes('/exceptions/')) {
      const errorMessage = error.response?.data?.message || error.message || 'An error occurred';
      const errorCode = error.response?.data?.code || 'API_ERROR';
      
      // Record as exception for 5xx errors, as warning for 4xx errors
      if (error.response?.status >= 500) {
        exceptionService.recordException(
          new Error(errorMessage),
          {
            request_method: originalRequest?.method,
            request_path: originalRequest?.url,
            request_data: originalRequest?.data,
            error_code: errorCode,
            status_code: error.response?.status,
            duration_ms: duration,
          }
        );
      } else {
        loggerService.warn(`API Error: ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url} -> ${error.response?.status}`, {
          request_method: originalRequest?.method,
          request_path: originalRequest?.url,
          request_data: originalRequest?.data,
          response_status: error.response?.status,
          error_code: errorCode,
          error_message: errorMessage,
          duration_ms: duration,
        });
      }
    }
    
    // Handle other errors
    const errorData = {
      message: error.response?.data?.message || error.message || 'An error occurred',
      status: error.response?.status,
      code: error.response?.data?.code,
      details: error.response?.data?.details
    };
    
    return Promise.reject(errorData);
  }
);

/**
 * API Service
 */
class ApiService {
  /**
   * GET request
   */
  async get(url, params = {}, config = {}) {
    return apiClient.get(url, { params, ...config });
  }
  
  /**
   * POST request
   */
  async post(url, data = {}, config = {}) {
    return apiClient.post(url, data, config);
  }
  
  /**
   * PUT request
   */
  async put(url, data = {}, config = {}) {
    return apiClient.put(url, data, config);
  }
  
  /**
   * PATCH request
   */
  async patch(url, data = {}, config = {}) {
    return apiClient.patch(url, data, config);
  }
  
  /**
   * DELETE request
   */
  async delete(url, config = {}) {
    return apiClient.delete(url, config);
  }
  
  /**
   * Upload file
   */
  async upload(url, file, onUploadProgress) {
    const formData = new FormData();
    formData.append('file', file);
    
    return apiClient.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress
    });
  }
  
  /**
   * Upload multiple files
   */
  async uploadMultiple(url, files, onUploadProgress) {
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append(`files[${index}]`, file);
    });
    
    return apiClient.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress
    });
  }
  
  /**
   * Download file
   * @param {string} url - Download URL
   * @param {Object} params - Query parameters
   * @param {string} [filename] - Optional filename (if not provided, will use Content-Disposition header)
   */
  async download(url, params = {}, filename = null) {
    const response = await apiClient.get(url, {
      params,
      responseType: 'blob'
    });
    
    // Get filename from Content-Disposition header if not provided
    let downloadFilename = filename;
    if (!downloadFilename && response.headers) {
      const contentDisposition = response.headers['content-disposition'] || response.headers['Content-Disposition'];
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          downloadFilename = filenameMatch[1].replace(/['"]/g, '');
        }
      }
    }
    
    // If still no filename, generate one
    if (!downloadFilename) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      downloadFilename = `download-${timestamp}`;
    }
    
    const blob = new Blob([response.data]);
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = downloadFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(link.href);
    
    return response;
  }
}

export default new ApiService();
export { apiClient };

