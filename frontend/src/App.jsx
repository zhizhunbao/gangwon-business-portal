/**
 * Root App Component
 */

import React, { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '@shared/i18n';
import { router } from './router';
import { useAuth } from '@shared/hooks';
import { LoadingOverlay, ErrorBoundary } from '@shared/components';
import { useUIStore } from '@shared/stores/uiStore';

export default function App() {
  const { isAuthenticated, getCurrentUser, isLoading } = useAuth();
  const { theme } = useUIStore();
  
  // Apply theme to HTML element
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Initialize authentication state on app load - validate token
  useEffect(() => {
    const validateToken = async () => {
      // Only validate if we have a stored token
      const hasToken = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      
      if (hasToken && isAuthenticated) {
        try {
          const user = await getCurrentUser();
          if (!user) {
            // Token无效，认证状态已被清除
            console.log('[App] Token validation failed, auth state cleared');
          }
        } catch (error) {
          // 其他错误（非401）
          console.error('[App] Token validation error:', error);
        }
      }
    };
    validateToken();
  }, []);
  
  if (isLoading) {
    return <LoadingOverlay text="초기화 중..." />;
  }
  
  return (
    <ErrorBoundary>
      <I18nextProvider i18n={i18n}>
        <RouterProvider 
          router={router}
          future={{
            v7_startTransition: true,
          }}
        />
      </I18nextProvider>
    </ErrorBoundary>
  );
}

