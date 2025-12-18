/**
 * FormRow Component
 * 用于在同一行中对齐：label / 输入框 / 下拉框 / 按钮 / 说明文字
 */

import { cn } from '@shared/utils/helpers';

export function FormRow({
  label,
  required = false,
  help,
  error,
  labelWidthClassName = 'w-32',
  className,
  labelClassName,
  contentClassName,
  children
}) {
  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-2 sm:gap-4 items-start', className)}>
      <div className={cn('pt-1.5', labelWidthClassName)}>
        {label && (
          <div
            className={cn(
              'text-sm font-medium text-gray-700',
              required && 'after:content-["*"] after:text-red-500 after:ml-1',
              labelClassName
            )}
          >
            {label}
          </div>
        )}
      </div>
      <div className={cn('min-w-0', contentClassName)}>
        <div className="flex flex-wrap items-center gap-2">
          {children}
        </div>
        {error && (
          <p className="mt-1.5 text-sm text-red-600">{error}</p>
        )}
        {help && !error && (
          <p className="mt-1.5 text-sm text-gray-500">{help}</p>
        )}
      </div>
    </div>
  );
}

export default FormRow;


