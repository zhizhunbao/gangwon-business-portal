/**
 * Consultation History Component - Member Portal
 * 咨询历史记录组件（标题、注册日期、处理状态、详情查看）
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import Card from '@shared/components/Card';
import { supportService } from '@shared/services';
import './ConsultationHistory.css';

export default function ConsultationHistory() {
  const { t } = useTranslation();
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(false);

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
        console.error('Failed to load inquiries:', error);
        setInquiries([]);
      } finally {
        setLoading(false);
      }
    };

    loadInquiries();
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
              console.warn('Inquiry missing id:', inquiry);
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
                  backgroundImage: `url('/uploads/banners/support.png')` 
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

