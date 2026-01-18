/**
 * Notices Preview Component - Member Portal
 * 公告预览组件 - 显示最近4条公告
 */

import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { formatDate } from '@shared/utils';
import HomePreview from '@shared/components/HomePreview';
import { homeService } from '@shared/services';
import { ROUTES } from '@shared/utils/constants';

function NoticesPreview() {
  const { t, i18n } = useTranslation();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  async function loadNotices() {
    setLoading(true);
    const noticesData = await homeService.getLatestNotices();
    
    if (Array.isArray(noticesData) && noticesData.length > 0) {
      const formattedNotices = noticesData.slice(0, 4).map(n => ({
        id: n.id,
        title: n.title,
        date: n.createdAt ? formatDate(n.createdAt) : '',
        important: n.boardType === 'notice',
        attachments: n.attachments || []
      }));
      setNotices(formattedNotices);
    } else {
      setNotices([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadNotices();
  }, []);

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
    <HomePreview
      title={t('home.notices.title', '最新公告')}
      viewAllLink={ROUTES.MEMBER_NOTICES}
      items={notices}
      loading={loading}
      emptyMessage={t('home.notices.empty', '暂无公告')}
      onItemClick={handleNoticeClick}
      getBadgeInfo={getBadgeInfo}
      showModal={true}
      selectedItem={selectedNotice}
      onCloseModal={handleCloseModal}
    />
  );
}

export default NoticesPreview;

