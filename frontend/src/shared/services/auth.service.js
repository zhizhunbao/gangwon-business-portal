/**
 * Authentication Service
 */

import apiService from "./api.service";
import {
  API_PREFIX,
  ACCESS_TOKEN_KEY,
  USER_ROLES,
} from "@shared/utils/constants";
import {
  setStorage,
  getStorage,
  removeStorage,
  removeSessionStorage,
  getSessionStorage,
} from "@shared/utils/storage";
import { applyAuthInterceptor } from "@shared/interceptors/auth.interceptor";

class AuthService {
  /**
   * Login
   *
   * @param {Object} credentials - Login credentials
   * @param {string} credentials.businessNumber - Business number (will be converted to business_number for API)
   * @param {string} credentials.password - Password
   */
  async login(credentials) {
    // Enforce single-role session per browser: clear any existing auth before login
    this.clearAuth();

    // Convert businessNumber (camelCase) to business_number (snake_case) for backend API
    const requestData = {
      business_number:
        credentials.businessNumber || credentials.business_number,
      password: credentials.password,
    };

    const response = await apiService.post(
      `${API_PREFIX}/auth/login`,
      requestData
    );

    if (response.access_token) {
      setStorage(ACCESS_TOKEN_KEY, response.access_token);
      // Backend doesn't return refresh_token or expires_at yet
      // Store user info with role from response
      const userInfo = {
        ...response.user,
        role: response.user.role || "member", // Default to member if not provided
      };
      setStorage("user_info", userInfo);
    }

    return response;
  }

  /**
   * Admin Login
   *
   * @param {Object} credentials - Admin login credentials
   * @param {string} credentials.email - Admin email
   * @param {string} credentials.password - Password
   */
  async adminLogin(credentials) {
    // Enforce single-role session per browser: clear any existing auth before admin login
    this.clearAuth();

    const requestData = {
      email: credentials.email,
      password: credentials.password,
    };

    const response = await apiService.post(
      `${API_PREFIX}/auth/admin-login`,
      requestData
    );

    if (response.access_token) {
      setStorage(ACCESS_TOKEN_KEY, response.access_token);
      const userInfo = {
        ...response.user,
        role: "admin", // Ensure role is set to admin
      };
      setStorage("user_info", userInfo);

      // Return response with updated user info that includes role
      return {
        ...response,
        user: userInfo,
      };
    }

    return response;
  }

  /**
   * Register
   *
   * @param {FormData|Object} userData - Registration data (FormData or plain object)
   * @returns {Promise<Object>} Registration response
   */
  async register(userData) {
    // If userData is FormData, we need to extract and process it
    // Otherwise, assume it's already processed
    let registrationData;

    if (userData instanceof FormData) {
      // Extract data from FormData
      const data = {};
      const files = {};

      for (const [key, value] of userData.entries()) {
        // Check if value is a File object
        if (value instanceof File) {
          files[key] = value;
        } else if (key.endsWith("[]")) {
          // Handle array fields like cooperationFields[]
          const fieldName = key.replace("[]", "");
          if (!data[fieldName]) {
            data[fieldName] = [];
          }
          data[fieldName].push(value);
        } else {
          data[key] = value;
        }
      }

      // Upload files first if they exist
      // Note: Currently, file upload requires authentication, so we skip file uploads during registration
      // Backend needs to support file upload during registration (either by creating
      // a special registration upload endpoint or making the upload endpoint support optional auth)
      // For now, files can be uploaded later after user logs in and updates their profile
      let logoFileId = null;
      let certificateFileId = null;

      // Skip file uploads during registration (requires authentication)
      // Users can upload files after registration when they log in

      // Map frontend fields to backend fields
      registrationData = {
        // Step 1: Account information
        business_number:
          data.businessNumber?.replace(/-/g, "") || data.business_number,
        company_name: data.companyName,
        password: data.password,
        email: data.email,

        // Step 2: Company information
        region: data.region || null,
        company_type: data.category || null,
        corporate_number: data.corporationNumber?.replace(/-/g, "") || null,
        address: data.address || null,
        representative: data.representative || null,
        contact_person: data.contactPersonName || null,

        // Step 3: Business information
        industry: data.businessField || null,
        revenue: data.sales ? parseFloat(data.sales.replace(/,/g, "")) : null,
        employee_count: data.employeeCount
          ? parseInt(data.employeeCount.replace(/,/g, ""), 10)
          : null,
        founding_date: data.establishedDate || null,
        website: data.websiteUrl || null,
        main_business: data.mainBusiness || null,

        // Step 4: File uploads (file IDs from upload endpoint)
        logo_file_id: logoFileId,
        certificate_file_id: certificateFileId,

        // Step 5: Terms agreement
        terms_agreed: !!(
          data.termsOfService &&
          data.privacyPolicy &&
          data.thirdPartySharing
        ),
      };
    } else {
      // Already processed data
      registrationData = userData;
    }

    // Send registration request as JSON
    return this._registerInternal(registrationData);
  }

  async _registerInternal(registrationData) {
    return await apiService.post(
      `${API_PREFIX}/auth/register`,
      registrationData
    );
  }

