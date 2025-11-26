/**
 * Content Management Component - Admin Portal
 * 内容管理（横幅、弹窗、公告、新闻资料）
 */

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Button, Tabs, Input, Textarea, Select, Badge, Alert } from '@shared/components';
import { apiService, contentService } from '@shared/services';
import { API_PREFIX } from '@shared/utils/constants';
import './ContentManagement.css';

export default function ContentManagement() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('banners');
  const [popups, setPopups] = useState([]);
  const [loadingPopups, setLoadingPopups] = useState(false);
  const [popupForm, setPopupForm] = useState(createEmptyPopupForm());
  const [popupErrors, setPopupErrors] = useState({});
  const [popupMessage, setPopupMessage] = useState(null);
  const [popupMessageVariant, setPopupMessageVariant] = useState('success');
  const [savingPopup, setSavingPopup] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  
  // Banners state
  const [banners, setBanners] = useState([]);
  const [loadingBanners, setLoadingBanners] = useState(false);
  const [bannerForm, setBannerForm] = useState(createEmptyBannerForm());
  const [bannerErrors, setBannerErrors] = useState({});
  const [bannerMessage, setBannerMessage] = useState(null);
  const [bannerMessageVariant, setBannerMessageVariant] = useState('success');
  const [savingBanner, setSavingBanner] = useState(false);
  
  // Notices state
  const [notices, setNotices] = useState([]);
  const [loadingNotices, setLoadingNotices] = useState(false);
  const [noticeForm, setNoticeForm] = useState(createEmptyNoticeForm());
  const [noticeErrors, setNoticeErrors] = useState({});
  const [noticeMessage, setNoticeMessage] = useState(null);
  const [noticeMessageVariant, setNoticeMessageVariant] = useState('success');
  const [savingNotice, setSavingNotice] = useState(false);
  const [noticesPage, setNoticesPage] = useState(1);
  const [noticesTotal, setNoticesTotal] = useState(0);
  
  // News (Press Releases) state
  const [news, setNews] = useState([]);
  const [loadingNews, setLoadingNews] = useState(false);
  const [newsForm, setNewsForm] = useState(createEmptyNewsForm());
  const [newsErrors, setNewsErrors] = useState({});
  const [newsMessage, setNewsMessage] = useState(null);
  const [newsMessageVariant, setNewsMessageVariant] = useState('success');
  const [savingNews, setSavingNews] = useState(false);
  const [newsPage, setNewsPage] = useState(1);
  const [newsTotal, setNewsTotal] = useState(0);

  // 使用 useMemo 缓存 tabs 配置
  const tabs = useMemo(() => [
    { key: 'banners', label: t('admin.content.tabs.banners') },
    { key: 'popups', label: t('admin.content.tabs.popups') },
    { key: 'notices', label: t('admin.content.tabs.notices') },
    { key: 'news', label: t('admin.content.tabs.news') }
  ], [t]);

  const positionOptions = useMemo(() => [
    { value: 'center', label: t('admin.content.popups.positions.center') },
    { value: 'left', label: t('admin.content.popups.positions.left') },
    { value: 'right', label: t('admin.content.popups.positions.right') }
  ], [t]);
  
  const bannerTypeOptions = useMemo(() => [
    { value: 'MAIN', label: t('admin.content.banners.types.MAIN', '主页') },
    { value: 'INTRO', label: t('admin.content.banners.types.INTRO', '介绍') },
    { value: 'PROGRAM', label: t('admin.content.banners.types.PROGRAM', '项目') },
    { value: 'PERFORMANCE', label: t('admin.content.banners.types.PERFORMANCE', '绩效') },
    { value: 'SUPPORT', label: t('admin.content.banners.types.SUPPORT', '支持') }
  ], [t]);

  const loadPopups = useCallback(async () => {
    setLoadingPopups(true);
    try {
      const response = await apiService.get(`${API_PREFIX}/admin/content/popups`);
      setPopups(response.popups || []);
    } catch (error) {
      console.error('Failed to load popups', error);
      setPopupMessageVariant('error');
      setPopupMessage(t('admin.content.popups.messages.loadFailed'));
    } finally {
      setLoadingPopups(false);
    }
  }, [t]);

  // Load banners
  const loadBanners = useCallback(async () => {
    setLoadingBanners(true);
    try {
      const bannersData = await contentService.getAllBanners();
      setBanners(bannersData || []);
    } catch (error) {
      console.error('Failed to load banners', error);
      setBannerMessageVariant('error');
      setBannerMessage(t('admin.content.banners.messages.loadFailed', '加载横幅失败'));
    } finally {
      setLoadingBanners(false);
    }
  }, [t]);
  
  // Load notices
  const loadNotices = useCallback(async (page = 1) => {
    setLoadingNotices(true);
    try {
      const response = await contentService.listNotices({ page, pageSize: 20 });
      setNotices(response.items || []);
      setNoticesTotal(response.total || 0);
      setNoticesPage(page);
    } catch (error) {
      console.error('Failed to load notices', error);
      setNoticeMessageVariant('error');
      setNoticeMessage(t('admin.content.notices.messages.loadFailed', '加载公告失败'));
    } finally {
      setLoadingNotices(false);
    }
  }, [t]);
  
  // Load news
  const loadNews = useCallback(async (page = 1) => {
    setLoadingNews(true);
    try {
      const response = await contentService.listPressReleases({ page, pageSize: 20 });
      setNews(response.items || []);
      setNewsTotal(response.total || 0);
      setNewsPage(page);
    } catch (error) {
      console.error('Failed to load news', error);
      setNewsMessageVariant('error');
      setNewsMessage(t('admin.content.news.messages.loadFailed', '加载新闻失败'));
    } finally {
      setLoadingNews(false);
    }
  }, [t]);
  
  useEffect(() => {
    if (activeTab === 'popups') {
      loadPopups();
    } else if (activeTab === 'banners') {
      loadBanners();
    } else if (activeTab === 'notices') {
      loadNotices(1);
    } else if (activeTab === 'news') {
      loadNews(1);
    }
  }, [activeTab, loadPopups, loadBanners, loadNotices, loadNews]);

  const handlePopupFieldChange = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setPopupForm((prev) => ({
      ...prev,
      [field]: value
    }));
    if (popupErrors[field]) {
      setPopupErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handlePopupSelect = (popup) => {
    setPopupForm({
      ...popup,
      startDate: popup.startDate?.substring(0, 10) || '',
      endDate: popup.endDate?.substring(0, 10) || ''
    });
    setPopupErrors({});
    setPopupMessage(null);
  };

  const handleNewPopup = () => {
    setPopupForm(createEmptyPopupForm());
    setPopupErrors({});
    setPopupMessage(null);
  };

  const handlePopupSubmit = async (event) => {
    event.preventDefault();
    const errors = validatePopupForm(popupForm, t);
    setPopupErrors(errors);
    if (Object.keys(errors).length > 0) {
      setPopupMessageVariant('error');
      setPopupMessage(t('admin.content.popups.messages.validationError'));
      return;
    }

    setSavingPopup(true);
    try {
      const payload = normalizePopupPayload(popupForm);
      let response;
      if (popupForm.id) {
        response = await apiService.put(`${API_PREFIX}/admin/content/popups/${popupForm.id}`, payload);
      } else {
        response = await apiService.post(`${API_PREFIX}/admin/content/popups`, payload);
      }
      const savedPopup = response.popup;
      setPopups((prev) => {
        const index = prev.findIndex((item) => item.id === savedPopup.id);
        if (index === -1) {
          return [savedPopup, ...prev];
        }
        const next = [...prev];
        next[index] = savedPopup;
        return next;
      });
      setPopupForm({
        ...savedPopup,
        startDate: savedPopup.startDate?.substring(0, 10) || '',
        endDate: savedPopup.endDate?.substring(0, 10) || ''
      });
      setPopupMessageVariant('success');
      setPopupMessage(t('admin.content.popups.messages.saved'));
      // Auto-clear success message after 3 seconds
      setTimeout(() => {
        setPopupMessage(null);
      }, 3000);
    } catch (error) {
      console.error('Failed to save popup', error);
      setPopupMessageVariant('error');
      setPopupMessage(t('admin.content.popups.messages.saveFailed'));
    } finally {
      setSavingPopup(false);
    }
  };

  const handlePopupDelete = async (popupId) => {
    if (!popupId) return;
    if (!window.confirm(t('admin.content.popups.actions.confirmDelete'))) {
      return;
    }
    try {
      await apiService.delete(`${API_PREFIX}/admin/content/popups/${popupId}`);
      setPopups((prev) => prev.filter((popup) => popup.id !== popupId));
      if (popupForm.id === popupId) {
        setPopupForm(createEmptyPopupForm());
      }
      setPopupMessageVariant('success');
      setPopupMessage(t('admin.content.popups.messages.deleted'));
      // Auto-clear success message after 3 seconds
      setTimeout(() => {
        setPopupMessage(null);
      }, 3000);
    } catch (error) {
      console.error('Failed to delete popup', error);
      setPopupMessageVariant('error');
      setPopupMessage(t('admin.content.popups.messages.deleteFailed'));
    }
  };

  const handleImageUpload = async (event, setForm, setMessage, setMessageVariant) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessageVariant('error');
      setMessage(t('admin.content.popups.messages.invalidImageType', '请选择图片文件'));
      event.target.value = '';
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setMessageVariant('error');
      setMessage(t('admin.content.popups.messages.imageTooLarge', '图片大小不能超过 5MB'));
      event.target.value = '';
      return;
    }

    setImageUploading(true);
    setMessage(null);
    try {
      const response = await apiService.upload(`${API_PREFIX}/upload/public`, file);
      const uploadedFile = response.file || response.files?.[0];
      if (uploadedFile?.url) {
        setForm((prev) => ({
          ...prev,
          imageUrl: uploadedFile.url
        }));
        setMessageVariant('success');
        setMessage(t('admin.content.popups.messages.imageUploaded', '图片上传成功'));
        // Auto-clear success message after 3 seconds
        setTimeout(() => {
          setMessage(null);
        }, 3000);
      } else {
        throw new Error('Upload response missing file URL');
      }
    } catch (error) {
      console.error('Failed to upload image', error);
      setMessageVariant('error');
      setMessage(
        error.message || t('admin.content.popups.messages.imageUploadFailed', '图片上传失败')
      );
    } finally {
      setImageUploading(false);
      event.target.value = '';
    }
  };
  
  // ========== Banner Handlers ==========
  
  const handleBannerFieldChange = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setBannerForm((prev) => ({
      ...prev,
      [field]: value
    }));
    if (bannerErrors[field]) {
      setBannerErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };
  
  const handleBannerSelect = (banner) => {
    setBannerForm(banner);
    setBannerErrors({});
    setBannerMessage(null);
  };
  
  const handleNewBanner = () => {
    setBannerForm(createEmptyBannerForm());
    setBannerErrors({});
    setBannerMessage(null);
  };
  
  const handleBannerSubmit = async (event) => {
    event.preventDefault();
    const errors = validateBannerForm(bannerForm, t);
    setBannerErrors(errors);
    if (Object.keys(errors).length > 0) {
      setBannerMessageVariant('error');
      setBannerMessage(t('admin.content.banners.messages.validationError', '请补全必填信息'));
      return;
    }
    
    setSavingBanner(true);
    try {
      let savedBanner;
      if (bannerForm.id) {
        savedBanner = await contentService.updateBanner(bannerForm.id, bannerForm);
      } else {
        savedBanner = await contentService.createBanner(bannerForm);
      }
      setBanners((prev) => {
        const index = prev.findIndex((item) => item.id === savedBanner.id);
        if (index === -1) {
          return [savedBanner, ...prev];
        }
        const next = [...prev];
        next[index] = savedBanner;
        return next;
      });
      setBannerForm(savedBanner);
      setBannerMessageVariant('success');
      setBannerMessage(t('admin.content.banners.messages.saved', '保存成功'));
      setTimeout(() => setBannerMessage(null), 3000);
    } catch (error) {
      console.error('Failed to save banner', error);
      setBannerMessageVariant('error');
      setBannerMessage(error?.response?.data?.detail || error?.message || t('admin.content.banners.messages.saveFailed', '保存失败'));
    } finally {
      setSavingBanner(false);
    }
  };
  
  const handleBannerDelete = async (bannerId) => {
    if (!bannerId) return;
    if (!window.confirm(t('admin.content.banners.actions.confirmDelete', '确定要删除这个横幅吗？'))) {
      return;
    }
    try {
      await contentService.deleteBanner(bannerId);
      setBanners((prev) => prev.filter((banner) => banner.id !== bannerId));
      if (bannerForm.id === bannerId) {
        setBannerForm(createEmptyBannerForm());
      }
      setBannerMessageVariant('success');
      setBannerMessage(t('admin.content.banners.messages.deleted', '删除成功'));
      setTimeout(() => setBannerMessage(null), 3000);
    } catch (error) {
      console.error('Failed to delete banner', error);
      setBannerMessageVariant('error');
      setBannerMessage(t('admin.content.banners.messages.deleteFailed', '删除失败'));
    }
  };
  
  // ========== Notice Handlers ==========
  
  const handleNoticeFieldChange = (field) => (event) => {
    const value = event.target.value;
    setNoticeForm((prev) => ({
      ...prev,
      [field]: value
    }));
    if (noticeErrors[field]) {
      setNoticeErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };
  
  const handleNoticeSelect = (notice) => {
    setNoticeForm({
      id: notice.id,
      title: notice.title,
      contentHtml: notice.contentHtml || '',
      boardType: notice.boardType || 'notice'
    });
    setNoticeErrors({});
    setNoticeMessage(null);
  };
  
  const handleNewNotice = () => {
    setNoticeForm(createEmptyNoticeForm());
    setNoticeErrors({});
    setNoticeMessage(null);
  };
  
  const handleNoticeSubmit = async (event) => {
    event.preventDefault();
    const errors = validateNoticeForm(noticeForm, t);
    setNoticeErrors(errors);
    if (Object.keys(errors).length > 0) {
      setNoticeMessageVariant('error');
      setNoticeMessage(t('admin.content.notices.messages.validationError', '请补全必填信息'));
      return;
    }
    
    setSavingNotice(true);
    try {
      let savedNotice;
      if (noticeForm.id) {
        savedNotice = await contentService.updateNotice(noticeForm.id, noticeForm);
      } else {
        savedNotice = await contentService.createNotice(noticeForm);
      }
      await loadNotices(noticesPage);
      setNoticeForm(savedNotice);
      setNoticeMessageVariant('success');
      setNoticeMessage(t('admin.content.notices.messages.saved', '保存成功'));
      setTimeout(() => setNoticeMessage(null), 3000);
    } catch (error) {
      console.error('Failed to save notice', error);
      setNoticeMessageVariant('error');
      setNoticeMessage(error?.response?.data?.detail || error?.message || t('admin.content.notices.messages.saveFailed', '保存失败'));
    } finally {
      setSavingNotice(false);
    }
  };
  
  const handleNoticeDelete = async (noticeId) => {
    if (!noticeId) return;
    if (!window.confirm(t('admin.content.notices.actions.confirmDelete', '确定要删除这个公告吗？'))) {
      return;
    }
    try {
      await contentService.deleteNotice(noticeId);
      await loadNotices(noticesPage);
      if (noticeForm.id === noticeId) {
        setNoticeForm(createEmptyNoticeForm());
      }
      setNoticeMessageVariant('success');
      setNoticeMessage(t('admin.content.notices.messages.deleted', '删除成功'));
      setTimeout(() => setNoticeMessage(null), 3000);
    } catch (error) {
      console.error('Failed to delete notice', error);
      setNoticeMessageVariant('error');
      setNoticeMessage(t('admin.content.notices.messages.deleteFailed', '删除失败'));
    }
  };
  
  // ========== News Handlers ==========
  
  const handleNewsFieldChange = (field) => (event) => {
    const value = event.target.value;
    setNewsForm((prev) => ({
      ...prev,
      [field]: value
    }));
    if (newsErrors[field]) {
      setNewsErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };
  
  const handleNewsSelect = (newsItem) => {
    setNewsForm({
      id: newsItem.id,
      title: newsItem.title,
      imageUrl: newsItem.imageUrl || ''
    });
    setNewsErrors({});
    setNewsMessage(null);
  };
  
  const handleNewNews = () => {
    setNewsForm(createEmptyNewsForm());
    setNewsErrors({});
    setNewsMessage(null);
  };
  
  const handleNewsSubmit = async (event) => {
    event.preventDefault();
    const errors = validateNewsForm(newsForm, t);
    setNewsErrors(errors);
    if (Object.keys(errors).length > 0) {
      setNewsMessageVariant('error');
      setNewsMessage(t('admin.content.news.messages.validationError', '请补全必填信息'));
      return;
    }
    
    setSavingNews(true);
    try {
      let savedNews;
      if (newsForm.id) {
        savedNews = await contentService.updatePressRelease(newsForm.id, newsForm);
      } else {
        savedNews = await contentService.createPressRelease(newsForm);
      }
      await loadNews(newsPage);
      setNewsForm(savedNews);
      setNewsMessageVariant('success');
      setNewsMessage(t('admin.content.news.messages.saved', '保存成功'));
      setTimeout(() => setNewsMessage(null), 3000);
    } catch (error) {
      console.error('Failed to save news', error);
      setNewsMessageVariant('error');
      setNewsMessage(error?.response?.data?.detail || error?.message || t('admin.content.news.messages.saveFailed', '保存失败'));
    } finally {
      setSavingNews(false);
    }
  };
  
  const handleNewsDelete = async (newsId) => {
    if (!newsId) return;
    if (!window.confirm(t('admin.content.news.actions.confirmDelete', '确定要删除这条新闻吗？'))) {
      return;
    }
    try {
      await contentService.deletePressRelease(newsId);
      await loadNews(newsPage);
      if (newsForm.id === newsId) {
        setNewsForm(createEmptyNewsForm());
      }
      setNewsMessageVariant('success');
      setNewsMessage(t('admin.content.news.messages.deleted', '删除成功'));
      setTimeout(() => setNewsMessage(null), 3000);
    } catch (error) {
      console.error('Failed to delete news', error);
      setNewsMessageVariant('error');
      setNewsMessage(t('admin.content.news.messages.deleteFailed', '删除失败'));
    }
  };

  return (
    <div className="admin-content-management">
      <div className="page-header">
        <h1 className="page-title">{t('admin.content.title')}</h1>
      </div>

      <Card>
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        <div className="tab-content">
          {activeTab === 'banners' && (
            <div className="popup-management">
              {bannerMessage && (
                <Alert variant={bannerMessageVariant} className="content-alert">
                  {bannerMessage}
                </Alert>
              )}
              <div className="popup-management-grid">
                <div className="popup-list-panel">
                  <div className="panel-header">
                    <div>
                      <h2>{t('admin.content.banners.list.title', '横幅列表')}</h2>
                      <p>{t('admin.content.banners.list.description', '管理网站横幅')}</p>
                    </div>
                    <Button type="button" variant="secondary" onClick={handleNewBanner}>
                      {t('admin.content.banners.actions.new', '新建')}
                    </Button>
                  </div>

                  {loadingBanners ? (
                    <div className="empty-state">{t('common.loading', '加载中...')}</div>
                  ) : banners.length === 0 ? (
                    <div className="empty-state">
                      <p>{t('admin.content.banners.list.empty', '暂无横幅')}</p>
                    </div>
                  ) : (
                    <ul className="popup-list">
                      {banners.map((banner) => (
                        <li
                          key={banner.id}
                          className={`popup-item ${bannerForm.id === banner.id ? 'active' : ''}`}
                          onClick={() => handleBannerSelect(banner)}
                        >
                          <div className="popup-item-body">
                            <div className="popup-item-title">
                              <span>{banner.bannerType}</span>
                              <Badge variant={banner.isActive ? 'success' : 'gray'}>
                                {banner.isActive
                                  ? t('admin.content.banners.status.active', '活跃')
                                  : t('admin.content.banners.status.inactive', '未激活')}
                              </Badge>
                            </div>
                            <p className="popup-item-meta">
                              {t('admin.content.banners.order', '顺序')}: {banner.displayOrder}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleBannerDelete(banner.id);
                            }}
                          >
                            {t('common.delete', '删除')}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="popup-form-panel">
                  <h3>
                    {bannerForm.id
                      ? t('admin.content.banners.form.editTitle', '编辑横幅')
                      : t('admin.content.banners.form.newTitle', '新建横幅')}
                  </h3>
                  <form onSubmit={handleBannerSubmit} className="popup-form">
                    <Select
                      label={t('admin.content.banners.form.fields.bannerType', '横幅类型')}
                      value={bannerForm.bannerType}
                      onChange={handleBannerFieldChange('bannerType')}
                      options={bannerTypeOptions}
                      required
                      error={bannerErrors.bannerType}
                    />
                    <Input
                      label={t('admin.content.banners.form.fields.imageUrl', '图片URL')}
                      value={bannerForm.imageUrl}
                      onChange={handleBannerFieldChange('imageUrl')}
                      placeholder="https://example.com/image.jpg"
                      required
                      error={bannerErrors.imageUrl}
                    />
                    <Input
                      label={t('admin.content.banners.form.fields.linkUrl', '链接URL')}
                      value={bannerForm.linkUrl || ''}
                      onChange={handleBannerFieldChange('linkUrl')}
                      placeholder="https://example.com"
                    />
                    <Input
                      label={t('admin.content.banners.form.fields.displayOrder', '显示顺序')}
                      type="number"
                      value={bannerForm.displayOrder || 0}
                      onChange={handleBannerFieldChange('displayOrder')}
                      min="0"
                    />
                    <div className="image-upload-field">
                      <label className="form-label">
                        {t('admin.content.banners.form.fields.image', '上传图片')}
                      </label>
                      <div className="image-upload-actions">
                        <div className="file-input-wrapper">
                          <input
                            id="banner-image-input"
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, setBannerForm, setBannerMessage, setBannerMessageVariant)}
                            disabled={imageUploading}
                            className="file-input"
                          />
                          <label htmlFor="banner-image-input" className="file-input-label">
                            {imageUploading
                              ? t('common.uploading', '上传中...')
                              : bannerForm.imageUrl
                              ? t('admin.content.banners.actions.changeImage', '更换图片')
                              : t('admin.content.banners.actions.selectImage', '选择图片')}
                          </label>
                        </div>
                        {bannerForm.imageUrl && (
                          <div className="image-preview-wrapper">
                            <img
                              src={bannerForm.imageUrl}
                              alt="Banner preview"
                              className="popup-image-preview"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setBannerForm((prev) => ({ ...prev, imageUrl: '' }));
                                setBannerMessage(null);
                              }}
                              className="remove-image-btn"
                            >
                              {t('common.remove', '移除')}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    <label className="toggle-field">
                      <input
                        type="checkbox"
                        checked={bannerForm.isActive !== undefined ? bannerForm.isActive : true}
                        onChange={handleBannerFieldChange('isActive')}
                      />
                      <span>{t('admin.content.banners.form.fields.isActive', '是否活跃')}</span>
                    </label>
                    <div className="form-actions">
                      <Button
                        type="submit"
                        variant="primary"
                        loading={savingBanner}
                      >
                        {bannerForm.id
                          ? t('admin.content.banners.actions.update', '更新')
                          : t('admin.content.banners.actions.create', '创建')}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'popups' && (
            <div className="popup-management">
              {popupMessage && (
                <Alert variant={popupMessageVariant} className="content-alert">
                  {popupMessage}
                </Alert>
              )}
              <div className="popup-management-grid">
                <div className="popup-list-panel">
                  <div className="panel-header">
                    <div>
                      <h2>{t('admin.content.popups.list.title')}</h2>
                      <p>{t('admin.content.popups.list.description')}</p>
                    </div>
                    <Button type="button" variant="secondary" onClick={handleNewPopup}>
                      {t('admin.content.popups.actions.new')}
                    </Button>
                  </div>

                  {loadingPopups ? (
                    <div className="empty-state">{t('common.loading', '加载中...')}</div>
                  ) : popups.length === 0 ? (
                    <div className="empty-state">
                      <p>{t('admin.content.popups.list.empty')}</p>
                    </div>
                  ) : (
                    <ul className="popup-list">
                      {popups.map((popup) => (
                        <li
                          key={popup.id}
                          className={`popup-item ${popupForm.id === popup.id ? 'active' : ''}`}
                          onClick={() => handlePopupSelect(popup)}
                        >
                          <div className="popup-item-body">
                            <div className="popup-item-title">
                              <span>{popup.title}</span>
                              <Badge variant={popup.isActive ? 'success' : 'gray'}>
                                {popup.isActive
                                  ? t('admin.content.popups.status.active')
                                  : t('admin.content.popups.status.inactive')}
                              </Badge>
                            </div>
                            <p className="popup-item-meta">
                              {formatDateRange(popup.startDate, popup.endDate, t)}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(event) => {
                              event.stopPropagation();
                              handlePopupDelete(popup.id);
                            }}
                          >
                            {t('common.delete', '删除')}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="popup-form-panel">
                  <h3>
                    {popupForm.id
                      ? t('admin.content.popups.form.editTitle')
                      : t('admin.content.popups.form.newTitle')}
                  </h3>
                  <form onSubmit={handlePopupSubmit} className="popup-form">
                    <Input
                      label={t('admin.content.popups.form.fields.title')}
                      value={popupForm.title}
                      onChange={handlePopupFieldChange('title')}
                      required
                      error={popupErrors.title}
                    />
                    <Textarea
                      label={t('admin.content.popups.form.fields.content')}
                      value={popupForm.content}
                      onChange={handlePopupFieldChange('content')}
                      rows={4}
                      required
                      error={popupErrors.content}
                    />
                    <Input
                      label={t('admin.content.popups.form.fields.linkUrl')}
                      value={popupForm.linkUrl}
                      onChange={handlePopupFieldChange('linkUrl')}
                      placeholder="https://example.com"
                    />
                    <div className="field-row">
                      <Input
                        label={t('admin.content.popups.form.fields.startDate')}
                        type="date"
                        value={popupForm.startDate}
                        onChange={handlePopupFieldChange('startDate')}
                        required
                        error={popupErrors.startDate}
                      />
                      <Input
                        label={t('admin.content.popups.form.fields.endDate')}
                        type="date"
                        value={popupForm.endDate}
                        onChange={handlePopupFieldChange('endDate')}
                      />
                    </div>
                    <div className="field-row">
                      <Input
                        label={t('admin.content.popups.form.fields.width')}
                        type="number"
                        value={popupForm.width}
                        onChange={handlePopupFieldChange('width')}
                        min="200"
                        error={popupErrors.width}
                      />
                      <Input
                        label={t('admin.content.popups.form.fields.height')}
                        type="number"
                        value={popupForm.height}
                        onChange={handlePopupFieldChange('height')}
                        min="200"
                        error={popupErrors.height}
                      />
                    </div>
                    <Select
                      label={t('admin.content.popups.form.fields.position')}
                      value={popupForm.position}
                      onChange={handlePopupFieldChange('position')}
                      options={positionOptions}
                    />

                    <div className="image-upload-field">
                      <label className="form-label">
                        {t('admin.content.popups.form.fields.image')}
                      </label>
                      <div className="image-upload-actions">
                        <div className="file-input-wrapper">
                          <input
                            id="popup-image-input"
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, setPopupForm, setPopupMessage, setPopupMessageVariant)}
                            disabled={imageUploading}
                            className="file-input"
                          />
                          <label htmlFor="popup-image-input" className="file-input-label">
                            {imageUploading
                              ? t('common.uploading', '上传中...')
                              : popupForm.imageUrl
                              ? t('admin.content.popups.actions.changeImage', '更换图片')
                              : t('admin.content.popups.actions.selectImage', '选择图片')}
                          </label>
                        </div>
                        {popupForm.imageUrl && (
                          <div className="image-preview-wrapper">
                            <img
                              src={popupForm.imageUrl}
                              alt={popupForm.title || 'Popup preview'}
                              className="popup-image-preview"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setPopupForm((prev) => ({ ...prev, imageUrl: '' }));
                                setPopupMessage(null);
                              }}
                              className="remove-image-btn"
                            >
                              {t('common.remove', '移除')}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    <label className="toggle-field">
                      <input
                        type="checkbox"
                        checked={popupForm.isActive}
                        onChange={handlePopupFieldChange('isActive')}
                      />
                      <span>{t('admin.content.popups.form.fields.isActive')}</span>
                    </label>

                    <div className="form-actions">
                      <Button
                        type="submit"
                        variant="primary"
                        loading={savingPopup}
                      >
                        {popupForm.id
                          ? t('admin.content.popups.actions.update')
                          : t('admin.content.popups.actions.create')}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notices' && (
            <div className="popup-management">
              {noticeMessage && (
                <Alert variant={noticeMessageVariant} className="content-alert">
                  {noticeMessage}
                </Alert>
              )}
              <div className="popup-management-grid">
                <div className="popup-list-panel">
                  <div className="panel-header">
                    <div>
                      <h2>{t('admin.content.notices.list.title', '公告列表')}</h2>
                      <p>{t('admin.content.notices.list.description', '管理网站公告')}</p>
                    </div>
                    <Button type="button" variant="secondary" onClick={handleNewNotice}>
                      {t('admin.content.notices.actions.new', '新建')}
                    </Button>
                  </div>

                  {loadingNotices ? (
                    <div className="empty-state">{t('common.loading', '加载中...')}</div>
                  ) : notices.length === 0 ? (
                    <div className="empty-state">
                      <p>{t('admin.content.notices.list.empty', '暂无公告')}</p>
                    </div>
                  ) : (
                    <ul className="popup-list">
                      {notices.map((notice) => (
                        <li
                          key={notice.id}
                          className={`popup-item ${noticeForm.id === notice.id ? 'active' : ''}`}
                          onClick={() => handleNoticeSelect(notice)}
                        >
                          <div className="popup-item-body">
                            <div className="popup-item-title">
                              <span>{notice.title}</span>
                            </div>
                            <p className="popup-item-meta">
                              {notice.createdAt ? new Date(notice.createdAt).toLocaleDateString() : ''} | {t('admin.content.notices.views', '浏览')}: {notice.viewCount || 0}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleNoticeDelete(notice.id);
                            }}
                          >
                            {t('common.delete', '删除')}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="popup-form-panel">
                  <h3>
                    {noticeForm.id
                      ? t('admin.content.notices.form.editTitle', '编辑公告')
                      : t('admin.content.notices.form.newTitle', '新建公告')}
                  </h3>
                  <form onSubmit={handleNoticeSubmit} className="popup-form">
                    <Input
                      label={t('admin.content.notices.form.fields.title', '标题')}
                      value={noticeForm.title}
                      onChange={handleNoticeFieldChange('title')}
                      required
                      error={noticeErrors.title}
                    />
                    <Textarea
                      label={t('admin.content.notices.form.fields.contentHtml', '内容 (HTML)')}
                      value={noticeForm.contentHtml}
                      onChange={handleNoticeFieldChange('contentHtml')}
                      rows={12}
                      required
                      error={noticeErrors.contentHtml}
                      help={t('admin.content.notices.form.fields.contentHtmlHelp', '支持 HTML 格式，可以使用富文本编辑器')}
                    />
                    <div className="form-actions">
                      <Button
                        type="submit"
                        variant="primary"
                        loading={savingNotice}
                      >
                        {noticeForm.id
                          ? t('admin.content.notices.actions.update', '更新')
                          : t('admin.content.notices.actions.create', '创建')}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'news' && (
            <div className="popup-management">
              {newsMessage && (
                <Alert variant={newsMessageVariant} className="content-alert">
                  {newsMessage}
                </Alert>
              )}
              <div className="popup-management-grid">
                <div className="popup-list-panel">
                  <div className="panel-header">
                    <div>
                      <h2>{t('admin.content.news.list.title', '新闻列表')}</h2>
                      <p>{t('admin.content.news.list.description', '管理新闻稿')}</p>
                    </div>
                    <Button type="button" variant="secondary" onClick={handleNewNews}>
                      {t('admin.content.news.actions.new', '新建')}
                    </Button>
                  </div>

                  {loadingNews ? (
                    <div className="empty-state">{t('common.loading', '加载中...')}</div>
                  ) : news.length === 0 ? (
                    <div className="empty-state">
                      <p>{t('admin.content.news.list.empty', '暂无新闻')}</p>
                    </div>
                  ) : (
                    <ul className="popup-list">
                      {news.map((newsItem) => (
                        <li
                          key={newsItem.id}
                          className={`popup-item ${newsForm.id === newsItem.id ? 'active' : ''}`}
                          onClick={() => handleNewsSelect(newsItem)}
                        >
                          <div className="popup-item-body">
                            <div className="popup-item-title">
                              <span>{newsItem.title}</span>
                            </div>
                            <p className="popup-item-meta">
                              {newsItem.createdAt ? new Date(newsItem.createdAt).toLocaleDateString() : ''}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleNewsDelete(newsItem.id);
                            }}
                          >
                            {t('common.delete', '删除')}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="popup-form-panel">
                  <h3>
                    {newsForm.id
                      ? t('admin.content.news.form.editTitle', '编辑新闻')
                      : t('admin.content.news.form.newTitle', '新建新闻')}
                  </h3>
                  <form onSubmit={handleNewsSubmit} className="popup-form">
                    <Input
                      label={t('admin.content.news.form.fields.title', '标题')}
                      value={newsForm.title}
                      onChange={handleNewsFieldChange('title')}
                      required
                      error={newsErrors.title}
                    />
                    <Input
                      label={t('admin.content.news.form.fields.imageUrl', '图片URL')}
                      value={newsForm.imageUrl}
                      onChange={handleNewsFieldChange('imageUrl')}
                      placeholder="https://example.com/image.jpg"
                      required
                      error={newsErrors.imageUrl}
                    />
                    <div className="image-upload-field">
                      <label className="form-label">
                        {t('admin.content.news.form.fields.image', '上传图片')}
                      </label>
                      <div className="image-upload-actions">
                        <div className="file-input-wrapper">
                          <input
                            id="news-image-input"
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, setNewsForm, setNewsMessage, setNewsMessageVariant)}
                            disabled={imageUploading}
                            className="file-input"
                          />
                          <label htmlFor="news-image-input" className="file-input-label">
                            {imageUploading
                              ? t('common.uploading', '上传中...')
                              : newsForm.imageUrl
                              ? t('admin.content.news.actions.changeImage', '更换图片')
                              : t('admin.content.news.actions.selectImage', '选择图片')}
                          </label>
                        </div>
                        {newsForm.imageUrl && (
                          <div className="image-preview-wrapper">
                            <img
                              src={newsForm.imageUrl}
                              alt="News preview"
                              className="popup-image-preview"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setNewsForm((prev) => ({ ...prev, imageUrl: '' }));
                                setNewsMessage(null);
                              }}
                              className="remove-image-btn"
                            >
                              {t('common.remove', '移除')}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="form-actions">
                      <Button
                        type="submit"
                        variant="primary"
                        loading={savingNews}
                      >
                        {newsForm.id
                          ? t('admin.content.news.actions.update', '更新')
                          : t('admin.content.news.actions.create', '创建')}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function createEmptyPopupForm() {
  return {
    id: null,
    title: '',
    content: '',
    imageUrl: '',
    linkUrl: '',
    width: 600,
    height: 400,
    position: 'center',
    isActive: true,
    startDate: '',
    endDate: ''
  };
}

function normalizePopupPayload(form) {
  return {
    title: form.title,
    content: form.content,
    imageUrl: form.imageUrl,
    linkUrl: form.linkUrl,
    width: Number(form.width) || 600,
    height: Number(form.height) || 400,
    position: form.position,
    isActive: Boolean(form.isActive),
    startDate: form.startDate,
    endDate: form.endDate || null
  };
}

function validatePopupForm(form, t) {
  const errors = {};
  if (!form.title?.trim()) {
    errors.title = t('validation.required', { field: t('admin.content.popups.form.fields.title') });
  }
  if (!form.content?.trim()) {
    errors.content = t('validation.required', { field: t('admin.content.popups.form.fields.content') });
  }
  if (!form.startDate) {
    errors.startDate = t('validation.required', { field: t('admin.content.popups.form.fields.startDate') });
  }
  if (form.endDate && form.startDate && form.endDate < form.startDate) {
    errors.endDate = t('admin.content.popups.validation.endDateBeforeStart', '结束日期不能早于开始日期');
  }
  if (form.width && Number(form.width) < 200) {
    errors.width = t('admin.content.popups.validation.minWidth');
  }
  if (form.height && Number(form.height) < 200) {
    errors.height = t('admin.content.popups.validation.minHeight');
  }
  return errors;
}

function formatDateRange(startDate, endDate, t) {
  if (!startDate) return '';
  
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('ko-KR', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      });
    } catch {
      return dateStr;
    }
  };
  
  const start = formatDate(startDate);
  const end = endDate ? formatDate(endDate) : t('admin.content.popups.labels.noEndDate');
  
  return `${start} ~ ${end}`;
}

function createEmptyBannerForm() {
  return {
    id: null,
    bannerType: '',
    imageUrl: '',
    linkUrl: '',
    isActive: true,
    displayOrder: 0
  };
}

function validateBannerForm(form, t) {
  const errors = {};
  if (!form.bannerType?.trim()) {
    errors.bannerType = t('validation.required', { field: t('admin.content.banners.form.fields.bannerType', '横幅类型') });
  }
  if (!form.imageUrl?.trim()) {
    errors.imageUrl = t('validation.required', { field: t('admin.content.banners.form.fields.imageUrl', '图片URL') });
  }
  return errors;
}

function createEmptyNoticeForm() {
  return {
    id: null,
    title: '',
    contentHtml: '',
    boardType: 'notice'
  };
}

function validateNoticeForm(form, t) {
  const errors = {};
  if (!form.title?.trim()) {
    errors.title = t('validation.required', { field: t('admin.content.notices.form.fields.title', '标题') });
  }
  if (!form.contentHtml?.trim()) {
    errors.contentHtml = t('validation.required', { field: t('admin.content.notices.form.fields.contentHtml', '内容') });
  }
  return errors;
}

function createEmptyNewsForm() {
  return {
    id: null,
    title: '',
    imageUrl: ''
  };
}

function validateNewsForm(form, t) {
  const errors = {};
  if (!form.title?.trim()) {
    errors.title = t('validation.required', { field: t('admin.content.news.form.fields.title', '标题') });
  }
  if (!form.imageUrl?.trim()) {
    errors.imageUrl = t('validation.required', { field: t('admin.content.news.form.fields.imageUrl', '图片URL') });
  }
  return errors;
}

