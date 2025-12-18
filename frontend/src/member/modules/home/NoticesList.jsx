/**
 * Notices List Page - Member Portal
 * 公告列表页面
 */

import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import Card from '@shared/components/Card';
import { formatDateTime } from '@shared/utils/format';
import { Pagination, Badge } from '@shared/components';
import { PageContainer } from '@member/layouts';
import { apiService } from '@shared/services';
import { API_PREFIX, DEFAULT_PAGE_SIZE } from '@shared/utils/constants';

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
      const params = {
        page: parseInt(currentPage, 10),
        page_size: parseInt(pageSize, 10)
      };
      const response = await apiService.get(`${API_PREFIX}/notices`, params);
      
      // 处理后端返回的数据格式
      const noticesData = response.items || [];
      if (Array.isArray(noticesData)) {
        const formattedNotices = noticesData.map(n => ({
          id: n.id,
          title: n.title,
          date: (n.createdAt || n.created_at) ? formatDateTime((n.createdAt || n.created_at), 'yyyy-MM-dd HH:mm', i18n.language) : '',
          important: (n.boardType || n.board_type) === 'notice'
        }));
        setNotices(formattedNotices);
        setTotalCount(response.total || formattedNotices.length);
      } else {
        setNotices([]);
        setTotalCount(0);
      }
      setLoading(false);
    };

    loadNotices();
  }, [currentPage, pageSize, i18n.language, t]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };



  return (
    <PageContainer className="flex flex-col min-h-[calc(100vh-70px)] max-md:min-h-[calc(100vh-60px)]">
      <div className="mb-8 p-0 bg-transparent shadow-none">
        <h1 className="block text-2xl font-bold text-gray-900 mb-1 m-0">{t('home.notices.title', '最新公告')}</h1>
        <p className="text-gray-600 text-sm m-0">{t('home.notices.description', '查看最新公告和重要通知')}</p>
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
                const params = {
                  page: parseInt(currentPage, 10),
                  page_size: parseInt(pageSize, 10)
                };
                const response = await apiService.get(`${API_PREFIX}/notices`, params);
                const noticesData = response.items || [];
                if (Array.isArray(noticesData)) {
                  const formattedNotices = noticesData.map(n => ({
                  id: n.id,
                  title: n.title,
                  date: (n.createdAt || n.created_at) ? formatDateTime((n.createdAt || n.created_at), 'yyyy-MM-dd HH:mm', i18n.language) : '',
                  important: (n.boardType || n.board_type) === 'notice'
                  }));
                  setNotices(formattedNotices);
                  setTotalCount(response.total || formattedNotices.length);
                } else {
                  setNotices([]);
                  setTotalCount(0);
                }
                setLoading(false);
              };
              loadNotices();
            }}
          >
            {t('common.retry', '重试')}
          </button>
        </Card>
      ) : notices.length > 0 ? (
        <>
          <div className={`grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] max-md:grid-cols-2 max-sm:grid-cols-1 gap-5 max-md:gap-4 ${totalCount > pageSize ? 'pb-20' : 'pb-0'}`}>
            {notices.map((notice) => (
              <Card key={notice.id} className="h-full flex flex-col rounded-lg transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
                <div className="flex flex-col p-5 no-underline text-inherit h-full flex-1">
                  <div className="flex items-center justify-between mb-3 gap-2">
                    <Badge variant={notice.important ? "danger" : "secondary"}>
                      {notice.important ? t('home.notices.important', '重要') : t('home.notices.normal', '一般')}
                    </Badge>
                    <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                      {notice.date || '-'}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 m-0 leading-normal flex-1 line-clamp-2">{notice.title}</h3>
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
          <p className="text-base text-gray-500 m-0">{t('home.notices.empty', '暂无公告')}</p>
        </Card>
      )}
    </PageContainer>
  );
}

export default NoticesList;