  /**
   * Logout
   */
  async logout() {
    try {
      await this._logoutInternal();
    } catch (error) {
      // Error already logged by decorator
    } finally {
      this.clearAuth();
    }
  }

  async _logoutInternal() {
    await apiService.post(`${API_PREFIX}/auth/logout`);
  }

  /**
   * Refresh token
   */
  async refreshToken() {
    const refreshToken = getStorage("refresh_token");
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await this._refreshTokenInternal(refreshToken);

    if (response.access_token) {
      setStorage(ACCESS_TOKEN_KEY, response.access_token);
      setStorage("token_expiry", response.expires_at);
    }

    return response;
  }

  async _refreshTokenInternal(refreshToken) {
    return await apiService.post(`${API_PREFIX}/auth/refresh`, {
      refresh_token: refreshToken,
    });
  }

  /**
   * Get current user
   */
  async getCurrentUser() {
    // Check if we have a token before making the API call
    if (!this.isAuthenticated()) {
      this.clearAuth();
      return null;
    }

    try {
      const response = await apiService.get(`${API_PREFIX}/auth/me`);
      // Preserve existing role if not returned by API (member endpoints don't return role)
      const existingUser = this.getCurrentUserFromStorage();
      const userInfo = {
        ...response,
        role: response.role || existingUser?.role || "member",
      };
      setStorage("user_info", userInfo);
      return userInfo;
    } catch (error) {
      // 如果是401错误，优雅地清除认证状态
      if (error?.response?.status === 401) {
        this.clearAuth();
        return null;
      }
      // 其他错误继续抛出
      throw error;
    }
  }

  /**
   * Update profile
   */
  async updateProfile(userData) {
    const response = await apiService.put(
      `${API_PREFIX}/auth/profile`,
      userData
    );
    setStorage("user_info", response);
    return response;
  }

  /**
   * Change password
   */
  async changePassword(passwordData) {
    return await apiService.post(
      `${API_PREFIX}/auth/change-password`,
      passwordData
    );
  }

  /**
   * Forgot password (Request password reset)
   *
   * @param {Object} data - Password reset request data
   * @param {string} data.businessNumber - Business number (will be converted to business_number for API)
   * @param {string} data.email - Email address
   */
  async forgotPassword(data) {
    // Convert businessNumber (camelCase) to business_number (snake_case) for backend API
    const requestData = {
      business_number:
        data.businessNumber?.replace(/-/g, "") || data.business_number,
      email: data.email,
    };

    return await this._forgotPasswordInternal(requestData);
  }

  async _forgotPasswordInternal(requestData) {
    return await apiService.post(
      `${API_PREFIX}/auth/password-reset-request`,
      requestData
    );
  }

  /**
   * Reset password (Complete password reset with token)
   *
   * @param {string} token - Reset token from email
   * @param {string} newPassword - New password
   */
  async resetPassword(token, newPassword) {
    return await apiService.post(`${API_PREFIX}/auth/password-reset`, {
      token,
      new_password: newPassword,
    });
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    const token =
      getStorage(ACCESS_TOKEN_KEY) || getSessionStorage(ACCESS_TOKEN_KEY);
    const expiry =
      getStorage("token_expiry") || getSessionStorage("token_expiry");

    if (!token) return false;
    if (!expiry) return true; // If no expiry, assume token is valid

    const expiryDate = new Date(expiry);
    return expiryDate > new Date();
  }

  /**
   * Get current user from storage
   */
  getCurrentUserFromStorage() {
    return getStorage("user_info") || getSessionStorage("user_info");
  }

  /**
   * Check if business number is available
   *
   * @param {string} businessNumber - Business registration number
   * @returns {Promise<{available: boolean, message: string}>}
   */
  async checkBusinessNumber(businessNumber) {
    // Remove dashes for API call
    const cleaned = businessNumber.replace(/-/g, "");
    const response = await apiService.get(
      `${API_PREFIX}/auth/check-business-number/${encodeURIComponent(cleaned)}`
    );
    return response;
  }

  /**
   * Check if email is available
   *
   * @param {string} email - Email address
   * @returns {Promise<{available: boolean, message: string}>}
   */
  async checkEmail(email) {
    const response = await apiService.get(
      `${API_PREFIX}/auth/check-email/${encodeURIComponent(email)}`
    );
    return response;
  }

  /**
   * Check if user has role
   */
  hasRole(role) {
    const user = this.getCurrentUserFromStorage();
    return user?.role === role;
  }

  /**
   * Check if user is admin
   */
  isAdmin() {
    return this.hasRole(USER_ROLES.ADMIN);
  }

  /**
   * Check if user is member
   */
  isMember() {
    return this.hasRole(USER_ROLES.MEMBER);
  }

  /**
   * Clear authentication data
   */
  clearAuth() {
    const keys = [
      ACCESS_TOKEN_KEY,
      "refresh_token",
      "user_info",
      "token_expiry",
      "token_type",
    ];

    keys.forEach((key) => {
      removeStorage(key);
      removeSessionStorage(key);
    });
  }
}

// 创建认证服务实例
const authService = new AuthService();

// 应用认证拦截器 - Requirements 3.5 (now with proper prototype method handling)
const interceptedAuthService = applyAuthInterceptor(authService, {
  enableLogging: true,
});

export default interceptedAuthService;
