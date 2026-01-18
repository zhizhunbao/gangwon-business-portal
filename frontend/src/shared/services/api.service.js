// API Service - HTTP 请求封装

import axios from "axios";
import {
  API_BASE_URL,
  API_PREFIX,
  ACCESS_TOKEN_KEY,
  HTTP_STATUS,
  ERROR_CODE_I18N_MAP,
} from "@shared/utils/constants";
import {
  getStorage,
  setStorage,
  removeStorage,
  removeSessionStorage,
  toCamelCase,
  toSnakeCase,
} from "@shared/utils/helpers";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { "Content-Type": "application/json", Accept: "application/json" },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = getStorage(ACCESS_TOKEN_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;

    const language = getStorage("language") || "ko";
    config.headers["Accept-Language"] = language;

    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    } else if (config.data && typeof config.data === 'object') {
      // 自动将请求数据从 camelCase 转换为 snake_case
      config.data = toSnakeCase(config.data);
    }

    // 自动将 URL 参数从 camelCase 转换为 snake_case
    if (config.params && typeof config.params === 'object') {
      config.params = toSnakeCase(config.params);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => {
    if (response.config.responseType === "blob") return response;
    
    // 自动将响应数据从 snake_case 转换为 camelCase
    if (response.data && typeof response.data === 'object') {
      return toCamelCase(response.data);
    }
    
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;
    const requestUrl = originalRequest?.url || "";
    const isLoginRequest = requestUrl.includes("/auth/login");

    if (
      error.response?.status === HTTP_STATUS.UNAUTHORIZED &&
      !originalRequest._retry &&
      !isLoginRequest
    ) {
      originalRequest._retry = true;

      try {
        const refreshToken = getStorage("refresh_token");
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}${API_PREFIX}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          const { access_token } = response.data;
          setStorage(ACCESS_TOKEN_KEY, access_token);
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        clearAuthState();
        redirectToLogin();
        return Promise.reject(refreshError);
      }

      clearAuthState();
    }

    const errorMessage =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      "An error occurred";

    return Promise.reject({
      message: errorMessage,
      status: error.response?.status,
      code: error.response?.data?.error?.code || error.response?.data?.error_code || error.response?.data?.code || error.code,
      i18nKey: ERROR_CODE_I18N_MAP[error.response?.data?.error?.code],
      response: error.response,
      details: error.response?.data?.details,
    });
  }
);

function clearAuthState() {
  [ACCESS_TOKEN_KEY, "refresh_token", "user_info", "token_expiry"].forEach((k) => {
    removeStorage(k);
    removeSessionStorage(k);
  });
}

function redirectToLogin() {
  const currentPath = window.location.pathname;
  const isPublicPage =
    currentPath === "/member" ||
    currentPath === "/member/home" ||
    currentPath === "/member/about" ||
    currentPath.startsWith("/login") ||
    currentPath.startsWith("/register");

  if (!isPublicPage) {
    window.location.href = "/member/home";
  }
}

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
    formData.append("file", file);
    return apiClient.post(url, formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress,
    });
  }

  async uploadMultiple(url, files, onUploadProgress) {
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append(`files[${index}]`, file);
    });
    return apiClient.post(url, formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress,
    });
  }

  async download(url, params = {}, filename = null) {
    const response = await apiClient.get(url, { params, responseType: "blob" });

    let downloadFilename = filename;
    if (!downloadFilename && response.headers) {
      const contentDisposition = response.headers["content-disposition"] || response.headers["Content-Disposition"];
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          downloadFilename = filenameMatch[1].replace(/['"]/g, "");
        }
      }
    }

    if (!downloadFilename) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      downloadFilename = `download-${timestamp}`;
    }

    const blob = new Blob([response.data]);
    const link = document.createElement("a");
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
