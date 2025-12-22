/**
 * Authentication Hook
 */

import { useAuthStore } from '@shared/stores/authStore';
import authService from '@shared/services/auth.service';

export function useAuth() {
  const {
    user,
    isAuthenticated,
    isLoading,
    setUser,
    setAuthenticated,
    setLoading,
    clearAuth
  } = useAuthStore();
  
  const login = async (credentials) => {
    try {
      setLoading(true);
      const response = await authService.login(credentials);
      // AOP 系统会自动记录认证成功
      setUser(response.user);
      setAuthenticated(true);
      return response;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  const adminLogin = async (credentials) => {
    try {
      setLoading(true);
      const response = await authService.adminLogin(credentials);
      setUser(response.user);
      setAuthenticated(true);
      return response;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  const register = async (userData) => {
    // 注册不设置全局loading，因为注册页面有自己的loading状态
    try {
      const response = await authService.register(userData);
      return response;
    } catch (error) {
      throw error;
    }
  };
  
  const logout = async () => {
    try {
      setLoading(true);
      await authService.logout();
      clearAuth();
    } catch (error) {
      // AOP 系统会自动记录错误
      clearAuth();
    } finally {
      setLoading(false);
    }
  };
  
  const getCurrentUser = async () => {
    try {
      setLoading(true);
      const user = await authService.getCurrentUser();
      if (user) {
        setUser(user);
        setAuthenticated(true);
        return user;
      } else {
        // 认证失败，清除状态
        clearAuth();
        return null;
      }
    } catch (error) {
      clearAuth();
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  const updateProfile = async (userData) => {
    try {
      setLoading(true);
      const user = await authService.updateProfile(userData);
      setUser(user);
      return user;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  const hasRole = (role) => {
    return authService.hasRole(role);
  };
  
  const isAdmin = () => {
    return authService.isAdmin();
  };
  
  const isMember = () => {
    return authService.isMember();
  };
  
  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    adminLogin,
    register,
    logout,
    getCurrentUser,
    updateProfile,
    hasRole,
    isAdmin,
    isMember
  };
}

