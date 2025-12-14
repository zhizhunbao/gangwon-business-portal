/**
 * PageContainer Component
 * 页面容器组件 - 统一控制页面的边距和最大宽度
 */

import { cn } from '@shared/utils/helpers';

const sizeClasses = {
  default: 'max-w-[1400px] px-4 py-4 pb-[4.5rem] sm:px-6 lg:px-8',
  large: 'max-w-[1600px] px-4 py-4 pb-[4.5rem] sm:px-6 lg:px-8',
  small: 'max-w-[1200px] px-6 py-6 pb-[4.5rem] sm:px-8',
};

/**
 * PageContainer - 页面容器组件
 * @param {Object} props
 * @param {React.ReactNode} props.children - 子元素
 * @param {string} props.className - 额外的CSS类名
 * @param {string} props.size - 容器大小 'default' | 'large' | 'small'
 * @param {boolean} props.fullWidth - 是否全宽度（不限制最大宽度）
 */
export function PageContainer({ 
  children, 
  className,
  size = 'default',
  fullWidth = false,
  ...props 
}) {
  return (
    <div
      className={cn(
        'w-full mx-auto box-border min-w-0',
        fullWidth ? 'max-w-full' : sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export default PageContainer;

