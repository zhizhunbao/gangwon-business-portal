/**
 * Consultation History Component - Member Portal
 * 咨询历史记录组件（标题、注册日期、处理状态、详情查看）
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import Card from '@shared/components/Card';
import { supportService, contentService, loggerService, exceptionService } from '@shared/services';
import { BANNER_TYPES } from '@shared/utils/constants';

// 生成占位符图片
const generatePlaceholderImage = (width = 400, height = 200) => {
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#e5e7eb"/>
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="16" fill="#9ca3af" text-anchor="middle" dominant-baseline="middle">
        Support
      </text>
    </svg>
  `.trim();
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
};

export default function ConsultationHistory() {
  const { t } = useTranslation();
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [supportBannerUrl, setSupportBannerUrl] = useState(null);

  useEffect(() => {
    const loadInquiries = async () => {
      setLoading(true);
      try {
        const response = await supportService.listMyInquiries({
          page: 1,
          pageSize: 100 // 获取所有咨询记录
        });
        setInquiries(response.items || []);
      } catch (error) {
        loggerService.error('Failed to load inquiries', {
          module: 'ConsultationHistory',
          function: 'loadInquiries',
          error_message: error.message,
          error_code: error.code
        });
        exceptionService.recordException(error, {
          request_path: window.location.pathname,
          error_code: error.code || 'LOAD_INQUIRIES_FAILED'
        });
        setInquiries([]);
      } finally {
        setLoading(false);
      }
    };

    // 加载 support 横幅
    const loadSupportBanner = async () => {
      try {
        const banners = await contentService.getBanners({ bannerType: BANNER_TYPES.SUPPORT });
        if (banners && banners.length > 0 && banners[0].imageUrl) {
          setSupportBannerUrl(banners[0].imageUrl);
        } else {
          setSupportBannerUrl(generatePlaceholderImage());
        }
      } catch (error) {
        loggerService.warn('Failed to load support banner, using placeholder', {
          module: 'ConsultationHistory',
          function: 'loadSupportBanner',
          error_message: error.message
        });
        setSupportBannerUrl(generatePlaceholderImage());
      }
    };

    loadInquiries();
    loadSupportBanner();
  }, []);

  return (
    <Card>
      <h2>{t('support.inquiryHistory')}</h2>
      {loading ? (
        <div className="py-16 px-4 text-center flex flex-col items-center justify-center gap-4 before:content-[''] before:w-12 before:h-12 before:border-4 before:border-blue-200 before:border-t-blue-600 before:rounded-full before:animate-spin">
          <p className="m-0 text-base text-gray-600 font-medium">{t('common.loading')}</p>
        </div>
      ) : inquiries.length === 0 ? (
        <div className="py-16 px-4 text-center flex flex-col items-center justify-center gap-4 before:content-['📋'] before:text-5xl before:opacity-50">
          <p className="m-0 text-base text-gray-500">{t('support.noInquiries')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[repeat(auto-fill,minmax(380px,1fr))] gap-6">
          {inquiries.map((inquiry) => {
            // 确保 inquiry.id 存在
            if (!inquiry.id) {
              loggerService.warn('Inquiry missing id', {
                module: 'ConsultationHistory',
                function: 'render',
                inquiry_data: inquiry
              });
              return null;
            }
            return (
            <Link 
              key={inquiry.id} 
              to={`/member/support/consultation/${inquiry.id}`} 
              className="group flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden no-underline text-inherit shadow-md relative"
            >
              <div 
                className="w-full h-52 bg-cover bg-center bg-no-repeat relative overflow-hidden" 
                style={{ 
                  backgroundImage: `url('${supportBannerUrl || generatePlaceholderImage()}')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              />
              <div className="p-6 flex flex-col flex-1 bg-gradient-to-b from-white to-gray-50">
                <div className="flex justify-between items-start gap-4 mb-4 md:flex-col md:items-start md:gap-3">
                  <h2 className="flex-1 m-0 text-xl font-bold text-gray-900 leading-tight line-clamp-2">{inquiry.subject || inquiry.title}</h2>
                  <span className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap shadow-sm transition-all duration-200 ${inquiry.status === 'answered' ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200' : 'bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 border border-amber-200'}`}>
                    {t(`support.status.${inquiry.status}`)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-4 mb-6 text-sm text-gray-600 md:flex-col md:gap-2">
                  <span className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg">{t('support.createdDate')}: {inquiry.createdAt ? new Date(inquiry.createdAt).toLocaleDateString() : ''}</span>
                  {inquiry.answeredAt && (
                    <span className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg">{t('support.answeredDate')}: {new Date(inquiry.answeredAt).toLocaleDateString()}</span>
                  )}
                </div>
                <span className="inline-block px-6 py-3 text-sm font-semibold uppercase tracking-wider rounded-lg no-underline self-start relative bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border border-gray-300 shadow-sm after:content-['_→'] after:ml-2 after:inline-block">{t('common.details')}</span>
              </div>
            </Link>
            );
          })}
        </div>
      )}
    </Card>
  );
}

