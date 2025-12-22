/**
 * Authentication Recovery Service
 * 
 * Centralized authentication exception recovery mechanism
 * Integrates with API interceptor and auth hooks for seamless recovery
 * 
 * Features:
 * - Automatic token refresh
 * - Login page redirection
 * - Authentication state recovery
 * - Session management
 * 
 * Requirements: 10.3
 */

import { frontendExceptionService } from '@shared/utils/exception.service.js';

/**
 * Authentication Recovery Service
 */
class AuthRecoveryService {
  constructor() {
    this.isRefreshing = false;
    this.refreshPromise = null;
    this.failedQueue = [];
    this.maxRefreshAttempts = 3;
    this.refreshAttempts = 0;
    this.lastRefreshTime = 0;
    this.refreshCooldown = 5000; // 5秒冷却时间
    
    // 绑定方法
    this.processQueue = this.processQueue.bind(this);
    this.handleAuthError = this.handleAuthError.bind(this);
    this.refreshToken = this.refreshToken.bind(this);
  }

  /**
   * 处理认证错误
   * @param {Error} error - 认证错误
   * @param {Object} config - 请求配置
   * @returns {Promise} 恢复结果
   */
  async handleAuthError(error, config) {
    const now = Date.now();
    
    // 对于 /api/auth/me 请求的401错误，这通常是正常的（用户未登录）
    if (error?.response?.status === 401 && config?.url?.includes('/api/auth/me')) {
      this.clearAuthState();
      return Promise.resolve(); // 不要reject，让组件处理
    }
    
    // 检查冷却时间
    if (now - this.lastRefreshTime < this.refreshCooldown) {
      // AOP 系统会自动记录服务调用
      return this.redirectToLogin();
    }

    // 如果已经在刷新中，将请求加入队列
    if (this.isRefreshing) {
      return new Promise((resolve, reject) => {
        this.failedQueue.push({ resolve, reject, config });
      });
    }

    // 检查刷新尝试次数
    if (this.refreshAttempts >= this.maxRefreshAttempts) {
      // AOP 系统会自动记录服务调用
      this.resetRefreshState();
      return this.redirectToLogin();
    }

    // 开始刷新流程
    this.isRefreshing = true;
    this.refreshAttempts += 1;
    this.lastRefreshTime = now;

    try {
      // 执行 token 刷新
      this.refreshPromise = this.refreshToken();
      await this.refreshPromise;

      // 刷新成功，处理队列中的请求
      this.processQueue(null, config);
      this.resetRefreshState();

      // 返回原始配置以重试请求
      return config;

    } catch (refreshError) {
      console.error('[AuthRecoveryService] Token refresh failed:', refreshError);
      
      // 报告刷新失败
      await this.reportRefreshFailure(refreshError, error);

      // 处理队列中的请求（全部失败）
      this.processQueue(refreshError, null);

      // 如果达到最大尝试次数，重定向到登录页面
      if (this.refreshAttempts >= this.maxRefreshAttempts) {
        this.resetRefreshState();
        return this.redirectToLogin();
      }

      // 否则抛出错误
      throw refreshError;
    }
  }

  /**
   * 刷新 token
   * @returns {Promise} 刷新结果
   */
  async refreshToken() {
    try {
      // 尝试从多个来源获取刷新方法
      let refreshMethod = null;

      // 1. 从全局 authService 获取
      if (window.authService && typeof window.authService.refreshToken === 'function') {
        refreshMethod = window.authService.refreshToken.bind(window.authService);
      }
      
      // 2. 从 auth store 获取
      else if (window.authStore && typeof window.authStore.refreshToken === 'function') {
        refreshMethod = window.authStore.refreshToken.bind(window.authStore);
      }
      
      // 3. 从 localStorage 中的 refresh token 手动刷新
      else {
        refreshMethod = this.manualTokenRefresh.bind(this);
      }

      if (!refreshMethod) {
        throw new Error('No token refresh method available');
      }

      // 执行刷新
      const result = await refreshMethod();
      
      // AOP 系统会自动记录服务调用成功
      
      // 验证刷新结果
      await this.validateRefreshResult(result);
      
      return result;

    } catch (error) {
      console.error('[AuthRecoveryService] Token refresh error:', error);
      throw error;
    }
  }

