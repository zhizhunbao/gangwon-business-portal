/**
 * API Service - HTTP Client
 */

import axios from 'axios';
import { API_BASE_URL, API_PREFIX, ACCESS_TOKEN_KEY, HTTP_STATUS } from '@shared/utils/constants';
import { getStorage, setStorage, removeStorage } from '@shared/utils/storage';

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
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;
    
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
   */
  async download(url, filename) {
    const response = await apiClient.get(url, {
      responseType: 'blob'
    });
    
    const blob = new Blob([response]);
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(link.href);
  }
}

export default new ApiService();
export { apiClient };

