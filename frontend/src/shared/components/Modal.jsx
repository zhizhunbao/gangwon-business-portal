/**
 * Modal Component
 */

import { useEffect } from 'react';
import { cn } from '@shared/utils/helpers';

export function Modal({ 
  isOpen, 
  onClose, 
  title,
  children, 
  size = 'md',
  showCloseButton = true,
  className 
}) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);
  
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);
  
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-lg',
    lg: 'sm:max-w-2xl',
    xl: 'sm:max-w-4xl',
    full: 'sm:max-w-full'
  };
  
  return (
    <div className="fixed inset-0 z-[1100] overflow-y-auto animate-fade-in">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity animate-fade-in"
          onClick={onClose}
        />
        
        {/* Center modal */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
        
        {/* Modal content */}
        <div className={cn(
          'relative bg-white rounded-lg shadow-xl w-full mx-auto',
          'inline-block align-bottom sm:my-8 sm:align-middle',
          'animate-slide-up',
          'md:max-w-full md:mx-0 md:rounded-none sm:rounded-lg',
          'md:m-0 md:min-h-screen md:max-h-screen md:flex md:flex-col',
          sizeClasses[size],
          className
        )}>
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0 md:px-4 md:py-3">
              {title && (
                <h3 className="text-lg font-medium text-gray-900 md:text-base">
                  {title}
                </h3>
              )}
              {showCloseButton && (
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-500"
                  onClick={onClose}
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          )}
          
          {/* Body */}
          <div className="px-6 py-4 md:px-4 md:py-4 md:flex-1 md:overflow-y-auto md:[scroll-behavior:smooth]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ModalFooter({ children, className }) {
  return (
    <div className={cn(
      'flex items-center justify-end space-x-3 mt-6',
      'md:flex-col-reverse md:gap-2 md:px-4 md:py-3 md:mt-0 md:flex-shrink-0 md:border-t md:border-gray-200',
      '[&>*]:md:w-full',
      className
    )}>
      {children}
    </div>
  );
}

