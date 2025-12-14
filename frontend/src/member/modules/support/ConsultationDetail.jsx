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
import { supportService, loggerService, exceptionService } from '@shared/services';

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
        const error = new Error('Consultation ID is missing');
        loggerService.error('Consultation ID is missing', {
          module: 'ConsultationDetail',
          function: 'loadConsultation',
          error_message: error.message
        });
        exceptionService.recordException(error, {
          request_path: window.location.pathname,
          error_code: 'CONSULTATION_ID_MISSING'
        });
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
        loggerService.error('Failed to load consultation', {
          module: 'ConsultationDetail',
          function: 'loadConsultation',
          consultation_id: id,
          error_message: error.message,
          error_code: error.code
        });
        exceptionService.recordException(error, {
          request_path: window.location.pathname,
          error_code: error.code || 'LOAD_CONSULTATION_FAILED',
          context_data: { consultation_id: id }
        });
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
    <div className="support w-full max-w-full flex flex-col p-0 m-0 overflow-x-hidden relative bg-gradient-to-b from-blue-50/30 via-white to-gray-50/50 min-h-screen">
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
        className="support-submenu bg-white/95 shadow-md border-b border-gray-200/50 sticky top-0 z-10 backdrop-blur-md"
        headerSelector=".member-header"
      />
      <PageContainer>
        <div className="animate-fade-in py-6 px-4 sm:py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          {loading ? (
            <Card className="shadow-lg border border-gray-200/50 bg-white rounded-2xl overflow-hidden">
              <div className="flex flex-col items-center justify-center py-16 px-8">
                <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="mt-6 text-lg font-medium text-gray-600 animate-pulse">{t('common.loading')}</p>
              </div>
            </Card>
          ) : error || !consultation ? (
            <Card className="shadow-lg border border-gray-200/50 bg-white rounded-2xl overflow-hidden">
              <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
                <div className="text-6xl mb-4 animate-bounce">⚠️</div>
                <p className="text-xl font-semibold text-gray-800 mb-6">{error || t('support.notFound')}</p>
                <Button 
                  variant="primary"
                  onClick={() => navigate('/member/support/inquiry-history')}
                  className="mt-4"
                >
                  {t('common.back')}
                </Button>
              </div>
            </Card>
          ) : (
        <div className="w-full max-w-5xl mx-auto space-y-6 sm:space-y-8 animate-fade-in">
          {/* 页面头部：返回按钮、标题和状态 */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 p-4 sm:p-6 lg:p-8 space-y-6">
            <Button
              variant="text"
              onClick={() => navigate('/member/support/inquiry-history')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 font-medium mb-4 [&_.icon]:w-5 [&_.icon]:h-5 [&_.icon]:transition-transform [&_.icon]:duration-200 [&:hover_.icon]:-translate-x-1"
            >
              <ArrowLeftIcon className="icon" />
              <span>{t('common.back', '返回')}</span>
            </Button>
              <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 sm:pb-6 border-b-2 border-gray-200">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 m-0 leading-tight flex-1">{consultation.subject || consultation.title}</h1>
                <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold shadow-md transition-all duration-300 animate-fade-in flex-shrink-0 ${consultation.status === 'answered' || consultation.status === 'replied' ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-green-200' : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-amber-200'}`}>
                  {consultation.status === 'answered' || consultation.status === 'replied' ? '✓' : '⏳'}
                  <span className="ml-1">
                    {t(`support.status.${consultation.status}`)}
                  </span>
                </span>
              </div>
              {/* 咨询基本信息表格 */}
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 sm:p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs sm:text-sm font-semibold text-gray-600 uppercase tracking-wide">{t('support.createdDate')}</span>
                    <span className="text-sm sm:text-base text-gray-900 font-medium">
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
                    <div className="flex flex-col gap-1">
                      <span className="text-xs sm:text-sm font-semibold text-gray-600 uppercase tracking-wide">{t('support.answeredDate')}</span>
                      <span className="text-sm sm:text-base text-gray-900 font-medium">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs sm:text-sm font-semibold text-gray-600 uppercase tracking-wide">{t('support.companyName')}</span>
                      <span className="text-sm sm:text-base text-gray-900 font-medium">{consultation.memberName}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 咨询对话时间线 */}
          <div className="space-y-6 sm:space-y-8">
            {/* 用户咨询消息 */}
            <Card className="shadow-lg border-2 rounded-2xl overflow-hidden transition-all duration-300 animate-fade-in border-blue-200 bg-white">
              <div className="flex items-center justify-between gap-4 px-4 sm:px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center gap-2">
                  <span className="text-xl">👤</span>
                  <span className="font-semibold text-blue-700 text-sm sm:text-base">{t('support.user')}</span>
                </div>
                <span className="text-xs sm:text-sm text-gray-500 font-medium">
                  {consultation.createdAt ? new Date(consultation.createdAt).toLocaleString(currentLocale, {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : ''}
                </span>
              </div>
              <div className="p-4 sm:p-6 space-y-4">
                <div className="text-gray-800 leading-relaxed whitespace-pre-wrap text-sm sm:text-base min-h-[80px]">
                  {consultation.content || consultation.message || t('support.noContent')}
                </div>
              </div>
            </Card>

            {/* 管理员回复消息 */}
            {consultation.answer && (
              <Card className="shadow-lg border-2 rounded-2xl overflow-hidden transition-all duration-300 animate-fade-in border-green-200 bg-white">
                <div className="flex items-center justify-between gap-4 px-4 sm:px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">💼</span>
                    <span className="font-semibold text-green-700 text-sm sm:text-base">{t('support.admin')}</span>
                  </div>
                  <span className="text-xs sm:text-sm text-gray-500 font-medium">
                    {consultation.answeredAt ? new Date(consultation.answeredAt).toLocaleString(currentLocale, {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : ''}
                  </span>
                </div>
                <div className="p-4 sm:p-6 space-y-4">
                  <div className="text-gray-800 leading-relaxed whitespace-pre-wrap text-sm sm:text-base min-h-[80px]">
                    {consultation.answer}
                  </div>
                </div>
              </Card>
            )}

            {/* 待回复提示 */}
            {!consultation.answer && (
              <div className="flex flex-col items-center justify-center p-8 sm:p-12 bg-amber-50 rounded-2xl border-2 border-amber-200 text-center">
                <div className="text-5xl mb-4 animate-pulse">⏳</div>
                <p className="text-base sm:text-lg text-gray-700 font-medium">{t('support.pendingNotice')}</p>
              </div>
            )}
          </div>

          {/* 底部操作按钮 */}
          <div className="flex flex-col sm:flex-row gap-4 justify-end pt-6 border-t-2 border-gray-200">
            <Button
              variant="secondary"
              onClick={() => navigate('/member/support/inquiry-history')}
              className="flex-1 sm:flex-none transition-all duration-200 min-w-[120px] hover:scale-105"
            >
              {t('support.backToHistory')}
            </Button>
            <Button
              variant="primary"
              onClick={() => navigate('/member/support/inquiry')}
              className="flex-1 sm:flex-none transition-all duration-200 min-w-[120px] hover:scale-105"
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

