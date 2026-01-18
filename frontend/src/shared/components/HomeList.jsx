/**
 * HomeList Component
 * 首页列表组件 - 用于展示公告、项目等内容的网格列表
 */

import { useTranslation } from 'react-i18next';
import { Badge, Banner, Modal, HomeCard, Card, Pagination } from '@shared/components';
import { DocumentIcon } from '@shared/components/Icons';
import { PageContainer } from '@member/layouts';
import { formatDateTime } from '@shared/utils';

function HomeList({
  title,
  bannerType,
  items = [],
  loading = false,
  error = null,
  emptyMessage,
  onRetry,
  getBadgeInfo,
  onItemClick,
  selectedItem = null,
  detailLoading = false,
  onCloseDetail,
  showModal = false,
  // 分页相关
  showPagination = false,
  currentPage = 1,
  totalPages = 0,
  total = 0,
  pageSize = 20,
  onPageChange
}) {
  const { t, i18n } = useTranslation();

  return (
    <div className="content-list w-full flex flex-col">
      <Banner
        bannerType={bannerType}
        sectionClassName="mb-16"
        height="400px"
        fullWidth={true}
      />
      <PageContainer className="pb-8" fullWidth={false}>
        <div className="w-full">
          <div className="mb-6 sm:mb-8 lg:mb-10 min-h-[48px] flex items-center">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 m-0">
              {title}
            </h1>
          </div>

          {loading && items.length === 0 ? (
            <div className="text-center py-12 px-8">
              <p className="text-base text-gray-500 m-0">{t('common.loading', '加载中...')}</p>
            </div>
          ) : error ? (
            <Card className="text-center py-12 px-8 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-base text-red-600 mb-4 m-0">{error}</p>
              {onRetry && (
                <button 
                  className="px-6 py-2 bg-red-600 text-white border-none rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-red-700" 
                  onClick={onRetry}
                >
                  {t('common.retry', '重试')}
                </button>
              )}
            </Card>
          ) : items.length > 0 ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] max-md:grid-cols-2 max-sm:grid-cols-1 gap-5 max-md:gap-4">
              {items.map((item) => {
                const badgeInfo = getBadgeInfo ? getBadgeInfo(item) : null;
                const handleClick = onItemClick ? () => {
                  onItemClick(item.id);
                } : undefined;
                
                return (
                  <HomeCard
                    key={item.id}
                    title={item.title}
                    badge={badgeInfo}
                    date={item.date || '-'}
                    attachments={item.attachments}
                    onClick={handleClick}
                    size="medium"
                    className="h-full hover:-translate-y-1"
                  />
                );
              })}
            </div>
          ) : (
            <Card className="text-center py-12 px-8">
              <p className="text-base text-gray-500 m-0">
                {emptyMessage || t('common.noData', '暂无数据')}
              </p>
            </Card>
          )}

          {/* 分页 */}
          {showPagination && totalPages > 1 && (
            <div className="mt-8 flex justify-center">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={onPageChange}
              />
            </div>
          )}

          {/* 详情模态框 */}
          {showModal && (
            <Modal
              isOpen={!!selectedItem || detailLoading}
              onClose={onCloseDetail}
              title={selectedItem?.title || t('common.loading', '加载中...')}
              size="lg"
            >
              {detailLoading ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">{t('common.loading', '加载中...')}</p>
                </div>
              ) : selectedItem ? (
                <div className="space-y-4">
                  {/* 项目封面图片 */}
                  {selectedItem.imageUrl && (
                    <div className="w-full rounded-lg overflow-hidden">
                      <img 
                        src={selectedItem.imageUrl} 
                        alt={selectedItem.title}
                        className="w-full h-auto object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3 text-sm text-gray-500 border-b pb-3">
                    {selectedItem.badge && (
                      <Badge variant={selectedItem.badge.variant}>
                        {selectedItem.badge.text}
                      </Badge>
                    )}
                    {selectedItem.date && (
                      <span>{formatDateTime(selectedItem.date, 'yyyy-MM-dd HH:mm', i18n.language)}</span>
                    )}
                    {selectedItem.viewCount !== undefined && (
                      <span>{t('admin.content.notices.views', '浏览')}: {selectedItem.viewCount}</span>
                    )}
                  </div>
                  
                  {selectedItem.contentHtml && (
                    <div 
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: selectedItem.contentHtml }}
                    />
                  )}
                  
                  {/* 附件列表 */}
                  {selectedItem.attachments && selectedItem.attachments.length > 0 && (
                    <div className="border-t pt-4 mt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">
                        {t('fileAttachments.attachments', '附件')} ({selectedItem.attachments.length})
                      </h4>
                      <div className="space-y-2">
                        {(() => {
                          const fileNameCounts = {};
                          const fileNameIndices = {};
                          
                          selectedItem.attachments.forEach((attachment) => {
                            const fileName = attachment.originalName || 'Unknown';
                            fileNameCounts[fileName] = (fileNameCounts[fileName] || 0) + 1;
                          });
                          
                          return selectedItem.attachments.map((attachment, index) => {
                            const fileName = attachment.originalName || 'Unknown';
                            
                            let displayName = fileName;
                            if (fileNameCounts[fileName] > 1) {
                              fileNameIndices[fileName] = (fileNameIndices[fileName] || 0) + 1;
                              displayName = `${fileName} (${fileNameIndices[fileName]})`;
                            }
                            
                            const handleDownloadClick = () => {
                              const url = attachment.fileUrl;
                              const fileName = attachment.originalName || 'download';
                              
                              if (!url) {
                                console.error('No file URL found for attachment:', attachment);
                                return;
                              }

                              const link = document.createElement('a');
                              link.href = url;
                              link.download = fileName;
                              link.target = '_blank';
                              link.rel = 'noopener noreferrer';
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            };
                            
                            return (
                              <button
                                key={index}
                                type="button"
                                onClick={handleDownloadClick}
                                className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-blue-50 rounded-lg transition-colors text-left group"
                              >
                                <DocumentIcon className="w-5 h-5 text-gray-400 group-hover:text-blue-600 flex-shrink-0" />
                                <span className="flex-1 text-sm text-gray-700 group-hover:text-blue-600 truncate">
                                  {displayName}
                                </span>
                                <span className="text-xs text-gray-500 group-hover:text-blue-600">
                                  {t('common.download', '下载')}
                                </span>
                              </button>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </Modal>
          )}
        </div>
      </PageContainer>
    </div>
  );
}

export default HomeList;
