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
import './ConsultationHistory.css';

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
        <div className="loading">
          <p>{t('common.loading')}</p>
        </div>
      ) : inquiries.length === 0 ? (
        <div className="no-data">
          <p>{t('support.noInquiries')}</p>
        </div>
      ) : (
        <div className="inquiries-list">
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
              className="ac-card inquiry-item group"
            >
              <div 
                className="ac-card-img" 
                style={{ 
                  backgroundImage: `url('${supportBannerUrl || generatePlaceholderImage()}')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              />
              <div className="ac-card-body">
                <div className="inquiry-header">
                  <h2>{inquiry.subject || inquiry.title}</h2>
                  <span className={`badge ${inquiry.status === 'answered' ? 'badge-success' : 'badge-warning'}`}>
                    {t(`support.status.${inquiry.status}`)}
                  </span>
                </div>
                <div className="inquiry-meta">
                  <span>{t('support.createdDate')}: {inquiry.createdAt ? new Date(inquiry.createdAt).toLocaleDateString() : ''}</span>
                  {inquiry.answeredAt && (
                    <span>{t('support.answeredDate')}: {new Date(inquiry.answeredAt).toLocaleDateString()}</span>
                  )}
                </div>
                <span className="ac-btn bg-light-grey arrow">{t('common.details')}</span>
              </div>
            </Link>
            );
          })}
        </div>
      )}
    </Card>
  );
}

