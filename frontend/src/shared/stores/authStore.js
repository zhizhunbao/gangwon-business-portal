/**
 * Authentication Store (Zustand)
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import authService from '@shared/services/auth.service';

export const useAuthStore = create(
  devtools(
    (set) => ({
      user: authService.getCurrentUserFromStorage(),
      isAuthenticated: authService.isAuthenticated(),
      isLoading: false,
      
      setUser: (user) => set({ user, isAuthenticated: true }),
      
      setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
      
      setLoading: (isLoading) => set({ isLoading }),
      
      clearAuth: () => {
        // AOP 系统会自动记录 Store 操作
        authService.clearAuth();
        set({ user: null, isAuthenticated: false });
      },
      
      logout: async () => {
        // AOP 系统会自动记录 Store 操作
        await authService.logout();
        set({ user: null, isAuthenticated: false });
      }
    }),
    { name: 'AuthStore' }
  )
);

export default useAuthStore;

