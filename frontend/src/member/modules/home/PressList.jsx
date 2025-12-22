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
import { formatDate } from '@shared/utils/format';
import { contentService } from '@shared/services';
import { DEFAULT_PAGE_SIZE } from '@shared/utils/constants';

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
      const response = await contentService.listPressReleases({
        page: currentPage,
        pageSize: pageSize
      });
      
      if (response.items) {
        const formattedNews = response.items.map(n => ({
          id: n.id,
          title: n.title,
          thumbnailUrl: n.imageUrl || n.image_url || null,
          publishedAt: (n.createdAt || n.created_at) ? formatDate((n.createdAt || n.created_at), 'yyyy-MM-dd', i18n.language) : ''
        }));
        setNewsList(formattedNews);
        setTotalCount(response.total || formattedNews.length);
      }
    } catch (error) {
      // AOP 系统会自动记录错误
      setNewsList([]);
      setTotalCount(0);
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
    <PageContainer className="flex flex-col min-h-[calc(100vh-70px)] max-md:min-h-[calc(100vh-60px)]">
      <div className="w-full flex flex-col min-h-0">
        <div className="mb-8 p-0 bg-transparent shadow-none">
          <h1 className="block text-2xl font-bold text-gray-900 mb-1 m-0">{t('home.news.title', '新闻资料')}</h1>
          <p className="text-gray-600 text-sm m-0">{t('home.news.description', '查看最新新闻资料和资讯')}</p>
        </div>

      {loading && newsList.length === 0 ? (
        <div className="text-center py-12 px-8">
          <p className="text-base text-gray-500 m-0">{t('common.loading', '加载中...')}</p>
        </div>
      ) : newsList.length > 0 ? (
        <>
          <div className={`grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] max-md:grid-cols-2 max-sm:grid-cols-1 gap-6 max-md:gap-4 ${totalCount > pageSize ? 'pb-20' : 'pb-0'}`}>
            {newsList.map((news) => (
              <Card key={news.id} className="overflow-hidden flex-1 flex flex-col">
                <div className="flex flex-col p-0 text-inherit no-underline h-full transition-transform hover:-translate-y-0.5">
                  <div className="w-full h-[200px] overflow-hidden rounded-t-lg bg-gray-100 relative flex-shrink-0">
                    <LazyImage 
                      src={news.thumbnailUrl || generatePlaceholderImage()} 
                      alt={news.title}
                      placeholder={generatePlaceholderImage()}
                      className="!block !w-full !h-full flex-shrink-0 object-cover object-center"
                    />
                  </div>
                  <div className="flex flex-col p-4 gap-2">
                    <h3 className="text-base font-semibold text-gray-900 m-0 leading-snug line-clamp-2">{news.title}</h3>
                    <span className="text-sm text-gray-400">{news.publishedAt}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {totalCount > pageSize && (
            <div className="sticky bottom-0 mt-auto py-3">
              <div className="flex justify-between items-center px-1 sm:px-0">
                <div className="text-xs text-gray-500 whitespace-nowrap">
                  {t('common.itemsPerPage', '每页显示')}: {pageSize} · {t('common.total', '共')}: {totalCount}
                </div>
                <Pagination
                  currentPage={currentPage}
                  totalPages={Math.ceil(totalCount / pageSize)}
                  onPageChange={handlePageChange}
                />
              </div>
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

