/**
 * Submenu Component - Generic Navigation Bar
 * 通用二级导航栏组件
 * 
 * 使用与 Header 相同的 flex 布局方式，自动对齐，无需动态计算宽度
 * 
 * @param {Object} props
 * @param {Array} props.items - 菜单项配置数组
 * @param {string} props.title - 左侧显示的标题（可选）
 * @param {string} props.className - 额外的 CSS 类名
 * @param {Function} props.renderLeft - 自定义左侧内容渲染函数（可选）
 * @param {Function} props.renderRight - 自定义右侧内容渲染函数（可选）
 */

import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { cn } from '@shared/utils/helpers';

export default function Submenu({
  items = [],
  title = '',
  className = '',
  renderLeft = null,
  renderRight = null
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentHash, setCurrentHash] = useState(() => window.location.hash.replace('#', ''));

  // 监听 hash 变化，更新激活状态
  useEffect(() => {
    const handleHashChange = () => {
      setCurrentHash(window.location.hash.replace('#', ''));
    };

    // 初始设置
    handleHashChange();

    // 监听 hash 变化
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // 如果没有菜单项，不渲染组件
  if (!items || items.length === 0) {
    return null;
  }

  // 获取当前激活的标题（如果有配置）
  const getActiveTitle = () => {
    if (!title && items.length > 0) {
      // 如果没有传入 title，尝试从激活项获取
      const defaultHash = items[0]?.hash || '';
      const activeHash = currentHash || defaultHash;
      const activeItem = items.find(item => 
        item.isTab && item.hash === activeHash
      );
      return activeItem ? activeItem.label : '';
    }
    return title;
  };

  const activeTitle = getActiveTitle();

  return (
    <nav className={cn(
      'relative w-full z-10 mt-0 mb-6 flex items-center justify-between',
      'min-h-[50px] bg-white border-b-2 border-gray-300 shadow-sm',
      'px-8 lg:px-6 md:px-4',
      className
    )}>
      <div className="flex items-center gap-4 flex-shrink-0 min-w-0">
        {renderLeft && renderLeft({ title: activeTitle })}
      </div>
      <div className="flex-1 flex justify-center items-center min-w-0 mx-8 lg:mx-6 md:mx-4">
        <ul className="flex items-center gap-1 list-none m-0 p-0 justify-center">
          {items.map((item) => {
            if (item.show === false) {
              return null;
            }

            // 如果提供了自定义渲染函数，使用它
            if (item.render) {
              return (
                <li key={item.key} className="flex-shrink-0">
                  {item.render({ item, location, currentHash, isActive: false })}
                </li>
              );
            }

            // 处理选项卡类型的菜单项（使用 hash 导航）
            if (item.isTab && item.hash) {
              const defaultHash = items[0]?.hash || '';
              const isActive = currentHash === item.hash || 
                (currentHash === '' && item.hash === defaultHash);
              
              const basePath = item.basePath || location.pathname;
              const hash = `#${item.hash}`;
              
              return (
                <li key={item.key} className="flex-shrink-0">
                  <a
                    href={`${basePath}${hash}`}
                    onClick={(e) => {
                      e.preventDefault();
                      // 如果提供了 onClick 回调，使用它（可能包含自定义逻辑）
                      if (item.onClick) {
                        item.onClick(item);
                      } else {
                        // 默认行为：更新 hash 而不触发页面跳转
                        window.location.hash = item.hash;
                        // 手动触发 hashchange 事件，确保组件能响应
                        window.dispatchEvent(new HashChangeEvent('hashchange'));
                        setCurrentHash(item.hash);
                      }
                    }}
                    className={cn(
                      'flex items-center gap-2 py-3.5 px-6 no-underline text-[0.9375rem] font-semibold whitespace-nowrap',
                      'transition-all duration-200 relative',
                      'text-gray-600 border-b-[3px] border-transparent',
                      'hover:font-semibold hover:text-[#004c97] hover:border-b-[#0066cc]',
                      'md:py-3 md:px-5 md:text-sm',
                      isActive && 'font-bold text-[#004c97] border-b-[#004c97]'
                    )}
                  >
                    <span className="leading-5">{item.label}</span>
                  </a>
                </li>
              );
            }

            // 处理路由类型的菜单项（使用 React Router 导航）
            if (item.path) {
              const isActive = item.exact 
                ? location.pathname === item.path
                : location.pathname.startsWith(item.path);
              
              return (
                <li key={item.key} className="flex-shrink-0">
                  <a
                    href={item.path}
                    onClick={(e) => {
                      e.preventDefault();
                      // 如果提供了自定义导航函数
                      if (item.onNavigate) {
                        item.onNavigate(item);
                      } else {
                        // 默认使用 React Router 导航
                        navigate(item.path);
                      }
                      // 如果提供了 onClick 回调
                      if (item.onClick) {
                        item.onClick(item);
                      }
                    }}
                    className={cn(
                      'flex items-center gap-2 py-3.5 px-6 no-underline text-[0.9375rem] font-semibold whitespace-nowrap',
                      'transition-all duration-200 relative',
                      'text-gray-600 border-b-[3px] border-transparent',
                      'hover:font-semibold hover:text-[#004c97] hover:border-b-[#0066cc]',
                      'md:py-3 md:px-5 md:text-sm',
                      isActive && 'font-bold text-[#004c97] border-b-[#004c97]'
                    )}
                  >
                    <span className="leading-5">{item.label}</span>
                  </a>
                </li>
              );
            }

            // 其他情况：渲染为普通链接
            return (
              <li key={item.key} className="flex-shrink-0">
                <a
                  href={item.href || '#'}
                  onClick={(e) => {
                    if (item.onClick) {
                      e.preventDefault();
                      item.onClick(item);
                    }
                  }}
                  className={cn(
                    'flex items-center gap-2 py-3.5 px-6 no-underline text-[0.9375rem] font-semibold whitespace-nowrap',
                    'transition-all duration-200 relative',
                    'text-gray-600 border-b-3 border-transparent',
                    'hover:font-semibold hover:text-[#004c97] hover:border-[#0066cc]',
                    'md:py-3 md:px-5 md:text-sm',
                    item.active && 'font-bold text-[#004c97] border-[#004c97]'
                  )}
                >
                  <span className="leading-5">{item.label}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0 justify-end min-w-0">
        {renderRight && renderRight()}
      </div>
    </nav>
  );
}

