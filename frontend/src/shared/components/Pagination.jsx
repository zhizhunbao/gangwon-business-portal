/**
 * Pagination Component
 */

import { useTranslation } from 'react-i18next';
import { cn } from '@shared/utils/helpers';

export function Pagination({ 
  currentPage: currentPageProp, 
  current,
  totalPages: totalPagesProp,
  total,
  pageSize,
  onPageChange,
  onChange,
  className 
}) {
  const { t } = useTranslation();
  // Support both prop naming conventions
  const currentPage = currentPageProp ?? current ?? 1;
  const onPageChangeHandler = onPageChange ?? onChange;
  
  // Calculate totalPages from total and pageSize if needed
  let totalPages = totalPagesProp;
  if (totalPages === undefined && total !== undefined && pageSize !== undefined) {
    totalPages = Math.ceil(total / pageSize);
  }
  
  // Ensure totalPages is a valid number
  if (!Number.isFinite(totalPages) || totalPages < 1) {
    totalPages = 1;
  }
  
  // Ensure currentPage is valid
  const validCurrentPage = Number.isFinite(currentPage) && currentPage >= 1 
    ? Math.min(currentPage, totalPages) 
    : 1;
  
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (validCurrentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (validCurrentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(validCurrentPage - 1);
        pages.push(validCurrentPage);
        pages.push(validCurrentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };
  
  const handlePrevious = () => {
    if (validCurrentPage > 1 && onPageChangeHandler) {
      onPageChangeHandler(validCurrentPage - 1);
    }
  };
  
  const handleNext = () => {
    if (validCurrentPage < totalPages && onPageChangeHandler) {
      onPageChangeHandler(validCurrentPage + 1);
    }
  };
  
  return (
    <nav className={cn(
      'flex items-center justify-center flex-wrap gap-2',
      'md:gap-1',
      className
    )}>
      <button
        onClick={handlePrevious}
        disabled={validCurrentPage === 1}
        className={cn(
          'px-3 py-2 text-sm font-medium border rounded-md',
          'min-w-[44px] min-h-[44px]',
          'flex items-center justify-center',
          'transition-all duration-200',
          'md:px-2 md:text-xs md:min-w-[40px] md:min-h-[40px]',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'text-gray-700 bg-white border-gray-300 hover:bg-gray-50'
        )}
      >
        {t('common.previous', '이전')}
      </button>
      
      {getPageNumbers().map((page, index) => {
        // Ensure page is a valid number for key
        const pageKey = typeof page === 'number' && Number.isFinite(page) 
          ? `page-${page}` 
          : `ellipsis-${index}`;
        
        return page === '...' ? (
          <span
            key={pageKey}
            className={cn(
              'px-3 py-2 text-gray-500',
              'min-w-[44px] min-h-[44px]',
              'flex items-center justify-center',
              'md:px-2 md:text-xs md:min-w-[32px] md:min-h-[32px]',
              'hidden sm:flex'
            )}
          >
            ...
          </span>
        ) : (
          <button
            key={pageKey}
            onClick={() => onPageChangeHandler && onPageChangeHandler(page)}
            className={cn(
              'px-4 py-2 text-sm font-medium border rounded-md',
              'min-w-[44px] min-h-[44px]',
              'flex items-center justify-center',
              'transition-all duration-200',
              'md:px-3 md:text-xs md:min-w-[40px] md:min-h-[40px]',
              validCurrentPage === page
                ? 'bg-primary-600 text-white border-primary-600'
                : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50 hidden sm:flex',
              validCurrentPage === page && 'flex'
            )}
          >
            {page}
          </button>
        );
      })}
      
      <button
        onClick={handleNext}
        disabled={validCurrentPage === totalPages}
        className={cn(
          'px-3 py-2 text-sm font-medium border rounded-md',
          'min-w-[44px] min-h-[44px]',
          'flex items-center justify-center',
          'transition-all duration-200',
          'md:px-2 md:text-xs md:min-w-[40px] md:min-h-[40px]',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'text-gray-700 bg-white border-gray-300 hover:bg-gray-50'
        )}
      >
        {t('common.next', '다음')}
      </button>
    </nav>
  );
}

export default Pagination;
