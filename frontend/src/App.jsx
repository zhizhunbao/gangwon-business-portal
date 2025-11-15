/**
 * Root App Component
 */

import React, { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { I18nextProvider } from 'react-i18next';
import i18n from '@shared/i18n';
import { router } from './router';
import { useAuth } from '@shared/hooks';
import { LoadingOverlay } from '@shared/components';
import { useUIStore } from '@shared/stores/uiStore';

// Create a QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000 // 5 minutes
    }
  }
});

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

  // Initialize authentication state on app load
  useEffect(() => {
    if (isAuthenticated) {
      getCurrentUser().catch(() => {
        // Silently fail if token is invalid
      });
    }
  }, []);
  
  if (isLoading) {
    return <LoadingOverlay text="초기화 중..." />;
  }
  
  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <RouterProvider 
          router={router}
          future={{
            v7_startTransition: true,
          }}
        />
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </I18nextProvider>
    </QueryClientProvider>
  );
}

