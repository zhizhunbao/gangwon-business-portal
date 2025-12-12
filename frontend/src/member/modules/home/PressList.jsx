/**
 * Press List Page - Member Portal
 * 新闻/보도자료列表页面
 */

import './PressList.css';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback, useMemo } from 'react';
import Card from '@shared/components/Card';
import LazyImage from '@shared/components/LazyImage';
import { Pagination } from '@shared/components';
import { PageContainer } from '@member/layouts';
import { apiService, loggerService, exceptionService } from '@shared/services';
import { API_PREFIX, DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '@shared/utils/constants';

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

function PressList() {
  const { t, i18n } = useTranslation();
  const [newsList, setNewsList] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalCount, setTotalCount] = useState(0);

  const loadNews = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        page_size: pageSize,
        category: 'news' // 只加载新闻资料
      };
      const response = await apiService.get(`${API_PREFIX}/content/notices`, params);
      if (response.notices) {
        const formattedNews = response.notices.map(n => ({
          id: n.id,
          title: n.title,
          thumbnailUrl: n.thumbnailUrl || n.imageUrl || null,
          publishedAt: n.publishedAt ? new Date(n.publishedAt).toISOString().split('T')[0] : ''
        }));
        setNewsList(formattedNews);
        setTotalCount(response.totalCount || response.pagination?.total || formattedNews.length);
      }
    } catch (error) {
      loggerService.error('Failed to load news', {
        module: 'PressList',
        function: 'loadNews',
        error_message: error.message,
        error_code: error.code
      });
      exceptionService.recordException(error, {
        request_path: window.location.pathname,
        error_code: error.code || 'LOAD_NEWS_FAILED'
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, i18n.language]);

  useEffect(() => {
    loadNews();
  }, [loadNews]);

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handlePageSizeChange = useCallback((newPageSize) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  }, []);

  return (
    <PageContainer>
      <div className="news-list-page">
        <div className="page-header">
          <h1>{t('home.news.title', '新闻资料')}</h1>
          <p className="page-description">{t('home.news.description', '查看最新新闻资料和资讯')}</p>
        </div>

      {loading && newsList.length === 0 ? (
        <div className="loading-state">
          <p>{t('common.loading', '加载中...')}</p>
        </div>
      ) : newsList.length > 0 ? (
        <>
          <div className="news-grid">
            {newsList.map((news) => (
              <Card key={news.id} className="news-card">
                <div className="news-card-link">
                  <div className="news-card-thumbnail">
                    <LazyImage 
                      src={news.thumbnailUrl || generatePlaceholderImage()} 
                      alt={news.title}
                      placeholder={generatePlaceholderImage()}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  </div>
                  <div className="news-card-content">
                    <h3 className="news-card-title">{news.title}</h3>
                    <span className="news-card-date">{news.publishedAt}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {totalCount > pageSize && (
            <div className="pagination-wrapper">
              <Pagination
                currentPage={currentPage}
                totalItems={totalCount}
                pageSize={pageSize}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
              />
            </div>
          )}
        </>
      ) : (
        <Card className="empty-state">
          <p>{t('home.news.empty', '暂无新闻资料')}</p>
        </Card>
      )}
      </div>
    </PageContainer>
  );
}

export default PressList;

