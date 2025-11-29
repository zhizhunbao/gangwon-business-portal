/**
 * BannerManagement Component - 横幅管理
 * 管理主横幅和4个主菜单的下级横幅图片
 */

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { Card, Button, Input, Loading } from '@shared/components';
import { apiService } from '@shared/services';
import { API_PREFIX } from '@shared/utils/constants';

import './Dashboard.css';

export default function BannerManagement() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const fileInputRefs = useRef({});
  const [banners, setBanners] = useState({
    main: { image: null, file: null, url: '' },
    systemIntro: { image: null, file: null, url: '' },
    projects: { image: null, file: null, url: '' },
    performance: { image: null, file: null, url: '' },
    support: { image: null, file: null, url: '' }
  });

  useEffect(() => {
    loadBanners();
  }, []);

  const loadBanners = async () => {
    setLoading(true);
    try {
      const response = await apiService.get(`${API_PREFIX}/admin/banners`);
      if (response && response.banners) {
        const bannerKeys = ['main', 'systemIntro', 'projects', 'performance', 'support'];
        const normalizedBanners = {};
        bannerKeys.forEach(key => {
          const banner = response.banners[key] || {};
          normalizedBanners[key] = {
            image: banner.image || null,
            file: null, // 从服务器加载的图片不需要文件对象
            url: banner.url || ''
          };
        });
        setBanners(normalizedBanners);
      }
    } catch (error) {
      console.error('Failed to load banners:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (bannerKey, file) => {
    if (file && file.type.startsWith('image/')) {
      // 保存文件对象用于上传
      const reader = new FileReader();
      reader.onload = (e) => {
        setBanners(prev => ({
          ...prev,
          [bannerKey]: {
            ...prev[bannerKey],
            image: e.target.result, // base64 预览
            file: file // 保存原始文件对象用于上传
          }
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUrlChange = (bannerKey, url) => {
    setBanners(prev => ({
      ...prev,
      [bannerKey]: {
        ...prev[bannerKey],
        url
      }
    }));
  };


  const handleSave = async (bannerKey) => {
    setLoading(true);
    try {
      const formData = new FormData();
      const banner = banners[bannerKey];
      
      // 如果有新文件，添加到 FormData
      if (banner.file) {
        formData.append('image', banner.file);
      }
      
      // 添加 URL（即使为空也发送，以便清除 URL）
      formData.append('url', banner.url || '');
      
      // 发送请求（不手动设置 Content-Type，让 axios 自动处理 FormData 和 boundary）
      const response = await apiService.post(
        `${API_PREFIX}/admin/banners/${bannerKey}`,
        formData
      );
      
      // 更新本地状态（使用服务器返回的图片 URL）
      if (response && response.banner) {
        setBanners(prev => ({
          ...prev,
          [bannerKey]: {
            ...prev[bannerKey],
            // 如果有新图片 URL，使用新的；否则保留原有的
            image: response.banner.image !== null && response.banner.image !== undefined 
              ? response.banner.image 
              : prev[bannerKey].image,
            file: null, // 上传成功后清除文件对象
            url: response.banner.url !== undefined ? response.banner.url : prev[bannerKey].url
          }
        }));
      }
    } catch (error) {
      console.error('Failed to save banner:', error);
      alert(t('admin.dashboard.banner.saveError') || '保存失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const bannerConfig = [
    { key: 'main', label: t('admin.dashboard.banner.mainBanner') },
    { key: 'systemIntro', label: t('admin.dashboard.banner.systemIntro') },
    { key: 'projects', label: t('admin.dashboard.banner.projects') },
    { key: 'performance', label: t('admin.dashboard.banner.performance') },
    { key: 'support', label: t('admin.dashboard.banner.support') }
  ];

  return (
    <div className="banner-management">
      <div className="dashboard-header">
        <h2 className="page-title">{t('admin.dashboard.banner.title')}</h2>
      </div>

      {loading ? (
        <Loading />
      ) : (
        <div className="banner-grid">
          {bannerConfig.map(({ key, label }) => (
            <Card key={key} className="banner-card">
              <h3 className="section-title">{label}</h3>
              
              <div className="banner-form">
                <div className="banner-item">
                  <label>{t('admin.dashboard.banner.image')}</label>
                  <div className="banner-image-container">
                    {banners[key].image && (
                      <img 
                        src={banners[key].image} 
                        alt={label}
                        className="banner-preview"
                      />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      ref={(el) => (fileInputRefs.current[key] = el)}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleImageChange(key, e.target.files[0]);
                        }
                      }}
                      className="file-input-hidden"
                      id={`banner-${key}-file`}
                    />
                    <Button 
                      variant="outline" 
                      type="button" 
                      className="full-width-button"
                      onClick={() => {
                        fileInputRefs.current[key]?.click();
                      }}
                    >
                      {t('admin.dashboard.banner.upload')}
                    </Button>
                  </div>
                </div>

                <div className="banner-item banner-item-spaced">
                  <label>{t('admin.dashboard.banner.url')}</label>
                  <Input
                    type="text"
                    value={banners[key].url}
                    onChange={(e) => handleUrlChange(key, e.target.value)}
                    placeholder={t('admin.dashboard.banner.urlPlaceholder')}
                  />
                </div>

                <div className="banner-actions">
                  <Button onClick={() => handleSave(key)} className="full-width-button">
                    {t('admin.dashboard.banner.save')}
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

