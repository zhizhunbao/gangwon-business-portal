/**
 * User Dropdown Menu
 * 用户下拉菜单组件
 *
 * 遵循 dev-frontend_patterns skill 规范。
 */

import { Link } from "react-router-dom";
import { useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  UserIcon,
  LogoutIcon,
  ChevronDownIcon,
  SupportIcon,
} from "@shared/components";
import { HOVER_STYLES, UI_STYLES } from "../../enum";

import { UserAvatar } from "./UserAvatar";

/**
 * UserMenu Component
 * @param {Object} props
 * @param {Object} props.user - 用户信息对象
 * @param {Function} props.onLogout - 登出回调
 */
export function UserMenu({ user, onLogout }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogoutClick = () => {
    setIsOpen(false);
    onLogout();
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
      <button
        className="flex items-center gap-2.5 bg-transparent border-none cursor-pointer py-2 px-3.5 transition-all duration-200 rounded hover:text-blue-600 active:scale-[0.98]"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <UserAvatar user={user} />

        <span className="text-[0.9375rem] font-semibold text-blue-950 max-w-[150px] overflow-hidden truncate whitespace-nowrap max-md:hidden">
          {user?.companyName || user?.name || t("common.appName")}
        </span>

        <ChevronDownIcon
          className={`w-4 h-4 text-blue-950 transition-all duration-200 flex-shrink-0 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Content */}
      {isOpen && (
        <div className="absolute top-[calc(100%+0.5rem)] right-0 bg-white border-2 border-gray-200 rounded-md shadow-lg min-w-[260px] z-[1001] overflow-hidden animate-[slideDown_0.2s_ease-out] max-md:-right-4 max-md:min-w-[240px]">
          {/* User Info Header */}
          <div className="p-5 flex items-center gap-3.5 border-b border-gray-100 bg-blue-50">
            <UserAvatar user={user} size="large" />
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

          {/* Menu Items */}
          <Link
            to="/member/performance/company-info"
            className={`flex items-center gap-3.5 py-3.5 px-5 text-gray-900 no-underline bg-transparent w-full text-left cursor-pointer text-[0.9375rem] font-medium transition-all duration-200 border-l-[3px] border-transparent hover:pl-[1.125rem] ${HOVER_STYLES.lightBorder}`}
            onClick={() => setIsOpen(false)}
          >
            <UserIcon className="w-[1.125rem] h-[1.125rem] flex-shrink-0" />
            <span>{t('header.profile', '기업 정보')}</span>
          </Link>

          <Link
            to="/member/support"
            className={`flex items-center gap-3.5 py-3.5 px-5 text-gray-900 no-underline bg-transparent w-full text-left cursor-pointer text-[0.9375rem] font-medium transition-all duration-200 border-l-[3px] border-transparent hover:pl-[1.125rem] ${HOVER_STYLES.lightBorder}`}
            onClick={() => setIsOpen(false)}
          >
            <SupportIcon className="w-[1.125rem] h-[1.125rem] flex-shrink-0" />
            <span>{t('header.support', '고객 지원')}</span>
          </Link>

          <div className="h-px my-2 mx-5 bg-gray-100" />

          {/* Logout Button */}
          <button
            className={`flex items-center gap-3.5 py-3.5 px-5 text-red-600 no-underline bg-transparent border-none w-full text-left cursor-pointer text-[0.9375rem] font-medium transition-all duration-200 border-l-[3px] border-transparent hover:pl-[1.125rem] ${HOVER_STYLES.danger}`}
            onClick={handleLogoutClick}
          >
            <LogoutIcon className="w-[1.125rem] h-[1.125rem] flex-shrink-0" />
            <span>{t('header.logout', '로그아웃')}</span>
          </button>
        </div>
      )}
    </div>
  );
}
