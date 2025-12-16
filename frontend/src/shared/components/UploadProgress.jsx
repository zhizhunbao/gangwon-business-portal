/**
 * Upload Progress Component
 * 
 * Displays file upload progress with a progress bar
 */

import React from 'react';
import { cn } from '@shared/utils/helpers';

/**
 * UploadProgress component
 * @param {Object} props
 * @param {number} props.progress - Upload progress (0-100)
 * @param {string} props.fileName - Name of the file being uploaded
 * @param {boolean} props.show - Whether to show the component
 * @param {string} props.className - Additional CSS classes
 */
export default function UploadProgress({ 
  progress = 0, 
  fileName = '', 
  show = true,
  className = '' 
}) {
  if (!show) return null;

  return (
    <div className={cn(
      'w-full p-3 bg-gray-100 dark:bg-gray-800 rounded-lg my-2',
      className
    )}>
      {fileName && (
        <div className="text-sm text-gray-800 dark:text-gray-200 mb-2 overflow-hidden text-ellipsis whitespace-nowrap">
          {fileName}
        </div>
      )}
      <div className="w-full h-2 bg-gray-300 dark:bg-gray-600 rounded overflow-hidden mb-1">
        <div 
          className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-300 ease-in-out rounded"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
      <div className="text-xs text-gray-600 dark:text-gray-400 text-right">
        {Math.round(progress)}%
      </div>
    </div>
  );
}

