/**
 * Header Component - Member Portal
 * 会员端顶部导航 - Korean Government Style
 */

import { useTranslation } from "react-i18next";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@shared/hooks";
import LanguageSwitcher from "@shared/components/LanguageSwitcher";
import { LoginModal } from "@shared/components";
import {
  BellIcon,
  UserIcon,
  LogoutIcon,
  ChevronDownIcon,
  SupportIcon,
  DashboardIcon,
  FolderIcon,
  ChartIcon,
  DocumentIcon,
  MenuIcon,
  XIcon,
  NotificationBell,
} from "@shared/components";

// 统一的 hover 样式配置 - 深蓝色主题
const HOVER_STYLES = {
  // 深色背景上的 hover（顶部导航栏）- 浅蓝色高亮
  dark: 'hover:text-blue-200',
  darkBorder: 'hover:text-blue-200 hover:border-blue-300',
  // 导航项状态
  navItemActive: 'border-white font-bold hover:text-blue-200',
  navItemInactive: 'border-transparent',
  // 浅色背景上的 hover（下拉菜单、移动端菜单）- 深蓝色
  light: 'hover:bg-blue-50 hover:text-blue-800',
  lightBorder: 'hover:bg-blue-50 hover:text-blue-800 hover:border-l-blue-600',
  // 危险操作 - 保持红色
  danger: 'hover:bg-red-50 hover:text-red-800 hover:border-l-red-600',
};

