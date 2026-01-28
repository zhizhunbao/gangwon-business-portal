/**
 * Desktop Navigation
 * 桌面端主导航
 *
 * 遵循 dev-frontend_patterns skill 规范。
 */

import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";

/**
 * DesktopNav Component
 * @param {Object} props
 * @param {Array} props.menuItems - 菜单项配置
 * @param {Function} props.isMenuActive - 激活状态判断函数
 * @param {Function} props.onMenuClick - 点击回调
 */
export function DesktopNav({ menuItems, isMenuActive, onMenuClick }) {
  const { t } = useTranslation();

  return (
    <nav className="w-full" aria-label={t('header.mainNav', '주요 탐색')}>
      <ul className="flex items-center gap-1 list-none m-0 p-0 justify-center">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isMenuActive(item);

          return (
            <li key={item.key} className="flex-shrink-0">
              <NavLink
                to={item.path}
                end={item.exact}
                className={`flex items-center gap-2 px-5 py-2.5 text-blue-950 no-underline text-[0.9375rem] font-semibold whitespace-nowrap transition-all duration-200 relative border-b-[3px] max-lg:px-3.5 max-lg:py-2 ${
                  active
                    ? "border-blue-950 font-bold"
                    : "border-transparent hover:text-blue-600"
                }`}
                onClick={(e) => onMenuClick(e, item)}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="leading-5 max-lg:hidden">{item.label}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
