/**
 * Notices List Page - Member Portal
 * 公告列表页面
 */

import './NoticesList.css';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import Card from '@shared/components/Card';
import { Pagination } from '@shared/components';
import { PageContainer } from '@member/layouts';
import { apiService } from '@shared/services';
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
        console.error('Failed to load notices:', error);
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
      <div className="page-header">
        <h1>{t('home.notices.title', '最新公告')}</h1>
        <p className="page-description">{t('home.notices.description', '查看最新公告和重要通知')}</p>
      </div>

      {loading && notices.length === 0 ? (
        <div className="loading-state">
          <p>{t('common.loading', '加载中...')}</p>
        </div>
      ) : error ? (
        <Card className="error-state">
          <p className="error-message">{error}</p>
          <button 
            className="retry-button" 
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
                  console.error('Failed to load notices:', error);
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
          <div className="notices-grid">
            {notices.map((notice) => (
              <Card key={notice.id} className="notice-card">
                <div className="notice-card-link">
                  <div className="notice-card-header">
                    {notice.important && (
                      <span className="badge badge-danger">{t('home.notices.important', '重要')}</span>
                    )}
                    <span className="notice-card-date">{notice.date}</span>
                  </div>
                  <h3 className="notice-card-title">{notice.title}</h3>
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
          <p>{t('home.notices.empty', '暂无公告')}</p>
        </Card>
      )}
    </PageContainer>
  );
}

export default NoticesList;

