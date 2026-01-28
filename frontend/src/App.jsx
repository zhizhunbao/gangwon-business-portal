/**
 * Root App Component
 */

import React, { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { I18nextProvider, useTranslation } from "react-i18next";
import i18n from "@shared/i18n";
import { router } from "./router";
import { useAuth } from "@shared/hooks";
import { LoadingOverlay, ErrorBoundary } from "@shared/components";
import { useUIStore, useAuthStore } from "@shared/stores";
import authService from "@features/auth/services/auth.service";

export default function App() {
  const { t } = useTranslation();
  const {
    isAuthenticated,
    getCurrentUser,
    isLoading: authInProgress,
  } = useAuth();
  const { setUser, setAuthenticated } = useAuthStore();
  const { theme } = useUIStore();
  const [isInitializing, setIsInitializing] = React.useState(true);

  // Apply theme to HTML element
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  // Initialize authentication state on app load
  useEffect(() => {
    const initAuth = async () => {
      const storedUser = authService.getCurrentUserFromStorage();
      const hasToken = authService.isAuthenticated();

      if (storedUser && hasToken) {
        setUser(storedUser);
        setAuthenticated(true);
        try {
          await getCurrentUser();
        } catch (error) {
          // Token validation failed silently
        }
      }
      setIsInitializing(false);
    };
    initAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isInitializing) {
    return <LoadingOverlay text={t('common.initializing', '초기화 중...')} />;
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
