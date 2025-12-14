/**
 * Notices List Page - Member Portal
 * 公告列表页面
 */

import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import Card from '@shared/components/Card';
import { Pagination } from '@shared/components';
import { PageContainer } from '@member/layouts';
import { apiService, loggerService, exceptionService } from '@shared/services';
import { API_PREFIX, DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '@shared/utils/constants';

function NoticesList() {
  const { t, i18n } = useTranslation();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const loadNotices = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = {
          page: currentPage,
          page_size: pageSize,
          category: 'announcement' // 只加载公告，不包括新闻
        };
        const response = await apiService.get(`${API_PREFIX}/content/notices`, params);
        
        // 处理不同的响应格式
        const noticesData = response.notices || response.data || [];
        if (Array.isArray(noticesData)) {
          const formattedNotices = noticesData.map(n => ({
            id: n.id,
            title: n.title,
            date: n.publishedAt ? new Date(n.publishedAt).toISOString().split('T')[0] : (n.date || ''),
            important: n.category === 'announcement' && (n.isImportant || false)
          }));
          setNotices(formattedNotices);
          setTotalCount(response.totalCount || response.pagination?.total || formattedNotices.length);
        } else {
          setNotices([]);
          setTotalCount(0);
        }
      } catch (error) {
        loggerService.error('Failed to load notices', {
          module: 'NoticesList',
          function: 'loadNotices',
          error_message: error.message,
          error_code: error.code
        });
        exceptionService.recordException(error, {
          request_path: window.location.pathname,
          error_code: error.code || 'LOAD_NOTICES_FAILED'
        });
        setError(error.message || t('common.error.loadFailed', '加载失败，请稍后重试'));
        setNotices([]);
        setTotalCount(0);
      } finally {
        setLoading(false);
      }
    };

    loadNotices();
  }, [currentPage, pageSize, i18n.language, t]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageSizeChange = (newPageSize) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };

  return (
    <PageContainer>
      <div className="mb-6">
        <h1 className="text-3xl max-md:text-2xl font-bold text-gray-900 mb-2 m-0">{t('home.notices.title', '最新公告')}</h1>
        <p className="text-base text-gray-500 m-0">{t('home.notices.description', '查看最新公告和重要通知')}</p>
      </div>

      {loading && notices.length === 0 ? (
        <div className="text-center py-12 px-8">
          <p className="text-base text-gray-500 m-0">{t('common.loading', '加载中...')}</p>
        </div>
      ) : error ? (
        <Card className="text-center py-12 px-8 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-base text-red-600 mb-4 m-0">{error}</p>
          <button 
            className="px-6 py-2 bg-red-600 text-white border-none rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-red-700" 
            onClick={() => {
              const loadNotices = async () => {
                setLoading(true);
                setError(null);
                try {
                  const params = {
                    page: currentPage,
                    page_size: pageSize,
                    category: 'announcement'
                  };
                  const response = await apiService.get(`${API_PREFIX}/content/notices`, params);
                  const noticesData = response.notices || response.data || [];
                  if (Array.isArray(noticesData)) {
                    const formattedNotices = noticesData.map(n => ({
                      id: n.id,
                      title: n.title,
                      date: n.publishedAt ? new Date(n.publishedAt).toISOString().split('T')[0] : (n.date || ''),
                      important: n.category === 'announcement' && (n.isImportant || false)
                    }));
                    setNotices(formattedNotices);
                    setTotalCount(response.totalCount || response.pagination?.total || formattedNotices.length);
                  } else {
                    setNotices([]);
                    setTotalCount(0);
                  }
                } catch (error) {
                  loggerService.error('Failed to load notices (retry)', {
                    module: 'NoticesList',
                    function: 'loadNotices',
                    error_message: error.message,
                    error_code: error.code
                  });
                  exceptionService.recordException(error, {
                    request_path: window.location.pathname,
                    error_code: error.code || 'LOAD_NOTICES_FAILED'
                  });
                  setError(error.message || t('common.error.loadFailed', '加载失败，请稍后重试'));
                  setNotices([]);
                  setTotalCount(0);
                } finally {
                  setLoading(false);
                }
              };
              loadNotices();
            }}
          >
            {t('common.retry', '重试')}
          </button>
        </Card>
      ) : notices.length > 0 ? (
        <>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] max-md:grid-cols-2 max-sm:grid-cols-1 gap-5 max-md:gap-4 mb-6">
            {notices.map((notice) => (
              <Card key={notice.id} className="h-full flex flex-col rounded-lg transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
                <div className="flex flex-col p-5 no-underline text-inherit h-full flex-1">
                  <div className="flex items-center justify-between mb-3 gap-2">
                    {notice.important && (
                      <span className="inline-block px-2 py-1 text-xs font-medium rounded whitespace-nowrap bg-red-100 text-red-600">{t('home.notices.important', '重要')}</span>
                    )}
                    <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">{notice.date}</span>
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 m-0 leading-normal flex-1 line-clamp-2">{notice.title}</h3>
                </div>
              </Card>
            ))}
          </div>

          {totalCount > pageSize && (
            <div className="mt-6 flex justify-center">
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
        <Card className="text-center py-12 px-8">
          <p className="text-base text-gray-500 m-0">{t('home.notices.empty', '暂无公告')}</p>
        </Card>
      )}
    </PageContainer>
  );
}

export default NoticesList;

