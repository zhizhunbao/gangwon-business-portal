import axios from 'axios';
import { API_BASE_URL, API_PREFIX, ACCESS_TOKEN_KEY, HTTP_STATUS } from '@shared/utils/constants';
import { getStorage, setStorage, removeStorage } from '@shared/utils/storage';
import loggerService from './logger.service';

function sanitizeRequestData(data) {
  if (!data) return null;
  try {
    if (data instanceof FormData) {
      return { _type: 'FormData', _size: 'hidden' };
    }
    let parsedData = data;
    if (typeof data === 'string') {
      try {
        parsedData = JSON.parse(data);
      } catch (e) {
        return { _type: 'string', _length: data.length, _preview: data.substring(0, 100) };
      }
    }
    if (typeof parsedData !== 'object' || parsedData === null || Array.isArray(parsedData)) {
      const str = String(parsedData);
      if (str.length > 500) {
        return { _type: typeof parsedData, _truncated: true, _preview: str.substring(0, 100) };
      }
      return parsedData;
    }
    const sanitized = { ...parsedData };
    const sensitiveFields = ['password', 'password_hash', 'token', 'access_token', 'refresh_token', 'secret', 'api_key'];
    sensitiveFields.forEach(field => {
      if (sanitized[field]) sanitized[field] = '***REDACTED***';
    });
    const jsonStr = JSON.stringify(sanitized);
    if (jsonStr.length > 500) {
      return { ...sanitized, _truncated: true, _original_size: jsonStr.length };
    }
    return sanitized;
  } catch (e) {
    return { _error: 'Failed to sanitize data' };
  }
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
});

apiClient.interceptors.request.use(
  (config) => {
    const token = getStorage(ACCESS_TOKEN_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
    const language = getStorage('language') || 'ko';
    config.headers['Accept-Language'] = language;
    // Pass frontend-generated trace_id to backend via X-Trace-Id header for request correlation
    if (loggerService.traceId) {
      config.headers['X-Trace-Id'] = loggerService.traceId;
    }
    if (config.data instanceof FormData) delete config.headers['Content-Type'];
    config._startTime = Date.now();
    return config;
  },
  (error) => {
    // Request configuration error - reject without logging
    // (Service layer decorators will handle logging if needed)
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    // Successful responses are logged by @autoLog decorators in service methods
    // Interceptor only handles data transformation
    if (response.config.responseType === 'blob') return response;
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;
    const duration = originalRequest?._startTime ? Date.now() - originalRequest._startTime : null;
    
    if (error.response?.status === HTTP_STATUS.UNAUTHORIZED && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = getStorage('refresh_token');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}${API_PREFIX}/auth/refresh`, {
            refresh_token: refreshToken
          });
          const { access_token } = response.data;
          setStorage(ACCESS_TOKEN_KEY, access_token);
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        removeStorage(ACCESS_TOKEN_KEY);
        removeStorage('refresh_token');
        removeStorage('user_info');
        // Token refresh error will be caught by global exception handler or decorator
        const currentPath = window.location.pathname;
        const isPublicPage = 
          currentPath === '/member' || 
          currentPath === '/member/about' ||
          currentPath === '/login' ||
          currentPath === '/register' ||
          currentPath.startsWith('/login') ||
          currentPath.startsWith('/register');
        if (!isPublicPage) window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    // Get the full request URL (axios config.url is relative to baseURL)
    const requestUrl = originalRequest?.url || '';
    const errorMessage = error.response?.data?.detail || error.response?.data?.message || error.message || 'An error occurred';
    const errorCode = error.response?.data?.code || 'API_ERROR';
    const status = error.response?.status;
    
    // Error logging and exception recording are handled by:
    // 1. @autoLog decorators in service methods (for business errors)
    // 2. Global exception handlers (for unhandled errors)
    // Interceptor only handles infrastructure concerns (token refresh, data transformation)
    return Promise.reject({
      message: errorMessage,
      status: error.response?.status,
      code: error.response?.data?.code,
      details: error.response?.data?.details
    });
  }
);

class ApiService {
  async get(url, params = {}, config = {}) {
    return apiClient.get(url, { params, ...config });
  }
  
  async post(url, data = {}, config = {}) {
    return apiClient.post(url, data, config);
  }
  
  async put(url, data = {}, config = {}) {
    return apiClient.put(url, data, config);
  }
  
  async patch(url, data = {}, config = {}) {
    return apiClient.patch(url, data, config);
  }
  
  async delete(url, config = {}) {
    return apiClient.delete(url, config);
  }
  
  async upload(url, file, onUploadProgress) {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress
    });
  }
  
  async uploadMultiple(url, files, onUploadProgress) {
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append(`files[${index}]`, file);
    });
    return apiClient.post(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress
    });
  }
  
  async download(url, params = {}, filename = null) {
    const response = await apiClient.get(url, { params, responseType: 'blob' });
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
