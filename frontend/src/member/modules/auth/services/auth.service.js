/**
 * 认证服务
 *
 * 处理用户登录、注册、密码管理等 API 调用。
 * 遵循 dev-frontend_patterns skill 规范。
 */

import { apiService } from "@shared/services";
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
  createService,
} from "@shared/utils/helpers";

class AuthService {
  // 会员登录
  async login(credentials) {
    this.clearAuth();
    const response = await apiService.post(
      `${API_PREFIX}/auth/login`,
      credentials,
    );

    if (response.accessToken) {
      setStorage(ACCESS_TOKEN_KEY, response.accessToken);
      const userInfo = {
        ...response.user,
        role: response.user.role || "member",
      };
      setStorage("user_info", userInfo);
    }

    return response;
  }

  // 管理员登录
  async adminLogin(credentials) {
    this.clearAuth();
    const response = await apiService.post(
      `${API_PREFIX}/auth/admin-login`,
      credentials,
    );

    if (response.accessToken) {
      setStorage(ACCESS_TOKEN_KEY, response.accessToken);
      const userInfo = {
        ...response.user,
        role: "admin",
      };
      setStorage("user_info", userInfo);

      return {
        ...response,
        user: userInfo,
      };
    }

    return response;
  }

  // 会员注册
  async register(userData) {
    let registrationData;

    if (userData instanceof FormData) {
      const data = {};
      const files = {};

      for (const [key, value] of userData.entries()) {
        if (value instanceof File) {
          files[key] = value;
        } else if (key.endsWith("[]")) {
          const fieldName = key.replace("[]", "");
          if (!data[fieldName]) {
            data[fieldName] = [];
          }
          data[fieldName].push(value);
        } else {
          data[key] = value;
        }
      }

      let logoFileId = null;
      let certificateFileId = null;

      registrationData = {
        business_number:
          data.businessNumber?.replace(/-/g, "") || data.business_number,
        company_name: data.companyName,
        password: data.password,
        email: data.email,
        region: data.region || null,
        company_type: data.category || null,
        corporate_number: data.corporationNumber?.replace(/-/g, "") || null,
        address: data.address || null,
        representative: data.representative || null,
        contact_person: data.contactPersonName || null,
        industry: data.businessField || null,
        revenue: data.sales ? parseFloat(data.sales.replace(/,/g, "")) : null,
        employee_count: data.employeeCount
          ? parseInt(data.employeeCount.replace(/,/g, ""), 10)
          : null,
        founding_date: data.establishedDate || null,
        website: data.websiteUrl || null,
        main_business: data.mainBusiness || null,
        logo_file_id: logoFileId,
        certificate_file_id: certificateFileId,
        terms_agreed: !!(
          data.termsOfService &&
          data.privacyPolicy &&
          data.thirdPartySharing
        ),
      };
    } else {
      registrationData = userData;
    }

    return await apiService.post(
      `${API_PREFIX}/auth/register`,
      registrationData,
    );
  }

  // 登出
  async logout() {
    try {
      await apiService.post(`${API_PREFIX}/auth/logout`);
    } catch (error) {
    } finally {
      this.clearAuth();
    }
  }

  // 刷新令牌
  async refreshToken() {
    const refreshToken = getStorage("refresh_token");
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await apiService.post(`${API_PREFIX}/auth/refresh`, {
      refreshToken,
    });

    if (response.accessToken) {
      setStorage(ACCESS_TOKEN_KEY, response.accessToken);
      setStorage("token_expiry", response.expiresAt);
    }

    return response;
  }

  // 获取当前用户
  async getCurrentUser() {
    if (!this.isAuthenticated()) {
      this.clearAuth();
      return null;
    }

    try {
      const response = await apiService.get(`${API_PREFIX}/auth/me`);
      const existingUser = this.getCurrentUserFromStorage();
      const userInfo = {
        ...response,
        role: response.role || existingUser?.role || "member",
      };
      setStorage("user_info", userInfo);
      return userInfo;
    } catch (error) {
      if (error?.response?.status === 401) {
        this.clearAuth();
        return null;
      }
      throw error;
    }
  }

  // 更新用户资料
  async updateProfile(userData) {
    const response = await apiService.put(
      `${API_PREFIX}/auth/profile`,
      userData,
    );
    setStorage("user_info", response);
    return response;
  }

  // 修改密码
  async changePassword(passwordData) {
    return await apiService.post(
      `${API_PREFIX}/auth/change-password`,
      passwordData,
    );
  }

  // 忘记密码
  async forgotPassword(data) {
    return await apiService.post(
      `${API_PREFIX}/auth/password-reset-request`,
      data,
    );
  }

  // 重置密码
  async resetPassword(token, newPassword) {
    return await apiService.post(`${API_PREFIX}/auth/password-reset`, {
      token,
      newPassword,
    });
  }

  // 检查是否已认证
  isAuthenticated() {
    const token =
      getStorage(ACCESS_TOKEN_KEY) || getSessionStorage(ACCESS_TOKEN_KEY);
    const expiry =
      getStorage("token_expiry") || getSessionStorage("token_expiry");

    if (!token) return false;
    if (!expiry) return true;

    const expiryDate = new Date(expiry);
    return expiryDate > new Date();
  }

  // 从存储获取当前用户
  getCurrentUserFromStorage() {
    return getStorage("user_info") || getSessionStorage("user_info");
  }

  // 检查事业者登录号是否可用
  async checkBusinessNumber(businessNumber) {
    const cleaned = businessNumber.replace(/-/g, "");
    const response = await apiService.get(
      `${API_PREFIX}/auth/check-business-number/${encodeURIComponent(cleaned)}`,
    );
    return response;
  }

  // 检查邮箱是否可用
  async checkEmail(email) {
    const response = await apiService.get(
      `${API_PREFIX}/auth/check-email/${encodeURIComponent(email)}`,
    );
    return response;
  }

  // 检查用户角色
  hasRole(role) {
    const user = this.getCurrentUserFromStorage();
    return user?.role === role;
  }

  // 检查是否为管理员
  isAdmin() {
    return this.hasRole(USER_ROLES.ADMIN);
  }

  // 检查是否为会员
  isMember() {
    return this.hasRole(USER_ROLES.MEMBER);
  }

  // 清除认证数据
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

const authService = createService(AuthService);

export default authService;
