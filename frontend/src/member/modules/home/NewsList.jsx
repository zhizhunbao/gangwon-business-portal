/**
 * News List Page - Member Portal
 * 新闻资料列表页面
 */

import './NewsList.css';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback, memo } from 'react';
import Card from '@shared/components/Card';
import { Pagination } from '@shared/components/Pagination';
import { apiService } from '@shared/services';
import { API_PREFIX, DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '@shared/utils/constants';

function NewsList() {
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
      console.error('Failed to load news:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, i18n.language]);

  useEffect(() => {
    loadNews();
  }, [loadNews]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageSizeChange = (newPageSize) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };

  return (
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
                  {news.thumbnailUrl && (
                    <div className="news-card-thumbnail">
                      <img src={news.thumbnailUrl} alt={news.title} />
                    </div>
                  )}
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
  );
}

// 使用 memo 包装，避免不必要的重渲染
export default memo(NewsList);

