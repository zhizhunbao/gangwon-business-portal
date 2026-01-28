/**
 * Header Logic Hook
 * 处理 Header 组件的业务逻辑：菜单项配置、活跃状态判断、登录/登出处理
 *
 * 遵循 dev-frontend_patterns skill 规范。
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@shared/hooks";
import {
  DashboardIcon,
  FolderIcon,
  ChartIcon,
  DocumentIcon,
  SupportIcon,
} from "@shared/components";

export function useHeader() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();

  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingPath, setPendingPath] = useState(null);

  // 一级导航菜单配置
  const mainMenuItems = [
    {
      key: "home",
      path: "/member/home",
      icon: DashboardIcon,
      label: t("menu.home"),
      exact: true,
      requiresAuth: false,
    },
    {
      key: "about",
      path: "/member/about",
      icon: DocumentIcon,
      label: t("menu.about"),
      requiresAuth: false,
    },
    {
      key: "projects",
      path: "/member/programs",
      icon: FolderIcon,
      label: t("menu.projects"),
      requiresAuth: true,
    },
    {
      key: "performance",
      path: "/member/performance",
      icon: ChartIcon,
      label: t("menu.performance"),
      requiresAuth: true,
    },
    {
      key: "support",
      path: "/member/support",
      icon: SupportIcon,
      label: t("menu.support"),
      requiresAuth: true,
    },
  ];

  // 菜单激活状态计算
  const isMenuActive = (item) => {
    // 首页模块
    if (item.key === "home") {
      return (
        location.pathname === "/member/home" ||
        location.pathname === "/member" ||
        location.pathname.startsWith("/member/news")
      );
    }
    // 支援事业模块
    if (item.key === "projects") {
      return (
        location.pathname.startsWith("/member/programs") ||
        location.pathname.startsWith("/member/project")
      );
    }
    // 一站式支持模块
    if (item.key === "support") {
      return (
        location.pathname.startsWith("/member/support") ||
        location.pathname.startsWith("/member/notices")
      );
    }
    if (item.exact) {
      return location.pathname === item.path;
    }
    return location.pathname.startsWith(item.path);
  };

  // 处理菜单项点击
  const handleMenuClick = (e, item) => {
    if (item.requiresAuth && !isAuthenticated) {
      e.preventDefault();
      setPendingPath(item.path);
      setShowLoginModal(true);
    } else {
      setShowMobileMenu(false); // Mobile menu auto-close
    }
  };

  // 处理登录成功
  const handleLoginSuccess = (response) => {
    setShowLoginModal(false);
    if (pendingPath) {
      navigate(pendingPath);
      setPendingPath(null);
    } else {
      const redirectPath =
        response.user?.role === "admin" ? "/admin" : "/member";
      navigate(redirectPath);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/member/home", { replace: true });
  };

  return {
    user,
    isAuthenticated,
    mainMenuItems,
    state: {
      showMobileMenu,
      showLoginModal,
    },
    actions: {
      navigate,
      setShowMobileMenu,
      setShowLoginModal,
      setPendingPath,
      handleMenuClick,
      handleLoginSuccess,
      handleLogout,
      isMenuActive,
    },
  };
}
