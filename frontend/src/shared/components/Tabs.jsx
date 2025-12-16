/**
 * Tabs Component
 * 标签页组件
 */

import { cn } from '@shared/utils/helpers';

export function Tabs({ tabs, activeTab, onChange, className, ...props }) {
  return (
    <div
      className={cn(
        'border-b border-gray-300 overflow-x-auto',
        '[&::-webkit-scrollbar]:hidden',
        '[-ms-overflow-style:none]',
        '[scrollbar-width:none]',
        'md:-mx-4 md:px-4',
        className
      )}
      style={{ WebkitOverflowScrolling: 'touch' }}
      {...props}
    >
      <div className="flex gap-0 min-w-max">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={cn(
              'py-4 px-6 bg-transparent border-none cursor-pointer text-[0.9375rem]',
              'transition-all duration-200 relative',
              'border-b-2 border-transparent',
              'text-gray-600 -bottom-px',
              'whitespace-nowrap min-w-[44px] min-h-[44px]',
              'flex items-center justify-center flex-shrink-0',
              'hover:text-gray-800 hover:bg-gray-50',
              'md:py-3 md:px-4 md:text-sm',
              activeTab === tab.key && [
                'font-medium text-primary-600',
                'border-b-2 border-primary-600'
              ]
            )}
            onClick={() => onChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

