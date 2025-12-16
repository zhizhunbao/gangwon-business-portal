/**
 * Banner Management Component
 * 横幅管理组件
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Button, Input, Alert } from '@shared/components';
import { apiService, loggerService, exceptionService } from '@shared/services';
import { API_PREFIX } from '@shared/utils/constants';

export default function BannerManagement() {
  const { t } = useTranslation();
  
  // Quick banner management state (by key)
  const [quickBanners, setQuickBanners] = useState({
    main_primary: { image: null, file: null, url: '' },
    about: { image: null, file: null, url: '' },
    projects: { image: null, file: null, url: '' },
    performance: { image: null, file: null, url: '' },
    support: { image: null, file: null, url: '' }
  });
  const [loadingQuick, setLoadingQuick] = useState(false);
  const [message, setMessage] = useState(null);
  const [messageVariant, setMessageVariant] = useState('success');
  const fileInputRefs = useRef({});

  // Quick banner management functions
  const loadQuickBanners = useCallback(async () => {
    setLoadingQuick(true);
    try {
      loggerService.info('Loading quick banners', {
        module: 'BannerManagement',
        function: 'loadQuickBanners'
      });
      const response = await apiService.get(`${API_PREFIX}/admin/banners`);
      if (response && response.banners) {
        const bannerKeys = ['main_primary', 'about', 'projects', 'performance', 'support'];
        const normalizedBanners = {};
        bannerKeys.forEach(key => {
          const banner = response.banners[key] || {};
          normalizedBanners[key] = {
            image: banner.image || null,
            file: null,
            url: banner.url || ''
          };
        });
        setQuickBanners(normalizedBanners);
        loggerService.info('Quick banners loaded successfully', {
          module: 'BannerManagement',
          function: 'loadQuickBanners'
        });
      }
    } catch (error) {
      loggerService.error('Failed to load quick banners', {
        module: 'BannerManagement',
        function: 'loadQuickBanners',
        error_message: error.message,
        error_code: error.code
      });
      exceptionService.recordException(error, {
        request_path: window.location.pathname,
        error_code: 'LOAD_QUICK_BANNERS_ERROR'
      });
      setMessageVariant('error');
      setMessage(t('admin.content.banners.messages.loadFailed', '加载横幅失败'));
    } finally {
      setLoadingQuick(false);
    }
  }, [t]);

  useEffect(() => {
    loadQuickBanners();
  }, [loadQuickBanners]);

  const handleQuickBannerImageChange = (bannerKey, file) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setQuickBanners(prev => ({
          ...prev,
          [bannerKey]: {
            ...prev[bannerKey],
            image: e.target.result,
            file: file
          }
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleQuickBannerUrlChange = (bannerKey, url) => {
    setQuickBanners(prev => ({
      ...prev,
      [bannerKey]: {
        ...prev[bannerKey],
        url
      }
    }));
  };

  const handleQuickBannerSave = async (bannerKey) => {
    setLoadingQuick(true);
    try {
      const formData = new FormData();
      const banner = quickBanners[bannerKey];
      
      if (banner.file) {
        formData.append('image', banner.file);
      }
      formData.append('url', banner.url || '');
      
      const response = await apiService.post(
        `${API_PREFIX}/admin/banners/${bannerKey}`,
        formData
      );
      
      if (response && response.banner) {
        setQuickBanners(prev => ({
          ...prev,
          [bannerKey]: {
            ...prev[bannerKey],
            image: response.banner.image !== null && response.banner.image !== undefined 
              ? response.banner.image 
              : prev[bannerKey].image,
            file: null,
            url: response.banner.url !== undefined ? response.banner.url : prev[bannerKey].url
          }
        }));
      }
      setMessageVariant('success');
      setMessage(t('admin.content.banners.messages.saved', '保存成功'));
      setTimeout(() => setMessage(null), 3000);
      loggerService.info('Quick banner saved successfully', {
        module: 'BannerManagement',
        function: 'handleQuickBannerSave',
        banner_key: bannerKey
      });
    } catch (error) {
      loggerService.error('Failed to save quick banner', {
        module: 'BannerManagement',
        function: 'handleQuickBannerSave',
        banner_key: bannerKey,
        error_message: error.message,
        error_code: error.code
      });
      exceptionService.recordException(error, {
        request_path: window.location.pathname,
        error_code: 'SAVE_QUICK_BANNER_ERROR'
      });
      setMessageVariant('error');
      setMessage(error?.response?.data?.detail || error?.message || t('admin.content.banners.messages.saveFailed', '保存失败'));
    } finally {
      setLoadingQuick(false);
    }
  };

  return (
    <div>
      {message && (
        <Alert variant={messageVariant} className="mb-4">
          {message}
        </Alert>
      )}
      
      <div className="w-full">
        {loadingQuick ? (
          <div className="p-6 text-center text-gray-500">{t('common.loading', '加载中...')}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { key: 'main_primary', label: t('admin.dashboard.banner.mainBanner', '主页横幅') },
              { key: 'about', label: t('admin.dashboard.banner.systemIntro', '系统介绍') },
              { key: 'projects', label: t('admin.dashboard.banner.projects', '项目') },
              { key: 'performance', label: t('admin.dashboard.banner.performance', '绩效') },
              { key: 'support', label: t('admin.dashboard.banner.support', '支持') }
            ].map(({ key, label }) => (
              <Card key={key} className="w-full min-w-0 flex flex-col p-6 md:p-4">
                <h3 className="text-lg font-semibold text-gray-800 m-0 mb-6 md:text-base md:mb-4">{label}</h3>
                
                <div className="flex flex-col gap-4 md:gap-3">
                  <div className="flex flex-col gap-3">
                    <label className="text-sm text-gray-600 font-medium">{t('admin.dashboard.banner.image', '图片')}</label>
                    <div className="flex flex-col gap-3">
                      {quickBanners[key].image && (
                        <img 
                          src={quickBanners[key].image} 
                          alt={label}
                          className="max-w-full max-h-[120px] object-contain rounded"
                        />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        ref={(el) => (fileInputRefs.current[key] = el)}
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleQuickBannerImageChange(key, e.target.files[0]);
                          }
                        }}
                        className="hidden"
                        id={`banner-${key}-file`}
                      />
                      <Button 
                        variant="outline" 
                        type="button" 
                        className="w-full"
                        onClick={() => {
                          fileInputRefs.current[key]?.click();
                        }}
                      >
                        {t('admin.dashboard.banner.upload', '上传图片')}
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 mt-4">
                    <label className="text-sm text-gray-600 font-medium">{t('admin.dashboard.banner.url', '链接URL')}</label>
                    <Input
                      type="text"
                      value={quickBanners[key].url}
                      onChange={(e) => handleQuickBannerUrlChange(key, e.target.value)}
                      placeholder={t('admin.dashboard.banner.urlPlaceholder', 'https://example.com')}
                      className="w-full py-3 px-3 border border-gray-300 rounded text-sm font-inherit focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                    />
                  </div>

                  <div className="mt-4 md:mt-3">
                    <Button 
                      onClick={() => handleQuickBannerSave(key)} 
                      className="w-full"
                      loading={loadingQuick}
                    >
                      {t('admin.dashboard.banner.save', '保存')}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
