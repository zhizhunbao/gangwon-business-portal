/**
 * Consultation Detail Component - Member Portal
 * 咨询详情页面（显示咨询内容、管理员回复、附件链接）
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Banner, Submenu } from '@shared/components';
import { BANNER_TYPES } from '@shared/utils/constants';
import { PageContainer } from '@member/layouts';
import Card from '@shared/components/Card';
import Button from '@shared/components/Button';
import { ArrowLeftIcon, DocumentIcon, DownloadIcon } from '@shared/components/Icons';
import { supportService } from '@shared/services';
import './ConsultationDetail.css';
import './Support.css';

export default function ConsultationDetail() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [consultation, setConsultation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Get current language locale for date formatting
  const currentLocale = i18n.language === 'zh' ? 'zh-CN' : 'ko-KR';

  useEffect(() => {
    const loadConsultation = async () => {
      if (!id) {
        console.error('Consultation ID is missing');
        setError(t('support.consultationIdMissing'));
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const response = await supportService.getInquiry(id);
        if (response) {
          setConsultation(response);
        } else {
          setError(t('support.notFound'));
        }
      } catch (error) {
        console.error('Failed to load consultation:', error);
        const errorMessage = error?.response?.data?.detail || error?.message || t('support.loadFailed');
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadConsultation();
  }, [id, t]);

  const handleDownload = (fileUrl, fileName) => {
    // 创建临时链接下载文件
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName || 'attachment';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="support consultation-detail-page">
      <Banner
        bannerType={BANNER_TYPES.SUPPORT}
        sectionClassName="member-banner-section"
      />
      <Submenu
        items={[
          {
            key: 'support-faq',
            path: '/member/support/faq',
            exact: true,
            label: t('support.faq')
          },
          {
            key: 'support-inquiry',
            path: '/member/support/inquiry',
            exact: true,
            label: t('support.inquiry')
          },
          {
            key: 'support-inquiry-history',
            path: '/member/support/inquiry-history',
            exact: true,
            label: t('support.inquiryHistory')
          }
        ]}
        className="support-submenu"
        headerSelector=".member-header"
      />
      <PageContainer>
        <div className="tab-content">
          {loading ? (
            <Card className="loading-card">
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p className="loading-text">{t('common.loading')}</p>
              </div>
            </Card>
          ) : error || !consultation ? (
            <Card className="error-card">
              <div className="error-container">
                <div className="error-icon">⚠️</div>
                <p className="error-message">{error || t('support.notFound')}</p>
                <Button 
                  variant="primary"
                  onClick={() => navigate('/member/support/inquiry-history')}
                  className="error-button"
                >
                  {t('common.back')}
                </Button>
              </div>
            </Card>
          ) : (
        <div className="consultation-detail-wrapper">
          {/* 页面头部：返回按钮、标题和状态 */}
          <div className="consultation-header">
            <Button
              variant="text"
              onClick={() => navigate('/member/support/inquiry-history')}
              className="back-button"
            >
              <ArrowLeftIcon className="icon" />
              <span>{t('common.back', '返回')}</span>
            </Button>
              <div className="header-content">
              <div className="header-title-section">
                <h1 className="consultation-title">{consultation.subject || consultation.title}</h1>
                <span className={`status-badge ${consultation.status === 'answered' || consultation.status === 'replied' ? 'status-answered' : 'status-pending'}`}>
                  {consultation.status === 'answered' || consultation.status === 'replied' ? '✓' : '⏳'}
                  <span className="badge-text">
                    {t(`support.status.${consultation.status}`)}
                  </span>
                </span>
              </div>
              {/* 咨询基本信息表格 */}
              <div className="consultation-info-table">
                <div className="info-row">
                  <div className="info-cell">
                    <span className="info-label">{t('support.createdDate')}</span>
                    <span className="info-value">
                      {consultation.createdAt ? new Date(consultation.createdAt).toLocaleString(currentLocale, {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : '-'}
                    </span>
                  </div>
                  {consultation.answeredAt && (
                    <div className="info-cell">
                      <span className="info-label">{t('support.answeredDate')}</span>
                      <span className="info-value">
                        {new Date(consultation.answeredAt).toLocaleString(currentLocale, {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  )}
                </div>
                {consultation.memberName && (
                  <div className="info-row">
                    <div className="info-cell">
                      <span className="info-label">{t('support.companyName')}</span>
                      <span className="info-value">{consultation.memberName}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 咨询对话时间线 */}
          <div className="consultation-timeline">
            {/* 用户咨询消息 */}
            <Card className="message-card message-user">
              <div className="message-header">
                <div className="message-sender">
                  <span className="sender-icon">👤</span>
                  <span className="sender-name">{t('support.user')}</span>
                </div>
                <span className="message-time">
                  {consultation.createdAt ? new Date(consultation.createdAt).toLocaleString(currentLocale, {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : ''}
                </span>
              </div>
              <div className="message-content">
                <div className="message-text">
                  {consultation.content || consultation.message || t('support.noContent')}
                </div>
              </div>
            </Card>

            {/* 管理员回复消息 */}
            {consultation.answer && (
              <Card className="message-card message-admin">
                <div className="message-header">
                  <div className="message-sender">
                    <span className="sender-icon">💼</span>
                    <span className="sender-name">{t('support.admin')}</span>
                  </div>
                  <span className="message-time">
                    {consultation.answeredAt ? new Date(consultation.answeredAt).toLocaleString(currentLocale, {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : ''}
                  </span>
                </div>
                <div className="message-content">
                  <div className="message-text">
                    {consultation.answer}
                  </div>
                </div>
              </Card>
            )}

            {/* 待回复提示 */}
            {!consultation.answer && (
              <div className="pending-notice">
                <div className="pending-icon">⏳</div>
                <p className="pending-text">{t('support.pendingNotice')}</p>
              </div>
            )}
          </div>

          {/* 底部操作按钮 */}
          <div className="consultation-actions">
            <Button
              variant="secondary"
              onClick={() => navigate('/member/support/inquiry-history')}
              className="action-button"
            >
              {t('support.backToHistory')}
            </Button>
            <Button
              variant="primary"
              onClick={() => navigate('/member/support/inquiry')}
              className="action-button"
            >
              {t('support.newInquiry')}
            </Button>
          </div>
        </div>
          )}
        </div>
      </PageContainer>
    </div>
  );
}