  /**
   * 手动 token 刷新
   */
  async manualTokenRefresh() {
    const refreshToken = localStorage.getItem('refresh_token') || 
                        sessionStorage.getItem('refresh_token');
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    // 发送刷新请求
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken })
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // 更新存储的 token
    if (data.access_token) {
      localStorage.setItem('access_token', data.access_token);
      
      if (data.refresh_token) {
        localStorage.setItem('refresh_token', data.refresh_token);
      }
    }

    return data;
  }

  /**
   * 验证刷新结果
   */
  async validateRefreshResult(result) {
    // 检查是否有新的访问令牌
    const accessToken = result?.access_token || 
                       localStorage.getItem('access_token') ||
                       sessionStorage.getItem('access_token');

    if (!accessToken) {
      throw new Error('No access token after refresh');
    }

    // 可选：验证 token 有效性
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Token validation failed after refresh');
      }

    } catch (validationError) {
      // AOP 系统会自动记录异常
      // 不抛出错误，因为验证可能不是必需的
    }
  }

  /**
   * 处理失败队列
   */
  processQueue(error, token) {
    this.failedQueue.forEach(({ resolve, reject, config }) => {
      if (error) {
        reject(error);
      } else {
        resolve(config);
      }
    });
    
    this.failedQueue = [];
  }

  /**
   * 重置刷新状态
   */
  resetRefreshState() {
    this.isRefreshing = false;
    this.refreshPromise = null;
    this.refreshAttempts = 0;
  }

  /**
   * 重定向到登录页面
   */
  redirectToLogin() {
    // 清除认证状态
    this.clearAuthState();
    
    // 对于会员路由，不需要重定向，而是触发登录模态框
    const currentPath = window.location.pathname;
    if (currentPath.startsWith('/member')) {
      // 触发登录模态框显示事件
      window.dispatchEvent(new CustomEvent('auth:show-login-modal'));
      return Promise.resolve(); // 不要reject，让组件处理
    }
    
    // 对于管理员路由，重定向到管理员登录页面
    if (currentPath.startsWith('/admin')) {
      if (window.location.pathname !== '/admin/login') {
        window.location.href = '/admin/login';
      }
      return Promise.reject(new Error('Redirected to admin login'));
    }
    
    // 其他情况，重定向到首页
    window.location.href = '/';
    return Promise.reject(new Error('Redirected to home'));
  }

  /**
   * 清除认证状态
   */
  clearAuthState() {
    // 清除存储的 token
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');
    
    // 清除用户信息
    localStorage.removeItem('user_info');
    sessionStorage.removeItem('user_info');
    
    // 通知其他组件认证状态已清除
    if (window.authService && typeof window.authService.clearAuth === 'function') {
      window.authService.clearAuth();
    }
    
    // 发送自定义事件
    window.dispatchEvent(new CustomEvent('auth:cleared'));
  }

  /**
   * 报告刷新失败
   */
  async reportRefreshFailure(refreshError, originalError) {
    try {
      const context = {
        type: 'auth-refresh-failure',
        refreshError: {
          message: refreshError.message,
          attempts: this.refreshAttempts,
          maxAttempts: this.maxRefreshAttempts,
          lastRefreshTime: this.lastRefreshTime,
          cooldownPeriod: this.refreshCooldown
        },
        originalError: {
          message: originalError.message,
          status: originalError.response?.status,
          url: originalError.config?.url
        },
        authState: {
          hasAccessToken: !!(localStorage.getItem('access_token') || sessionStorage.getItem('access_token')),
          hasRefreshToken: !!(localStorage.getItem('refresh_token') || sessionStorage.getItem('refresh_token')),
          queueLength: this.failedQueue.length
        },
        timestamp: new Date().toISOString()
      };

      await frontendExceptionService.reportException(refreshError, context);

    } catch (reportError) {
      // AOP 系统会自动记录异常
    }
  }

  /**
   * 获取认证恢复状态
   */
  getRecoveryStatus() {
    return {
      isRefreshing: this.isRefreshing,
      refreshAttempts: this.refreshAttempts,
      maxRefreshAttempts: this.maxRefreshAttempts,
      queueLength: this.failedQueue.length,
      lastRefreshTime: this.lastRefreshTime,
      inCooldown: Date.now() - this.lastRefreshTime < this.refreshCooldown
    };
  }

  /**
   * 手动触发认证恢复
   */
  async manualRecovery() {
    if (this.isRefreshing) {
      return { success: false, reason: 'already_refreshing' };
    }

    try {
      this.resetRefreshState();
      await this.refreshToken();
      return { success: true };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 检查认证状态
   */
  checkAuthStatus() {
    const accessToken = localStorage.getItem('access_token') || 
                       sessionStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token') || 
                        sessionStorage.getItem('refresh_token');

    return {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      isAuthenticated: !!accessToken,
      canRefresh: !!refreshToken
    };
  }
}

// 创建全局实例
const authRecoveryService = new AuthRecoveryService();

// 导出服务和类
export { AuthRecoveryService, authRecoveryService };
export default authRecoveryService;