/**
 * Mobile Navigation Menu
 * 移动端导航菜单组件
 *
 * 遵循 dev-frontend_patterns skill 规范。
 */

import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { HOVER_STYLES } from "../../enum";
import { useMobileMenu } from "../../hooks/useMobileMenu";

/**
 * MobileMenu Component
 * @param {Object} props
 * @param {boolean} props.isOpen - 菜单是否打开
 * @param {Function} props.onClose - 关闭回调
 * @param {Array} props.menuItems - 菜单项配置列表
 * @param {Function} props.isMenuActive - 判断菜单项是否激活的函数
 * @param {Function} props.onMenuClick - 菜单项点击回调
 */
export function MobileMenu({
  isOpen,
  onClose,
  menuItems,
  isMenuActive,
  onMenuClick,
}) {
  const { t } = useTranslation();
  const { menuRef } = useMobileMenu({ isOpen, onClose });

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[999] md:hidden animate-[fadeIn_0.2s_ease-out]"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Slide-out Menu */}
      <nav
        ref={menuRef}
        className={`fixed top-[60px] left-0 right-0 bg-white shadow-lg z-[1000] transition-transform duration-300 ease-in-out md:hidden max-h-[calc(100vh-60px)] overflow-y-auto ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label={t('header.mobileMenuLabel', '모바일 내비게이션')}
      >
        <ul className="list-none m-0 p-0">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isMenuActive(item);

            return (
              <li
                key={item.key}
                className="border-b border-gray-200 last:border-b-0"
              >
                <NavLink
                  to={item.path}
                  end={item.exact}
                  className={`flex items-center gap-3 px-6 py-4 no-underline transition-colors duration-200 ${
                    active
                      ? "bg-primary-50 text-primary-700 font-semibold border-l-4 border-primary-600"
                      : `text-gray-900 ${HOVER_STYLES.light}`
                  }`}
                  onClick={(e) => {
                    onMenuClick(e, item);
                    onClose();
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
    </>
  );
}
