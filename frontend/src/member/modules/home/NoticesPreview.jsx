/**
 * Notices Preview Component - Member Portal
 * 公告预览组件 - 显示最近4条公告
 */

import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Card from '@shared/components/Card';
import { contentService, loggerService, exceptionService } from '@shared/services';
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
      loggerService.error('Failed to load notices', {
        module: 'NoticesPreview',
        function: 'loadNotices',
        error_message: error.message,
        error_code: error.code
      });
      exceptionService.recordException(error, {
        request_path: window.location.pathname,
        error_code: error.code || 'LOAD_NOTICES_FAILED'
      });
      setNotices([]);
    } finally {
      setLoading(false);
    }
  }, [i18n.language]);

  useEffect(() => {
    loadNotices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language]); // 直接依赖 i18n.language，避免 loadNotices 变化导致重复请求

  return (
    <section className="notices-section w-full flex-1 flex flex-col bg-white rounded-lg shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6 flex-shrink-0 max-md:flex-col max-md:items-start max-md:gap-2">
        <h2 className="text-2xl font-semibold text-gray-900 m-0">{t('home.notices.title', '最新公告')}</h2>
        <Link to={ROUTES.MEMBER_NOTICES} className="text-blue-600 no-underline text-sm font-medium transition-colors hover:text-blue-500 hover:underline">
          {t('common.viewAll', '查看全部')}
        </Link>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-500">
          <p>{t('common.loading', '加载中...')}</p>
        </div>
      ) : notices.length > 0 ? (
        <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
          {notices.map((notice) => (
            <Card key={notice.id} className="flex-shrink-0 transition-all duration-200">
              <div className="flex flex-col p-4 cursor-default">
                <div className="flex items-center justify-between mb-1 gap-2">
                  {notice.important && (
                    <span className="inline-block px-2 py-0.5 text-xs font-medium rounded whitespace-nowrap bg-red-100 text-red-600">
                      {t('home.notices.important', '重要')}
                    </span>
                  )}
                  <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">{notice.date}</span>
                </div>
                <h3 className="text-sm font-medium text-gray-900 m-0 leading-snug line-clamp-2">{notice.title}</h3>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center text-gray-500">
          <p className="text-sm text-gray-500 m-0 text-center p-4">
            {t('home.notices.empty', '暂无公告')}
          </p>
        </Card>
      )}
    </section>
  );
}

export default NoticesPreview;

