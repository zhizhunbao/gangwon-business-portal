/**
 * Header Component - Member Portal
 * 会员端顶部导航 - Korean Government Style
 *
 * 遵循 dev-frontend_patterns skill 规范。
 * UI 与 逻辑完全分离。
 */

import { Link } from "react-router-dom";
import LanguageSwitcher from "@shared/components/LanguageSwitcher";
import { LoginModal } from "@shared/components";
import { MenuIcon, XIcon, NotificationBell } from "@shared/components";
import { useTranslation } from "react-i18next";
import { LAYOUT_CONFIG } from "./enum";

// Hooks
import { useHeader } from "./hooks/useHeader";

// 子组件
import { DesktopNav } from "./components/Header/DesktopNav";
import { MobileMenu } from "./components/Header/MobileMenu";
import { UserMenu } from "./components/Header/UserMenu";

function Header() {
  const { t } = useTranslation();
  const {
    user,
    isAuthenticated,
    mainMenuItems,
    state: { showMobileMenu, showLoginModal },
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
  } = useHeader();

  return (
    <header className="member-header fixed top-0 left-0 right-0 flex items-center justify-between px-8 z-[1000] h-[70px] max-md:h-[60px] max-md:px-4 border-t border-b border-slate-200 shadow-sm bg-white">
      {/* Left: Logo & Mobile Toggle */}
      <div className="flex items-center gap-4 flex-shrink-0">
        <button
          className="hidden max-md:flex bg-transparent border-none cursor-pointer py-2 px-3 text-blue-950 transition-all duration-200 rounded items-center justify-center mr-2 hover:text-blue-600"
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          aria-label={t('header.toggleMenu', '메뉴 전환')}
        >
          {showMobileMenu ? (
            <XIcon className="w-6 h-6" />
          ) : (
            <MenuIcon className="w-6 h-6" />
          )}
        </button>

        <Link
          to="/member/home"
          className="flex items-center gap-3 no-underline hover:opacity-80 transition-opacity"
        >
          <img
            src={LAYOUT_CONFIG.LOGO_URL}
            alt={t('header.title', '강원비즈니스포털')}
            className="h-7 w-auto object-contain"
          />
        </Link>
      </div>

      {/* Center: Desktop Navigation */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex justify-center items-center max-md:hidden">
        <DesktopNav
          menuItems={mainMenuItems}
          isMenuActive={isMenuActive}
          onMenuClick={handleMenuClick}
        />
      </div>

      {/* Mobile Menu Overlay & Content */}
      <MobileMenu
        isOpen={showMobileMenu}
        onClose={() => setShowMobileMenu(false)}
        menuItems={mainMenuItems}
        isMenuActive={isMenuActive}
        onMenuClick={handleMenuClick}
      />

      {/* Right: Auth & Tools */}
      <div className="flex items-center gap-3 flex-shrink-0 justify-end">
        <div className="[&>button]:text-blue-950 [&>button]:bg-transparent [&>button]:border-none [&>button:hover]:bg-transparent [&>button:hover]:opacity-80 [&_svg]:text-blue-950">
          <LanguageSwitcher variant="dark" />
        </div>

        {isAuthenticated && (
          <NotificationBell userType="member" variant="light" />
        )}

        {isAuthenticated ? (
          <UserMenu user={user} onLogout={handleLogout} />
        ) : (
          <div className="flex items-center gap-2">
            <button
              className="px-4 py-2 rounded-md cursor-pointer transition-all duration-200 font-medium text-sm text-white border border-blue-950 bg-blue-950 hover:text-white hover:border-blue-800 active:bg-blue-900"
              onClick={() => setShowLoginModal(true)}
            >
              {t('header.login', '로그인')}
            </button>
          </div>
        )}
      </div>

      {/* Login Modal */}
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
    </header>
  );
}

export default Header;
