/**
 * Notices Preview Component - Member Portal
 * 公告预览组件 - 显示最近4条公告
 */

import './NoticesPreview.css';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Card from '@shared/components/Card';
import { contentService } from '@shared/services';
import { ROUTES } from '@shared/utils/constants';

function NoticesPreview() {
  const { t, i18n } = useTranslation();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadNotices = useCallback(async () => {
    setLoading(true);
    try {
      // 使用 contentService 获取最新5条公告，然后取前4条
      const noticesData = await contentService.getLatestNotices();
      
      if (Array.isArray(noticesData) && noticesData.length > 0) {
        const formattedNotices = noticesData.slice(0, 4).map(n => ({
          id: n.id,
          title: n.title,
          date: n.createdAt ? new Date(n.createdAt).toISOString().split('T')[0] : '',
          important: n.boardType === 'notice' // 可以根据需要调整判断逻辑
        }));
        setNotices(formattedNotices);
      } else {
        setNotices([]);
      }
    } catch (error) {
      console.error('Failed to load notices:', error);
      setNotices([]);
    } finally {
      setLoading(false);
    }
  }, [i18n.language]);

  useEffect(() => {
    loadNotices();
  }, [loadNotices]);

  return (
    <section className="notices-section">
      <div className="section-header">
        <h2>{t('home.notices.title', '最新公告')}</h2>
        <Link to={ROUTES.MEMBER_NOTICES} className="view-all">
          {t('common.viewAll', '查看全部')}
        </Link>
      </div>

      {loading ? (
        <div className="loading-state">
          <p>{t('common.loading', '加载中...')}</p>
        </div>
      ) : notices.length > 0 ? (
        <div className="notices-grid">
          {notices.map((notice) => (
            <Card key={notice.id} className="notice-card">
              <div className="notice-card-link">
                <div className="notice-card-header">
                  {notice.important && (
                    <span className="badge badge-danger">
                      {t('home.notices.important', '重要')}
                    </span>
                  )}
                  <span className="notice-card-date">{notice.date}</span>
                </div>
                <h3 className="notice-card-title">{notice.title}</h3>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="empty-state">
          <p className="notice-card-empty">
            {t('home.notices.empty', '暂无公告')}
          </p>
        </Card>
      )}
    </section>
  );
}

export default NoticesPreview;

