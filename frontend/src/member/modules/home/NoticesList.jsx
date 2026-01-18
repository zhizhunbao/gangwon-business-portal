/**
 * Notices List Page - Member Portal
 * 公告列表页面
 */

import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback } from 'react';
import { formatDateTime } from '@shared/utils';
import HomeList from '@shared/components/HomeList';
import { homeService } from '@shared/services';
import { BANNER_TYPES } from '@shared/utils/constants';

function NoticesList() {
  const { t, i18n } = useTranslation();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const loadNotices = useCallback(async () => {
    setLoading(true);
    setError(null);
    const response = await homeService.listNotices({
      page: currentPage,
      pageSize: pageSize
    });
    
    const noticesData = response.items || [];
    if (Array.isArray(noticesData)) {
      const formattedNotices = noticesData.map(n => ({
        id: n.id,
        title: n.title,
        date: n.createdAt ? formatDateTime(n.createdAt, 'yyyy-MM-dd HH:mm', i18n.language) : '',
        important: n.boardType === 'notice',
        attachments: n.attachments || []
      }));
      setNotices(formattedNotices);
      setTotalPages(response.totalPages || 0);
      setTotal(response.total || 0);
    } else {
      setNotices([]);
    }
    setLoading(false);
  }, [currentPage, i18n.language]);

  useEffect(() => {
    loadNotices();
  }, [loadNotices]);

  function handlePageChange(page) {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function getBadgeInfo(notice) {
    return {
      variant: notice.important ? 'danger' : 'gray',
      text: notice.important ? t('home.notices.important', '重要') : t('home.notices.normal', '一般')
    };
  }

  async function handleNoticeClick(noticeId) {
    setDetailLoading(true);
    const detail = await homeService.getNotice(noticeId);
    if (detail) {
      setSelectedNotice({
        id: detail.id,
        title: detail.title,
        contentHtml: detail.contentHtml || '',
        date: detail.createdAt,
        badge: {
          variant: detail.boardType === 'notice' ? 'danger' : 'gray',
          text: detail.boardType === 'notice' 
            ? t('home.notices.important', '重要') 
            : t('home.notices.normal', '一般')
        },
        viewCount: detail.viewCount || detail.view_count || 0,
        attachments: detail.attachments || []
      });
    }
    setDetailLoading(false);
  }

  function handleCloseModal() {
    setSelectedNotice(null);
  }

  return (
    <HomeList
      title={t('home.notices.title', '最新公告')}
      bannerType={BANNER_TYPES.MAIN_PRIMARY}
      items={notices}
      loading={loading}
      error={error}
      emptyMessage={t('home.notices.empty', '暂无公告')}
      onRetry={loadNotices}
      getBadgeInfo={getBadgeInfo}
      onItemClick={handleNoticeClick}
      selectedItem={selectedNotice}
      detailLoading={detailLoading}
      onCloseDetail={handleCloseModal}
      showModal={true}
      showPagination={true}
      currentPage={currentPage}
      totalPages={totalPages}
      total={total}
      pageSize={pageSize}
      onPageChange={handlePageChange}
    />
  );
}

export default NoticesList;
