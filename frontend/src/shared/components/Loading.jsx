/**
 * Loading Component
 */

import { cn } from '@shared/utils/helpers';

const sizeClasses = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8',
  lg: 'w-12 h-12'
};

export function Loading({ size = 'md', text = '로딩 중...', className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center p-8', className)}>
      <div className={cn(
        'border-4 border-gray-200 border-t-primary-600 rounded-full animate-spin',
        sizeClasses[size]
      )} />
      {text && (
        <p className="mt-4 text-sm text-gray-600">{text}</p>
      )}
    </div>
  );
}

export function LoadingOverlay({ text = '처리 중...' }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 shadow-xl">
        <Loading text={text} />
      </div>
    </div>
  );
}

