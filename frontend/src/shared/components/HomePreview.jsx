/**
 * HomePreview Component
 * 首页预览组件 - 用于首页展示公告、项目等内容列表
 */

import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Card, HomeCard, Modal, Badge } from "@shared/components";
import { DocumentIcon } from "@shared/components/Icons";
import { formatDate, formatDateTime } from "@shared/utils";

function HomePreview({
  title,
  viewAllLink,
  items = [],
  loading = false,
  emptyMessage,
  onItemClick,
  getBadgeInfo,
  showModal = false,
  selectedItem = null,
  onCloseModal,
}) {
  const { t, i18n } = useTranslation();

  return (
    <section className="content-preview-section w-full flex-1 flex flex-col bg-white rounded-lg shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6 flex-shrink-0 max-md:flex-col max-md:items-start max-md:gap-2">
        <h2 className="text-2xl font-semibold text-gray-900 m-0">{title}</h2>
        {viewAllLink && (
          <Link
            to={viewAllLink}
            className="text-blue-600 no-underline text-sm font-medium transition-colors hover:text-blue-500 hover:underline"
          >
            {t('common.viewAll', '전체 보기')}
          </Link>
        )}
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-500">
          <p>{t('common.loading', '로딩 중...')}</p>
        </div>
      ) : items.length > 0 ? (
        <div className="flex flex-col gap-3 flex-1 overflow-visible">
          {items.map((item) => {
            const badgeInfo = getBadgeInfo ? getBadgeInfo(item) : null;

            return (
              <HomeCard
                key={item.id}
                title={item.title}
                badge={badgeInfo}
                date={item.date}
                attachments={item.attachments}
                onClick={onItemClick ? () => onItemClick(item.id) : undefined}
                size="small"
              />
            );
          })}
        </div>
      ) : (
        <Card className="p-8 text-center text-gray-500">
          <p className="text-sm text-gray-500 m-0 text-center p-4">
            {emptyMessage || t('common.noData', '데이터가 없습니다')}
          </p>
        </Card>
      )}

      {/* 详情模态框 */}
      {showModal && (
        <Modal
          isOpen={!!selectedItem}
          onClose={onCloseModal}
          title={selectedItem?.title || t('common.loading', '로딩 중...')}
          size="lg"
        >
          {selectedItem ? (
            <div className="space-y-4">
              {/* 项目封面图片 */}
              {selectedItem.imageUrl && (
                <div className="w-full rounded-lg overflow-hidden">
                  <img
                    src={selectedItem.imageUrl}
                    alt={selectedItem.title}
                    className="w-full h-auto object-cover"
                    onError={(e) => {
                      e.target.style.display = "none";
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
                  <span>
                    {formatDateTime(
                      selectedItem.date,
                      "yyyy-MM-dd HH:mm",
                      i18n.language,
                    )}
                  </span>
                )}
                {selectedItem.viewCount !== undefined && (
                  <span>
                    {t("admin.content.notices.views", "조회")}:{" "}
                    {selectedItem.viewCount}
                  </span>
                )}
              </div>

              {selectedItem.contentHtml && (
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedItem.contentHtml }}
                />
              )}

              {/* 附件列表 */}
              {selectedItem.attachments &&
                selectedItem.attachments.length > 0 && (
                  <div className="border-t pt-4 mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">
                      {t('fileAttachments.attachments', '첨부파일')} (
                      {selectedItem.attachments.length})
                    </h4>
                    <div className="space-y-2">
                      {(() => {
                        const fileNameCounts = {};
                        const fileNameIndices = {};

                        selectedItem.attachments.forEach((attachment) => {
                          const fileName = attachment.fileName || "Unknown";
                          fileNameCounts[fileName] =
                            (fileNameCounts[fileName] || 0) + 1;
                        });

                        return selectedItem.attachments.map(
                          (attachment, index) => {
                            const fileName = attachment.fileName || "Unknown";

                            let displayName = fileName;
                            if (fileNameCounts[fileName] > 1) {
                              fileNameIndices[fileName] =
                                (fileNameIndices[fileName] || 0) + 1;
                              displayName = `${fileName} (${fileNameIndices[fileName]})`;
                            }

                            const handleDownloadClick = () => {
                              const url = attachment.fileUrl;
                              const fileName =
                                attachment.fileName || "download";

                              if (!url) {
                                console.error(
                                  "No file URL found for attachment:",
                                  attachment,
                                );
                                return;
                              }

                              const link = document.createElement("a");
                              link.href = url;
                              link.download = fileName;
                              link.target = "_blank";
                              link.rel = "noopener noreferrer";
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
                                  {t('common.download', '다운로드')}
                                </span>
                              </button>
                            );
                          },
                        );
                      })()}
                    </div>
                  </div>
                )}
            </div>
          ) : null}
        </Modal>
      )}
    </section>
  );
}

export default HomePreview;
