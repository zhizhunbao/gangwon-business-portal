import './PressPreview.css';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Card from '@shared/components/Card';
import LazyImage from '@shared/components/LazyImage';
import { contentService } from '@shared/services';
import { ROUTES } from '@shared/utils/constants';

function PressPreview() {
  const { t, i18n } = useTranslation();
  const [news, setNews] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadNews = useCallback(async () => {
    setLoading(true);
    try {
      // 使用 contentService 获取最新1条新闻稿
      const newsItem = await contentService.getLatestPressRelease();
      
      if (newsItem) {
        setNews({
          id: newsItem.id,
          title: newsItem.title,
          thumbnailUrl: newsItem.imageUrl, // 后端返回的是 imageUrl
          publishedAt: newsItem.createdAt ? new Date(newsItem.createdAt).toISOString().split('T')[0] : ''
        });
      } else {
        setNews(null);
      }
    } catch (error) {
      console.error('Failed to load news:', error);
      setNews(null);
    } finally {
      setLoading(false);
    }
  }, [i18n.language]);

  useEffect(() => {
    loadNews();
  }, [loadNews]);

  return (
    <section className="news-section">
      <div className="section-header">
        <h2>{t('home.news.title')}</h2>
        <Link to={ROUTES.MEMBER_PRESS} className="view-all">
          {t('common.viewAll')}
        </Link>
      </div>

      {loading ? (
        <div className="loading-state">
          <p>{t('common.loading')}</p>
        </div>
      ) : news ? (
        <Card className="news-card">
          <Link to={ROUTES.MEMBER_PRESS} className="news-card-link">
            <div className="news-card-thumbnail">
              <LazyImage 
                src={news.thumbnailUrl || '/uploads/banners/news.png'} 
                alt={news.title}
                placeholder="/uploads/banners/news.png"
              />
            </div>
            <div className="news-card-content">
              <h3 className="news-card-title">{news.title}</h3>
              <span className="news-card-date">{news.publishedAt}</span>
            </div>
          </Link>
        </Card>
      ) : (
        <Card className="empty-state">
          <p>{t('home.news.empty')}</p>
        </Card>
      )}
    </section>
  );
}

export default PressPreview;

