/**
 * API Error Classifier - API 错误分类器
 *
 * 负责将 API 错误分类为不同类型，便于后续处理和恢复。
 *
 * Requirements: 10.2
 */

/**
 * API 错误分类器
 */
export class ApiErrorClassifier {
  /**
   * 分类 API 错误
   * @param {Error} error - Axios 错误对象
   * @returns {Object} 分类结果
   */
  static classify(error) {
    const response = error.response;
    const request = error.request;
    const data = response?.data || {};
    // Backend returns error info in data.error object with code field
    const errorObj = data.error || {};
    const errorCode = Number(errorObj.code || data.error_code || data.code || error.code || 0);

    // 超时错误 (优先检查，因为超时也没有 response)
    if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
      return {
        type: "TIMEOUT_ERROR",
        category: "NETWORK",
        recoverable: true,
        retryable: true,
        severity: "MEDIUM",
        userImpact: "MEDIUM",
      };
    }

    // 网络错误 (无响应但有请求)
    if (!response && request) {
      return {
        type: "NETWORK_ERROR",
        category: "NETWORK",
        recoverable: true,
        retryable: true,
        severity: "HIGH",
      };
    }

    // HTTP 状态码错误
    if (response) {
      const status = response.status;
      let classification = {
        type: "UNKNOWN_ERROR",
        category: "UNKNOWN",
        recoverable: false,
        retryable: false,
        severity: "MEDIUM",
        code: errorCode,
      };

      if (status >= 500) {
        classification = {
          type: "SERVER_ERROR",
          category: "SERVER",
          recoverable: true,
          retryable: true,
          severity: "HIGH",
        };
      } else if (status === 429) {
        classification = {
          type: "RATE_LIMIT_ERROR",
          category: "CLIENT",
          recoverable: true,
          retryable: true,
          severity: "MEDIUM",
        };
      } else if (status === 401) {
        classification = {
          type: "AUTHENTICATION_ERROR",
          category: "AUTH",
          recoverable: true,
          retryable: false,
          severity: "HIGH",
        };
      } else if (status === 403) {
        classification = {
          type: "AUTHORIZATION_ERROR",
          category: "AUTH",
          recoverable: false,
          retryable: false,
          severity: "HIGH",
        };
      } else if (status >= 400 && status < 500) {
        classification = {
          type: "CLIENT_ERROR",
          category: "CLIENT",
          recoverable: false,
          retryable: false,
          severity: "MEDIUM",
        };
      }

      // 业务错误代码子分类 (Numeric Business Codes)
      if (errorCode >= 1000 && errorCode < 2000) {
        classification.subCategory = "CREDENTIALS";
      } else if (errorCode >= 2000 && errorCode < 3000) {
        classification.subCategory = "ACCOUNT_STATUS";
      } else if (errorCode >= 3000 && errorCode < 4000) {
        classification.subCategory = "PERMISSION";
      } else if (errorCode >= 4000 && errorCode < 5000) {
        classification.subCategory = "VALIDATION";
      } else if (errorCode >= 5000 && errorCode < 6000) {
        classification.subCategory = "SYSTEM";
      }

      return { ...classification, code: errorCode };
    }

    // CORS 错误
    if (
      error.message.includes("CORS") ||
      error.message.includes("cross-origin")
    ) {
      return {
        type: "CORS_ERROR",
        category: "NETWORK",
        recoverable: false,
        retryable: false,
        severity: "HIGH",
      };
    }

    // 默认未知错误
    return {
      type: "UNKNOWN_ERROR",
      category: "UNKNOWN",
      recoverable: false,
      retryable: false,
      severity: "MEDIUM",
    };
  }
}

export default ApiErrorClassifier;
