/**
 * HomeCard Component
 * 首页内容卡片组件 - 用于公告、项目等内容展示
 */

import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Badge, Card } from '@shared/components';

export function HomeCard({
  title,
  badge,
  date,
  attachments = [],
  onClick,
  size = 'medium',
  className = ''
}) {
  const { t } = useTranslation();
  const [showAttachmentsMenu, setShowAttachmentsMenu] = useState(false);

  useEffect(() => {
    function handleClickOutside(event) {
      if (showAttachmentsMenu && !event.target.closest('.attachments-menu-container')) {
        setShowAttachmentsMenu(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAttachmentsMenu]);

  const toggleAttachmentsMenu = (e) => {
    e.stopPropagation();
    setShowAttachmentsMenu(!showAttachmentsMenu);
  };

  const handleDownload = async (attachment, e) => {
    e.stopPropagation();
    
    const url = attachment.fileUrl;
    const fileName = attachment.originalName || 'download';
    
    if (!url) {
      console.error('No file URL found for attachment:', attachment);
      return;
    }

    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed:', error);
      // 如果 fetch 失败，回退到直接打开
      window.open(url, '_blank');
    }
  };

  // 尺寸配置
  const sizeConfig = {
    small: {
      padding: 'p-4',
      titleSize: 'text-sm font-medium',
      dateSize: 'text-xs'
    },
    medium: {
      padding: 'p-5',
      titleSize: 'text-base font-semibold',
      dateSize: 'text-xs'
    }
  };

  const config = sizeConfig[size] || sizeConfig.medium;

  return (
    <Card 
      className={`flex-shrink-0 transition-all duration-200 overflow-visible ${onClick ? 'cursor-pointer hover:shadow-md' : ''} ${className}`}
      onClick={(e) => {
        if (onClick) {
          onClick(e);
        }
      }}
    >
      <div className={`flex flex-col ${config.padding} relative overflow-visible`}>
        <div className="flex items-center justify-between mb-3 gap-2">
          {badge && badge.text && (
            <Badge variant={badge.variant}>
              {badge.text}
            </Badge>
          )}
          <span className={`${config.dateSize} text-gray-400 whitespace-nowrap flex-shrink-0`}>
            {date}
          </span>
        </div>
        
        <h3 className={`${config.titleSize} text-gray-900 m-0 leading-normal flex-1 line-clamp-2 pr-8`}>
          {title}
        </h3>
        
        {/* 附件显示 */}
        {attachments && attachments.length > 0 && (
          <div className="absolute bottom-3 right-3 attachments-menu-container z-50">
            <button
              type="button"
              onClick={toggleAttachmentsMenu}
              className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 px-1.5 py-0.5 rounded transition-colors"
              title={`${attachments.length} ${t('fileAttachments.attachments', '个附件')}`}
            >
              <span className="text-[11px]">
                {t('fileAttachments.attachments', '附件')} ({attachments.length})
              </span>
            </button>
            
            {/* 附件下拉菜单 */}
            {showAttachmentsMenu && (
              <div className="absolute bottom-full right-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[200px] max-w-[280px] z-50">
                <div className="px-3 py-1.5 text-xs font-medium text-gray-500 border-b border-gray-100">
                  {t('fileAttachments.attachments', '附件')} ({attachments.length})
                </div>
                <div className="max-h-[240px] overflow-y-auto scrollbar-thin">
                  {(() => {
                    const fileNameCounts = {};
                    const fileNameIndices = {};
                    
                    attachments.forEach((attachment) => {
                      const fileName = attachment.originalName || 'Unknown';
                      fileNameCounts[fileName] = (fileNameCounts[fileName] || 0) + 1;
                    });
                    
                    return attachments.map((attachment, index) => {
                      const fileName = attachment.originalName || 'Unknown';
                      
                      let displayName = fileName;
                      if (fileNameCounts[fileName] > 1) {
                        fileNameIndices[fileName] = (fileNameIndices[fileName] || 0) + 1;
                        displayName = `${fileName} (${fileNameIndices[fileName]})`;
                      }
                      
                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={(e) => {
                            handleDownload(attachment, e);
                            setShowAttachmentsMenu(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-blue-50 transition-colors text-left"
                        >
                          <span className="truncate flex-1">{displayName}</span>
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
