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
    try {
      setLoading(true);
      const response = await authService.register(userData);
      return response;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  const logout = async () => {
    try {
      setLoading(true);
      await authService.logout();
      clearAuth();
    } catch (error) {
      console.error('Logout error:', error);
      clearAuth();
    } finally {
      setLoading(false);
    }
  };
  
  const getCurrentUser = async () => {
    try {
      setLoading(true);
      const user = await authService.getCurrentUser();
      setUser(user);
      setAuthenticated(true);
      return user;
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

