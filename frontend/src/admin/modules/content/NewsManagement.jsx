/**
 * News Management Component
 * 新闻管理组件
 */

import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Input, Alert } from '@shared/components';
import { apiService, contentService, loggerService, exceptionService } from '@shared/services';
import { API_PREFIX } from '@shared/utils/constants';
import { validateImageFile } from '@shared/utils/fileValidation';
import { validateNewsForm } from './utils';

export default function NewsManagement() {
  const { t } = useTranslation();
  
  // State
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(createEmptyForm());
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [messageVariant, setMessageVariant] = useState('success');
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [imageUploading, setImageUploading] = useState(false);

  // Load news
  const loadNews = useCallback(async (pageNum = 1) => {
    setLoading(true);
    try {
      const response = await contentService.listPressReleases({ page: pageNum, pageSize: 20 });
      setNews(response.items || []);
      setTotal(response.total || 0);
      setPage(pageNum);
      loggerService.info('News loaded successfully', {
        module: 'NewsManagement',
        function: 'loadNews',
        page: pageNum,
        count: response.items?.length || 0
      });
    } catch (error) {
      loggerService.error('Failed to load news', {
        module: 'NewsManagement',
        function: 'loadNews',
        page: pageNum,
        error_message: error.message,
        error_code: error.code
      });
      exceptionService.recordException(error, {
        request_path: window.location.pathname,
        error_code: 'LOAD_NEWS_ERROR'
      });
      setMessageVariant('error');
      setMessage(t('admin.content.news.messages.loadFailed', '加载新闻失败'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadNews(1);
  }, [loadNews]);

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setMessageVariant('error');
      setMessage(validation.error || t('admin.content.news.messages.invalidImageType', '请选择图片文件'));
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
        setMessage(t('admin.content.news.messages.imageUploaded', '图片上传成功'));
        setTimeout(() => {
          setMessage(null);
        }, 3000);
      } else {
        throw new Error('Upload response missing file URL');
      }
    } catch (error) {
      loggerService.error('Failed to upload image', {
        module: 'NewsManagement',
        function: 'handleImageUpload',
        error_message: error.message,
        error_code: error.code
      });
      exceptionService.recordException(error, {
        request_path: window.location.pathname,
        error_code: 'UPLOAD_IMAGE_ERROR'
      });
      setMessageVariant('error');
      const errorMessage = error.message || error.details || t('admin.content.news.messages.imageUploadFailed', '图片上传失败');
      setMessage(errorMessage);
    } finally {
      setImageUploading(false);
      event.target.value = '';
    }
  };

  const handleFieldChange = (field) => (event) => {
    const value = event.target.value;
    setForm((prev) => ({
      ...prev,
      [field]: value
    }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSelect = (newsItem) => {
    setForm({
      id: newsItem.id,
      title: newsItem.title,
      imageUrl: newsItem.imageUrl || ''
    });
    setErrors({});
    setMessage(null);
  };

  const handleNew = () => {
    setForm(createEmptyForm());
    setErrors({});
    setMessage(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = validateNewsForm(form, t);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      setMessageVariant('error');
      setMessage(t('admin.content.news.messages.validationError', '请补全必填信息'));
      return;
    }
    
    setSaving(true);
    try {
      let savedNews;
      if (form.id) {
        savedNews = await contentService.updatePressRelease(form.id, form);
      } else {
        savedNews = await contentService.createPressRelease(form);
      }
      await loadNews(page);
      setForm(savedNews);
      setMessageVariant('success');
      setMessage(t('admin.content.news.messages.saved', '保存成功'));
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      loggerService.error('Failed to save news', {
        module: 'NewsManagement',
        function: 'handleSubmit',
        news_id: form.id,
        error_message: error.message,
        error_code: error.code
      });
      exceptionService.recordException(error, {
        request_path: window.location.pathname,
        error_code: 'SAVE_NEWS_ERROR'
      });
      setMessageVariant('error');
      setMessage(error?.response?.data?.detail || error?.message || t('admin.content.news.messages.saveFailed', '保存失败'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (newsId) => {
    if (!newsId) return;
    if (!window.confirm(t('admin.content.news.actions.confirmDelete', '确定要删除这条新闻吗？'))) {
      return;
    }
    try {
      await contentService.deletePressRelease(newsId);
      await loadNews(page);
      if (form.id === newsId) {
        setForm(createEmptyForm());
      }
      setMessageVariant('success');
      setMessage(t('admin.content.news.messages.deleted', '删除成功'));
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      loggerService.error('Failed to delete news', {
        module: 'NewsManagement',
        function: 'handleDelete',
        news_id: newsId,
        error_message: error.message,
        error_code: error.code
      });
      exceptionService.recordException(error, {
        request_path: window.location.pathname,
        error_code: 'DELETE_NEWS_ERROR'
      });
      setMessageVariant('error');
      setMessage(t('admin.content.news.messages.deleteFailed', '删除失败'));
    }
  };

  return (
    <div>
      {message && (
        <Alert variant={messageVariant} className="mb-4">
          {message}
        </Alert>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-6">
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
          <div className="flex justify-between items-center mb-4 gap-4">
            <div>
              <h2 className="m-0 text-lg font-semibold text-gray-900">{t('admin.content.news.list.title', '新闻列表')}</h2>
              <p className="m-0 text-gray-500 text-sm">{t('admin.content.news.list.description', '管理新闻稿')}</p>
            </div>
            <Button type="button" variant="secondary" onClick={handleNew}>
              {t('admin.content.news.actions.new', '新建')}
            </Button>
          </div>

          {loading ? (
            <div className="p-6 text-center text-gray-500">{t('common.loading', '加载中...')}</div>
          ) : news.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <p>{t('admin.content.news.list.empty', '暂无新闻')}</p>
            </div>
          ) : (
            <ul className="list-none p-0 m-0 flex flex-col gap-3">
              {news.map((newsItem) => (
                <li
                  key={newsItem.id}
                  className={`flex justify-between items-center p-4 bg-white border rounded-lg cursor-pointer transition-all hover:border-blue-300 ${
                    form.id === newsItem.id 
                      ? 'border-blue-500 shadow-lg shadow-blue-500/10' 
                      : 'border-gray-200'
                  }`}
                  onClick={() => handleSelect(newsItem)}
                >
                  <div className="flex-1 mr-4">
                    <div className="flex items-center gap-3 font-semibold text-gray-900 mb-1.5">
                      <span>{newsItem.title}</span>
                    </div>
                    <p className="m-0 text-gray-500 text-sm">
                      {newsItem.createdAt ? new Date(newsItem.createdAt).toLocaleDateString() : ''}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDelete(newsItem.id);
                    }}
                  >
                    {t('common.delete', '删除')}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
          <h3 className="mt-0 mb-4 text-lg font-semibold text-gray-900">
            {form.id
              ? t('admin.content.news.form.editTitle', '编辑新闻')
              : t('admin.content.news.form.newTitle', '新建新闻')}
          </h3>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label={t('admin.content.news.form.fields.title', '标题')}
              value={form.title}
              onChange={handleFieldChange('title')}
              required
              error={errors.title}
            />
            
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">
                {t('admin.content.news.form.fields.image', '上传图片')}
              </label>
              <div className="flex flex-col gap-3">
                {form.imageUrl && (
                  <div className="relative flex flex-col gap-2">
                    <img
                      src={form.imageUrl}
                      alt="News preview"
                      className="w-full max-h-[180px] object-cover rounded-lg border border-gray-200"
                    />
                    <div className="flex gap-2">
                      <input
                        id="news-image-input"
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={imageUploading}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          document.getElementById('news-image-input')?.click();
                        }}
                        disabled={imageUploading}
                        loading={imageUploading}
                      >
                        {t('admin.content.news.actions.changeImage', '更换图片')}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setForm((prev) => ({ ...prev, imageUrl: '' }));
                          setMessage(null);
                        }}
                      >
                        {t('common.remove', '移除')}
                      </Button>
                    </div>
                  </div>
                )}
                {!form.imageUrl && (
                  <div className="flex flex-col gap-3">
                    <input
                      id="news-image-input"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={imageUploading}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        document.getElementById('news-image-input')?.click();
                      }}
                      disabled={imageUploading}
                      loading={imageUploading}
                      className="w-full"
                    >
                      {imageUploading
                        ? t('common.uploading', '上传中...')
                        : t('admin.content.news.actions.selectImage', '选择图片')}
                    </Button>
                  </div>
                )}
              </div>
            </div>
            
            <Input
              label={t('admin.content.news.form.fields.imageUrl', '图片URL')}
              value={form.imageUrl}
              onChange={handleFieldChange('imageUrl')}
              placeholder="https://example.com/image.jpg"
              required
              error={errors.imageUrl}
              helperText={t('admin.content.news.form.fields.imageUrlHelper', '或直接输入图片URL地址')}
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                variant="primary"
                loading={saving}
              >
                {form.id
                  ? t('admin.content.news.actions.update', '更新')
                  : t('admin.content.news.actions.create', '创建')}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function createEmptyForm() {
  return {
    id: null,
    title: '',
    imageUrl: ''
  };
}