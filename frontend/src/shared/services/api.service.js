import axios from "axios";
import {
  API_BASE_URL,
  API_PREFIX,
  ACCESS_TOKEN_KEY,
  HTTP_STATUS,
} from "@shared/utils/constants";
import { getStorage, setStorage, removeStorage } from "@shared/utils/storage";
import { loggerService } from "@shared/utils/loggerHandler";
import { handleError } from "@shared/utils/errorHandler";

function sanitizeRequestData(data) {
  if (!data) return null;
  try {
    if (data instanceof FormData) {
      return { _type: "FormData", _size: "hidden" };
    }
    let parsedData = data;
    if (typeof data === "string") {
      try {
        parsedData = JSON.parse(data);
      } catch (e) {
        return {
          _type: "string",
          _length: data.length,
          _preview: data.substring(0, 100),
        };
      }
    }
    if (
      typeof parsedData !== "object" ||
      parsedData === null ||
      Array.isArray(parsedData)
    ) {
      const str = String(parsedData);
      if (str.length > 500) {
        return {
          _type: typeof parsedData,
          _truncated: true,
          _preview: str.substring(0, 100),
        };
      }
      return parsedData;
    }
    const sanitized = { ...parsedData };
    const sensitiveFields = [
      "password",
      "password_hash",
      "token",
      "access_token",
      "refresh_token",
      "secret",
      "api_key",
    ];
    sensitiveFields.forEach((field) => {
      if (sanitized[field]) sanitized[field] = "***REDACTED***";
    });
    const jsonStr = JSON.stringify(sanitized);
    if (jsonStr.length > 500) {
      return { ...sanitized, _truncated: true, _original_size: jsonStr.length };
    }
    return sanitized;
  } catch (e) {
    return { _error: "Failed to sanitize data" };
  }
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { "Content-Type": "application/json", Accept: "application/json" },
});

apiClient.interceptors.request.use(
  (config) => {
    // Prevent infinite loop: Don't log the logging requests themselves
    if (config.url?.includes("/logging/") || config.url?.includes("/logs")) {
      return config;
    }

    const token = getStorage(ACCESS_TOKEN_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
    const language = getStorage("language") || "ko";
    config.headers["Accept-Language"] = language;
    // Pass frontend-generated trace_id to backend via X-Trace-Id header for request correlation
    if (loggerService.traceId) {
      config.headers["X-Trace-Id"] = loggerService.traceId;
    }
    if (config.data instanceof FormData) delete config.headers["Content-Type"];

    // Start timing for duration tracking
    config._startTime = performance.now();

    // Log Request Start
    try {
      loggerService.debug(
        `API Request: ${config.method?.toUpperCase()} ${config.url}`,
        {
          module: "API",
          request_method: config.method?.toUpperCase(),
          request_url: config.url,
        }
      );
    } catch (e) {
      // Ignore logging errors during request setup
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    // Ignore logging requests
    if (
      response.config.url?.includes("/logging/") ||
      response.config.url?.includes("/logs")
    ) {
      return response.data;
    }

    // Calculate Duration
    const startTime = response.config._startTime;
    const duration = startTime ? Math.round(performance.now() - startTime) : 0;

    // Log Success
    try {
      const method = response.config.method?.toUpperCase();
      const url = response.config.url;

      loggerService.info(`API Success: ${method} ${url}`, {
        module: "API",
        request_method: method,
        request_url: url,
        response_status: response.status,
        duration_ms: duration,
      });

      // Performance Warning - 对于某些端点使用更高的阈值（threads 端点通常较慢）
      const slowThreshold = url?.includes('/threads/') ? 3000 : 2000;
      if (duration > slowThreshold) {
        loggerService.warn(`Slow API Warning: ${method} ${url}`, {
          module: "API",
          request_method: method,
          request_url: url,
          duration_ms: duration,
          performance_issue: "SLOW_API",
        });
      }
    } catch (e) {
      // Ignore logging errors
    }

    if (response.config.responseType === "blob") return response;
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;

    // Ignore logging requests failure to prevent loops
    if (
      originalRequest?.url?.includes("/logging/") ||
      originalRequest?.url?.includes("/logs")
    ) {
      return Promise.reject(error);
    }

    const duration = originalRequest?._startTime
      ? Math.round(performance.now() - originalRequest._startTime)
      : 0;

    // Log API Error
    try {
      const method = originalRequest?.method?.toUpperCase();
      const url = originalRequest?.url;
      const status = error.response?.status || 0;

      loggerService.error(`API Failed: ${method} ${url}`, {
        module: "API",
        request_method: method,
        request_url: url,
        response_status: status,
        error_message: error.message,
        duration_ms: duration,
      });
    } catch (e) {
      // Ignore logging errors
    }

    if (
      error.response?.status === HTTP_STATUS.UNAUTHORIZED &&
      !originalRequest._retry
    ) {
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
        removeStorage(ACCESS_TOKEN_KEY);
        removeStorage("refresh_token");
        removeStorage("user_info");
        removeStorage("token_expiry");

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
        if (!isPublicPage) window.location.href = "/login";
        return Promise.reject(refreshError);
      }

      // No refresh token available, clear auth state
      removeStorage(ACCESS_TOKEN_KEY);
      removeStorage("refresh_token");
      removeStorage("user_info");
      removeStorage("token_expiry");

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

    // Use errorHandler to handle the error consistently
    const errorObj = {
      ...error,
      response: {
        ...error.response,
        data: {
          ...error.response?.data,
          message: errorMessage,
        },
      },
    };
    
    handleError(errorObj, {
      request_method: originalRequest?.method?.toUpperCase(),
      request_path: url,
      status_code: error.response?.status,
      error_code: error.response?.data?.code,
    });

    return Promise.reject({
      message: errorMessage,
      status: error.response?.status,
      code: error.response?.data?.code,
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