function Header() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const [pendingPath, setPendingPath] = useState(null);
  const userMenuRef = useRef(null);
  const mobileMenuRef = useRef(null);

  // 一级导航菜单
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

  // 处理菜单项点击，检查是否需要登录
  const handleMenuClick = (e, item) => {
    if (item.requiresAuth && !isAuthenticated) {
      e.preventDefault();
      setPendingPath(item.path);
      setShowLoginModal(true);
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

  // 菜单激活状态计算
  const isMenuActive = (item) => {
    // 首页模块（首页入口 + 首页内“查看全部”落地页）都应该保持高亮
    if (item.key === "home") {
      return (
        location.pathname === "/member/home" ||
        location.pathname === "/member" ||
        location.pathname.startsWith("/member/notices") ||
        location.pathname.startsWith("/member/press") ||
        location.pathname.startsWith("/member/news")
      );
    }
    if (item.exact) {
      return location.pathname === item.path;
    }
    return location.pathname.startsWith(item.path);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target)
      ) {
        setShowMobileMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setShowUserMenu(false);
    await logout();
    navigate("/member/home", { replace: true });
  };

  return (
    <header className="member-header fixed top-0 left-0 right-0 flex items-center justify-between px-8 z-[1000] h-[70px] max-md:h-[60px] max-md:px-4 border-b-[3px] border-[#003d82] shadow-md"
      style={{ backgroundColor: '#003d82' }}>
      <div className="flex items-center gap-4 flex-shrink-0">
        <button
          className={`hidden max-md:flex bg-transparent border-none cursor-pointer py-2 px-3 text-white transition-all duration-200 rounded items-center justify-center mr-2 ${HOVER_STYLES.dark}`}
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          aria-label={t("header.toggleMenu")}
        >
          {showMobileMenu ? <XIcon className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
        </button>

        <Link to="/member/home" className={`flex items-center gap-3 no-underline text-white font-bold text-xl tracking-tight ${HOVER_STYLES.dark}`}>
          <span className="whitespace-nowrap font-['Noto_Sans_KR',-apple-system,BlinkMacSystemFont,sans-serif]" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
            {t("header.title")}
          </span>
        </Link>
      </div>

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex justify-center items-center max-md:hidden">
        <nav className="w-full">
          <ul className="flex items-center gap-1 list-none m-0 p-0 justify-center">
            {mainMenuItems.map((item) => {
              const Icon = item.icon;
              const active = isMenuActive(item);

              return (
                <li key={item.key} className="flex-shrink-0">
                  <NavLink
                    to={item.path}
                    end={item.exact}
                    className={`flex items-center gap-2 px-5 py-2.5 text-white no-underline text-[0.9375rem] font-semibold whitespace-nowrap transition-all duration-200 relative border-b-[3px] max-lg:px-3.5 max-lg:py-2 ${
                      active ? HOVER_STYLES.navItemActive : `${HOVER_STYLES.navItemInactive} ${HOVER_STYLES.darkBorder}`
                    }`}
                    style={{ textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}
                    onClick={(e) => handleMenuClick(e, item)}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="leading-5 max-lg:hidden">{item.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* Mobile Menu Overlay */}
      {showMobileMenu && (
        <div
          className="fixed inset-0 bg-black/50 z-[999] md:hidden animate-[fadeIn_0.2s_ease-out]"
          onClick={() => setShowMobileMenu(false)}
        />
      )}
      
      {/* Mobile Menu */}
      <nav
        ref={mobileMenuRef}
        className={`fixed top-[60px] left-0 right-0 bg-white shadow-lg z-[1000] transition-transform duration-300 ease-in-out md:hidden max-h-[calc(100vh-60px)] overflow-y-auto ${
          showMobileMenu ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <ul className="list-none m-0 p-0">
          {mainMenuItems.map((item) => {
            const Icon = item.icon;
            const active = isMenuActive(item);

            return (
              <li key={item.key} className="border-b border-gray-200 last:border-b-0">
                <NavLink
                  to={item.path}
                  end={item.exact}
                  className={`flex items-center gap-3 px-6 py-4 no-underline transition-colors duration-200 ${
                    active 
                      ? 'bg-primary-50 text-primary-700 font-semibold border-l-4 border-primary-600' 
                      : `text-gray-900 ${HOVER_STYLES.light}`
                  }`}
                  onClick={(e) => {
                    handleMenuClick(e, item);
                    setShowMobileMenu(false);
                  }}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex items-center gap-3 flex-shrink-0 justify-end">
        {/* 语言切换 */}
        <div className="[&>button]:text-white [&>button]:bg-transparent [&>button]:border-none [&>button:hover]:bg-transparent [&>button:hover]:opacity-80 [&_svg]:text-white">
          <LanguageSwitcher variant="light" />
        </div>

        {/* 通知 - 下拉列表形式 */}
        {isAuthenticated && (
          <NotificationBell userType="member" variant="dark" />
        )}

        {/* 用户菜单或登录按钮 */}
        {isAuthenticated ? (
          <div className="relative" ref={userMenuRef}>
            <button
              className={`flex items-center gap-2.5 bg-transparent border-none cursor-pointer py-2 px-3.5 transition-all duration-200 rounded ${HOVER_STYLES.dark} active:scale-[0.98]`}
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <div className="w-9 h-9 rounded-full text-white flex items-center justify-center font-bold text-[0.9375rem] border-2 border-white/30 shadow-[0_2px_4px_-1px_rgba(0,76,151,0.3)]"
                style={{ background: 'linear-gradient(135deg, #0066cc 0%, #004c97 100%)' }}>
                {user?.companyName?.charAt(0) || user?.name?.charAt(0) || "U"}
              </div>
              <span className="text-[0.9375rem] font-semibold text-white max-w-[150px] overflow-hidden truncate whitespace-nowrap max-md:hidden"
                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                {user?.companyName || user?.name || t("common.appName")}
              </span>
              <ChevronDownIcon className={`w-4 h-4 text-white transition-all duration-200 flex-shrink-0 ${showUserMenu ? 'rotate-180' : ''}`} />
            </button>

            {showUserMenu && (
              <div className="absolute top-[calc(100%+0.5rem)] right-0 bg-white border-2 border-gray-200 rounded-md shadow-lg min-w-[260px] z-[1001] overflow-hidden animate-[slideDown_0.2s_ease-out] max-md:-right-4 max-md:min-w-[240px]">
                <div className="p-5 flex items-center gap-3.5 border-b border-gray-100 bg-blue-50">
                  <div className="w-[52px] h-[52px] rounded-full text-white flex items-center justify-center font-bold text-xl flex-shrink-0 border-2 border-blue-700/20 shadow-[0_2px_4px_-1px_rgba(0,76,151,0.3)]"
                    style={{ background: 'linear-gradient(135deg, #0066cc 0%, #004c97 100%)' }}>
                    {user?.companyName?.charAt(0) || user?.name?.charAt(0) || "U"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[0.9375rem] font-bold text-gray-900 m-0 mb-1 overflow-hidden truncate whitespace-nowrap">
                      {user?.companyName || user?.name || t("common.appName")}
                    </div>
                    <div className="text-[0.8125rem] text-gray-600 overflow-hidden truncate whitespace-nowrap">
                      {user?.email || ""}
                    </div>
                  </div>
                </div>

                <div className="h-px my-2 mx-5 bg-gray-100" />

                <Link
                  to="/member/performance/company-info"
                  className={`flex items-center gap-3.5 py-3.5 px-5 text-gray-900 no-underline bg-transparent w-full text-left cursor-pointer text-[0.9375rem] font-medium transition-all duration-200 border-l-[3px] border-transparent hover:pl-[1.125rem] ${HOVER_STYLES.lightBorder}`}
                  onClick={() => setShowUserMenu(false)}
                >
                  <UserIcon className="w-[1.125rem] h-[1.125rem] flex-shrink-0" />
                  <span>{t("header.profile")}</span>
                </Link>

                <Link
                  to="/member/support"
                  className={`flex items-center gap-3.5 py-3.5 px-5 text-gray-900 no-underline bg-transparent w-full text-left cursor-pointer text-[0.9375rem] font-medium transition-all duration-200 border-l-[3px] border-transparent hover:pl-[1.125rem] ${HOVER_STYLES.lightBorder}`}
                  onClick={() => setShowUserMenu(false)}
                >
                  <SupportIcon className="w-[1.125rem] h-[1.125rem] flex-shrink-0" />
                  <span>{t("header.support")}</span>
                </Link>

                <div className="h-px my-2 mx-5 bg-gray-100" />

                <button
                  className={`flex items-center gap-3.5 py-3.5 px-5 text-red-600 no-underline bg-transparent border-none w-full text-left cursor-pointer text-[0.9375rem] font-medium transition-all duration-200 border-l-[3px] border-transparent hover:pl-[1.125rem] ${HOVER_STYLES.danger}`}
                  onClick={handleLogout}
                >
                  <LogoutIcon className="w-[1.125rem] h-[1.125rem] flex-shrink-0" />
                  <span>{t("header.logout")}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              className="px-4 py-2 rounded-md cursor-pointer transition-all duration-200 font-medium text-sm text-white border border-white/20 hover:text-yellow-100 hover:border-yellow-400 active:bg-white/30"
              style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
              onClick={() => setShowLoginModal(true)}
            >
              {t("header.login")}
            </button>
          </div>
        )}
      </div>

      {/* 登录弹窗 */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => {
          setShowLoginModal(false);
          setPendingPath(null);
        }}
        onSuccess={handleLoginSuccess}
        onSwitchToRegister={() => {
          setShowLoginModal(false);
          navigate("/member/register");
        }}
      />

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </header>
  );
}

export default Header;
