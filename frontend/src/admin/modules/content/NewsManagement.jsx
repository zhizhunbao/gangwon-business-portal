/**
 * News Management Component
 * 新闻管理组件
 */

import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Input, Alert, Card, Modal, ModalFooter } from '@shared/components';
import { apiService, contentService } from '@shared/services';
import { API_PREFIX } from '@shared/utils/constants';
import { validateImageFile } from '@shared/utils/fileValidation';
import { formatDate } from '@shared/utils/format';
import { validateNewsForm } from './utils';

export default function NewsManagement() {
  const { t, i18n } = useTranslation();
  
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
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, newsId: null });

  // Load news
  const loadNews = useCallback(async (pageNum = 1) => {
    setLoading(true);
    const response = await contentService.listPressReleases({ page: pageNum, pageSize: 20 });
    setNews(response.items || []);
    setTotal(response.total || 0);
    setPage(pageNum);
    setLoading(false);
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
      
      // Backend returns FileUploadResponse with file_url directly
      if (response?.file_url) {
        setForm((prev) => ({
          ...prev,
          imageUrl: response.file_url
        }));
        setMessageVariant('success');
        setMessage(t('admin.content.news.messages.imageUploaded', '图片上传成功'));
        setTimeout(() => {
          setMessage(null);
        }, 3000);
      } else {
        // Upload response missing file URL
        setMessageVariant('error');
        setMessage(t('admin.content.news.messages.uploadFailed', '图片上传失败'));
      }
    } catch (error) {
      setMessageVariant('error');
      setMessage(error.message || t('admin.content.news.messages.uploadFailed', '图片上传失败'));
      setTimeout(() => {
        setMessage(null);
      }, 3000);
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
    setSaving(false);
  };

  const handleDelete = (newsId) => {
    if (!newsId) return;
    setDeleteConfirm({ open: true, newsId });
  };

  const confirmDelete = async () => {
    const { newsId } = deleteConfirm;
    if (!newsId) return;
    
    await contentService.deletePressRelease(newsId);
    await loadNews(page);
    if (form.id === newsId) {
      setForm(createEmptyForm());
    }
    setMessageVariant('success');
    setMessage(t('admin.content.news.messages.deleted', '删除成功'));
    setTimeout(() => setMessage(null), 3000);
    setDeleteConfirm({ open: false, newsId: null });
  };

  return (
    <div>
      {message && (
        <Alert variant={messageVariant} className="mb-4">
          {message}
        </Alert>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-6">
        <Card>
          <div className="p-6">
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
            <div className="text-center text-gray-500">{t('common.loading', '加载中...')}</div>
          ) : news.length === 0 ? (
            <div className="text-center text-gray-500">
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
                      {newsItem.createdAt ? formatDate(newsItem.createdAt, 'yyyy-MM-dd', i18n.language) : ''}
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
        </Card>

        <Card>
          <div className="p-6">
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
                    <div className="w-full max-h-[300px] overflow-hidden rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center">
                      <img
                        src={form.imageUrl}
                        alt="News preview"
                        className="max-w-full max-h-[300px] object-contain rounded-lg"
                      />
                    </div>
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
        </Card>
      </div>

      {/* 删除确认对话框 */}
      <Modal
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, newsId: null })}
        title={t('admin.content.news.actions.confirmDelete', '确定要删除这条新闻吗？')}
        size="sm"
      >
        <div className="py-4">
          <p className="text-gray-600">
            {t('admin.content.news.actions.confirmDeleteMessage', '此操作不可撤销，确定要继续吗？')}
          </p>
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setDeleteConfirm({ open: false, newsId: null })}>
            {t('common.cancel', '取消')}
          </Button>
          <Button variant="primary" onClick={confirmDelete}>
            {t('common.delete', '删除')}
          </Button>
        </ModalFooter>
      </Modal>
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