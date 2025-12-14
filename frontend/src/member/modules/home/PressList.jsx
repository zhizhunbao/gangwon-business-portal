/**
 * Press List Page - Member Portal
 * 新闻/보도자료列表页面
 */

import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback } from 'react';
import Card from '@shared/components/Card';
import LazyImage from '@shared/components/LazyImage';
import { Pagination } from '@shared/components';
import { PageContainer } from '@member/layouts';
import { apiService, loggerService, exceptionService } from '@shared/services';
import { API_PREFIX, DEFAULT_PAGE_SIZE } from '@shared/utils/constants';

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
        page: parseInt(currentPage, 10),
        page_size: parseInt(pageSize, 10)
      };
      const response = await apiService.get(`${API_PREFIX}/press`, params);
      if (response.items) {
        const formattedNews = response.items.map(n => ({
          id: n.id,
          title: n.title,
          thumbnailUrl: n.imageUrl || null,
          publishedAt: n.createdAt ? new Date(n.createdAt).toISOString().split('T')[0] : ''
        }));
        setNewsList(formattedNews);
        setTotalCount(response.total || formattedNews.length);
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



  return (
    <PageContainer>
      <div className="w-full">
        <div className="mb-8">
          <h1 className="text-3xl max-md:text-2xl font-bold text-gray-900 mb-2 m-0">{t('home.news.title', '新闻资料')}</h1>
          <p className="text-base text-gray-500 m-0">{t('home.news.description', '查看最新新闻资料和资讯')}</p>
        </div>

      {loading && newsList.length === 0 ? (
        <div className="text-center py-12 px-8">
          <p className="text-base text-gray-500 m-0">{t('common.loading', '加载中...')}</p>
        </div>
      ) : newsList.length > 0 ? (
        <>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] max-md:grid-cols-2 max-sm:grid-cols-1 gap-6 max-md:gap-4 mb-8">
            {newsList.map((news) => (
              <Card key={news.id} className="h-full flex flex-col rounded-lg transition-all duration-200">
                <div className="flex flex-col p-5 text-inherit h-full flex-1 cursor-default">
                  <div className="w-full h-40 min-h-[10rem] max-h-40 overflow-hidden rounded-md mb-4 flex-shrink-0 relative bg-gray-100 flex items-center justify-center">
                    <LazyImage 
                      src={news.thumbnailUrl || generatePlaceholderImage()} 
                      alt={news.title}
                      placeholder={generatePlaceholderImage()}
                      className="!w-full !h-full min-w-full min-h-full max-w-full max-h-full block flex-shrink-0 object-cover object-center"
                    />
                  </div>
                  <div className="flex flex-col flex-1">
                    <h3 className="text-base font-semibold text-gray-900 mb-2 leading-normal flex-1 line-clamp-2">{news.title}</h3>
                    <span className="text-xs text-gray-400 mt-auto">{news.publishedAt}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {totalCount > pageSize && (
            <div className="mt-8 flex justify-center">
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(totalCount / pageSize)}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </>
      ) : (
        <Card className="text-center py-12 px-8">
          <p className="text-base text-gray-500 m-0">{t('home.news.empty', '暂无新闻资料')}</p>
        </Card>
      )}
      </div>
    </PageContainer>
  );
}

export default PressList;

