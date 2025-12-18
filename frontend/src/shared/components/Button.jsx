/**
 * Button Component
 */

import { cn } from '@shared/utils/helpers';

const variantStyles = {
  primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500',
  secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
  success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  outline: 'bg-transparent border-2 border-primary-600 text-primary-600 hover:bg-primary-50 focus:ring-primary-500'
};

const sizeStyles = {
  small: 'px-3 py-1.5 text-sm',
  sm: 'px-3 py-1.5 text-sm',
  medium: 'px-4 py-2 text-base',
  md: 'px-4 py-2 text-base',
  large: 'px-6 py-3 text-lg',
  lg: 'px-6 py-3 text-lg'
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className,
  ...props
}) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-md transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="border-2 border-gray-200 border-t-primary-600 rounded-full animate-spin w-4 h-4 mr-2" />
      )}
      {children}
    </button>
  );
}

export default Button;

