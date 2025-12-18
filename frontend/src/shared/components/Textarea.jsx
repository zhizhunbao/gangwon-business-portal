/**
 * Textarea Component
 */

import { forwardRef } from 'react';
import { cn } from '@shared/utils/helpers';

export const Textarea = forwardRef(function Textarea({
  label,
  error,
  help,
  required,
  inline = false,
  rows = 4,
  className,
  ...props
}, ref) {
  const textareaEl = (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        'px-3 py-2 border rounded-md shadow-sm',
        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
        'transition-colors duration-200',
        inline ? 'inline-block w-auto' : 'w-full',
        error
          ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
          : 'border-gray-300',
        className
      )}
      {...props}
    />
  );

  if (inline) {
    return (
      <>
        {textareaEl}
        {error && (
          <p className="mt-1.5 text-sm text-red-600">{error}</p>
        )}
        {help && !error && (
          <p className="mt-1.5 text-sm text-gray-500">{help}</p>
        )}
      </>
    );
  }

  return (
    <div className="mb-4">
      {label && (
        <label className={cn(
          'block text-sm font-medium text-gray-700 mb-1.5',
          required && 'after:content-["*"] after:text-red-500 after:ml-1'
        )}>
          {label}
        </label>
      )}
      {textareaEl}
      {error && (
        <p className="mt-1.5 text-sm text-red-600">{error}</p>
      )}
      {help && !error && (
        <p className="mt-1.5 text-sm text-gray-500">{help}</p>
      )}
    </div>
  );
});

export default Textarea;

