import './PressPreview.css';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Card from '@shared/components/Card';
import LazyImage from '@shared/components/LazyImage';
import { contentService, loggerService, exceptionService } from '@shared/services';
import { ROUTES } from '@shared/utils/constants';

// 生成占位符图片
const generatePlaceholderImage = (width = 400, height = 250) => {
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#e5e7eb"/>
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="16" fill="#9ca3af" text-anchor="middle" dominant-baseline="middle">
        News
      </text>
    </svg>
  `.trim();
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
};

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
      loggerService.error('Failed to load news', {
        module: 'PressPreview',
        function: 'loadNews',
        error_message: error.message,
        error_code: error.code
      });
      exceptionService.recordException(error, {
        request_path: window.location.pathname,
        error_code: error.code || 'LOAD_NEWS_FAILED'
      });
      setNews(null);
    } finally {
      setLoading(false);
    }
  }, [i18n.language]);

  useEffect(() => {
    loadNews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language]); // 直接依赖 i18n.language，避免 loadNews 变化导致重复请求

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
                src={news.thumbnailUrl || generatePlaceholderImage()} 
                alt={news.title}
                placeholder={generatePlaceholderImage()}
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

