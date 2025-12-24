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
} from "@shared/utils/storage";
import { createApiInterceptors } from "@shared/interceptors/api.interceptor";
import { logger } from "@shared/logger";
import { exceptionHandler } from "@shared/exception";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { "Content-Type": "application/json", Accept: "application/json" },
});

// 创建 API 拦截器
const interceptors = createApiInterceptors();

apiClient.interceptors.request.use(
  (config) => {
    // 应用 API 日志拦截器
    config = interceptors.request(config);

    // 添加认证和语言头
    const token = getStorage(ACCESS_TOKEN_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
    const language = getStorage("language") || "ko";
    config.headers["Accept-Language"] = language;

    if (config.data instanceof FormData) delete config.headers["Content-Type"];

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    // 应用 API 日志拦截器
    response = interceptors.response(response);

    if (response.config.responseType === "blob") return response;
    return response.data;
  },
  async (error) => {
    // 应用 API 错误日志拦截器（不等待，只记录日志）
    try {
      interceptors.error(error);
    } catch (e) {
      // 忽略日志错误
    }

    const originalRequest = error.config;

    // AOP 系统会自动记录 API 错误
    try {
      // 保留错误处理逻辑，移除调试日志
    } catch (e) {
      // ignore
    }

    // Skip 401 handling for login requests - let the login component handle the error
    const requestUrl = originalRequest?.url || "";
    const isLoginRequest = requestUrl.includes("/auth/login");

    if (
      error.response?.status === HTTP_STATUS.UNAUTHORIZED &&
      !originalRequest._retry &&
      !isLoginRequest
    ) {
      // AOP 系统会自动记录 401 处理
      originalRequest._retry = true;
      try {
        const refreshToken = getStorage("refresh_token");
        if (refreshToken) {
          const response = await axios.post(
            `${API_BASE_URL}${API_PREFIX}/auth/refresh`,
            {
              refresh_token: refreshToken,
            }
          );
          const { access_token } = response.data;
          setStorage(ACCESS_TOKEN_KEY, access_token);
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Clear storage and auth store state
        [
          ACCESS_TOKEN_KEY,
          "refresh_token",
          "user_info",
          "token_expiry",
        ].forEach((k) => {
          removeStorage(k);
          removeSessionStorage(k);
        });

        // Update Zustand store state (import dynamically to avoid circular dependency)
        try {
          const { useAuthStore } = await import("@shared/stores/authStore");
          useAuthStore.getState().clearAuth();
        } catch (e) {
          // Ignore if store not available
        }

        const currentPath = window.location.pathname;
        const isPublicPage =
          currentPath === "/member" ||
          currentPath === "/member/home" ||
          currentPath === "/member/about" ||
          currentPath === "/login" ||
          currentPath === "/register" ||
          currentPath.startsWith("/login") ||
          currentPath.startsWith("/register");
        if (!isPublicPage) window.location.href = "/member/home";
        return Promise.reject(refreshError);
      }

      // No refresh token available, clear auth state
      [ACCESS_TOKEN_KEY, "refresh_token", "user_info", "token_expiry"].forEach(
        (k) => {
          removeStorage(k);
          removeSessionStorage(k);
        }
      );

      // Update Zustand store state
      try {
        const { useAuthStore } = await import("@shared/stores/authStore");
        useAuthStore.getState().clearAuth();
      } catch (e) {
        // Ignore if store not available
      }
    }

    // Get the full request URL (axios config.url is relative to baseURL)
    const url = originalRequest?.url || "";
    const errorMessage =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      "An error occurred";

    // Skip global error handling for login requests - let the login component handle it
    if (!isLoginRequest) {
      // Use exception handler to handle the error consistently
      exceptionHandler.handleError(error, {
        request_method: error.config?.method?.toUpperCase(),
        request_path: error.config?.url,
        status_code: error.response?.status,
        context_data: { isLoginRequest },
      });
    }

    return Promise.reject({
      message: errorMessage,
      status: error.response?.status,
      code:
        error.response?.data?.error?.code ||
        error.response?.data?.error_code ||
        error.response?.data?.code ||
        error.code,
      // 添加 i18n key 映射
      i18nKey: ERROR_CODE_I18N_MAP[error.response?.data?.error?.code],
      response: error.response,
      details: error.response?.data?.details,
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
      const contentDisposition =
        response.headers["content-disposition"] ||
        response.headers["Content-Disposition"];
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(
          /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/
        );
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
