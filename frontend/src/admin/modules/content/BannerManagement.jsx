/**
 * Banner Management Component
 * 横幅管理组件 - 支持桌面端和移动端图片上传
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Button, Input, Alert } from '@shared/components';
import { apiService } from '@shared/services';
import { API_PREFIX } from '@shared/utils/constants';

export default function BannerManagement() {
  const { t } = useTranslation();
  
  // Quick banner management state (by key)
  const [quickBanners, setQuickBanners] = useState({
    mainPrimary: { image: null, mobileImage: null, file: null, mobileFile: null, url: '' },
    about: { image: null, mobileImage: null, file: null, mobileFile: null, url: '' },
    projects: { image: null, mobileImage: null, file: null, mobileFile: null, url: '' },
    performance: { image: null, mobileImage: null, file: null, mobileFile: null, url: '' },
    support: { image: null, mobileImage: null, file: null, mobileFile: null, url: '' }
  });
  const [loadingQuick, setLoadingQuick] = useState(false);
  const [message, setMessage] = useState(null);
  const [messageVariant, setMessageVariant] = useState('success');
  const fileInputRefs = useRef({});
  const mobileFileInputRefs = useRef({});

  // Quick banner management functions
  const loadQuickBanners = useCallback(async () => {
    setLoadingQuick(true);
    const response = await apiService.get(`${API_PREFIX}/admin/banners`);
    if (response && response.banners) {
      const bannerKeys = ['mainPrimary', 'about', 'projects', 'performance', 'support'];
      const normalizedBanners = {};
      bannerKeys.forEach(key => {
        const banner = response.banners[key] || {};
        normalizedBanners[key] = {
          image: banner.image || null,
          mobileImage: banner.mobileImage || null,
          file: null,
          mobileFile: null,
          url: banner.url || ''
        };
      });
      setQuickBanners(normalizedBanners);
    }
    setLoadingQuick(false);
  }, []);

  useEffect(() => {
    loadQuickBanners();
  }, [loadQuickBanners]);

  const handleQuickBannerImageChange = (bannerKey, file, isMobile = false) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setQuickBanners(prev => ({
          ...prev,
          [bannerKey]: {
            ...prev[bannerKey],
            ...(isMobile 
              ? { mobileImage: e.target.result, mobileFile: file }
              : { image: e.target.result, file: file }
            )
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
    const formData = new FormData();
    const banner = quickBanners[bannerKey];
    
    if (banner.file) {
      formData.append('image', banner.file);
    }
    if (banner.mobileFile) {
      formData.append('mobile_image', banner.mobileFile);
    }
    formData.append('url', banner.url || '');
    
    // Convert camelCase to snake_case for API endpoint
    const apiKey = bannerKey === 'mainPrimary' ? 'main_primary' : bannerKey;
    
    const response = await apiService.post(
      `${API_PREFIX}/admin/banners/${apiKey}`,
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
          mobileImage: response.banner.mobileImage !== null && response.banner.mobileImage !== undefined
            ? response.banner.mobileImage
            : prev[bannerKey].mobileImage,
          file: null,
          mobileFile: null,
          url: response.banner.url !== undefined ? response.banner.url : prev[bannerKey].url
        }
      }));
    }
    setMessageVariant('success');
    setMessage(t('admin.content.banners.messages.saved', '저장되었습니다'));
    setTimeout(() => setMessage(null), 3000);
    setLoadingQuick(false);
  };

  return (
    <div>
      {message && (
        <Alert variant={messageVariant} className="mb-4">
          {message}
        </Alert>
      )}
      
      {loadingQuick ? (
        <div className="p-6 text-center text-gray-500">{t('common.loading', '로딩 중...')}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { key: 'mainPrimary', label: t('admin.content.banners.types.mainBanner', '메인 배너') },
              { key: 'about', label: t('admin.content.banners.types.systemIntro', '시스템 소개') },
              { key: 'projects', label: t('admin.content.banners.types.projects', '지원사업') },
              { key: 'performance', label: t('admin.content.banners.types.performance', '성과') },
              { key: 'support', label: t('admin.content.banners.types.support', '지원') }
            ].map(({ key, label }) => (
              <Card key={key} className="w-full min-w-0 flex flex-col p-6 md:p-4">
                <h3 className="text-lg font-semibold text-gray-800 m-0 mb-6 md:text-base md:mb-4">{label}</h3>
                
                <div className="flex flex-col gap-4 md:gap-3">
                  {/* Desktop Image Upload */}
                  <div className="flex flex-col gap-3">
                    <label className="text-sm text-gray-600 font-medium">
                      {t('admin.content.banners.form.fields.desktopImage', '데스크톱 이미지')}
                    </label>
                    <p className="text-xs text-gray-400 m-0">
                      {t('admin.content.banners.form.fields.desktopImageHint', '권장: 1920 x 600 (16:5), 최소: 1440 x 450')}
                    </p>
                    <div className="flex flex-col gap-3">
                      {quickBanners[key].image && (
                        <img 
                          src={quickBanners[key].image} 
                          alt={`${label} - Desktop`}
                          className="max-w-full max-h-[100px] object-contain rounded border border-gray-200"
                        />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        ref={(el) => (fileInputRefs.current[key] = el)}
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleQuickBannerImageChange(key, e.target.files[0], false);
                          }
                        }}
                        className="hidden"
                        id={`banner-${key}-file`}
                      />
                      <Button 
                        variant="outline" 
                        type="button" 
                        className="w-full text-sm py-2"
                        onClick={() => {
                          fileInputRefs.current[key]?.click();
                        }}
                      >
                        {t('admin.content.banners.actions.uploadDesktop', '데스크톱 이미지 업로드')}
                      </Button>
                    </div>
                  </div>

                  {/* Mobile Image Upload */}
                  <div className="flex flex-col gap-3 mt-2">
                    <label className="text-sm text-gray-600 font-medium">
                      {t('admin.content.banners.form.fields.mobileImage', '모바일 이미지')}
                    </label>
                    <p className="text-xs text-gray-400 m-0">
                      {t('admin.content.banners.form.fields.mobileImageHint', '권장: 1080 x 1350 (4:5), 최소: 750 x 938')}
                    </p>
                    <div className="flex flex-col gap-3">
                      {quickBanners[key].mobileImage && (
                        <img 
                          src={quickBanners[key].mobileImage} 
                          alt={`${label} - Mobile`}
                          className="max-w-full max-h-[100px] object-contain rounded border border-gray-200"
                        />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        ref={(el) => (mobileFileInputRefs.current[key] = el)}
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleQuickBannerImageChange(key, e.target.files[0], true);
                          }
                        }}
                        className="hidden"
                        id={`banner-${key}-mobile-file`}
                      />
                      <Button 
                        variant="outline" 
                        type="button" 
                        className="w-full text-sm py-2"
                        onClick={() => {
                          mobileFileInputRefs.current[key]?.click();
                        }}
                      >
                        {t('admin.content.banners.actions.uploadMobile', '모바일 이미지 업로드')}
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 mt-4">
                    <label className="text-sm text-gray-600 font-medium">{t('admin.content.banners.form.fields.url', '링크 URL')}</label>
                    <Input
                      type="text"
                      value={quickBanners[key].url}
                      onChange={(e) => handleQuickBannerUrlChange(key, e.target.value)}
                      placeholder={t('admin.content.banners.form.fields.urlPlaceholder', 'https://example.com')}
                      className="w-full py-3 px-3 border border-gray-300 rounded text-sm font-inherit focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                    />
                  </div>

                  <div className="mt-4 md:mt-3">
                    <Button 
                      onClick={() => handleQuickBannerSave(key)} 
                      className="w-full text-sm py-2"
                      loading={loadingQuick}
                    >
                      {t('admin.content.banners.actions.save', '저장')}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}
