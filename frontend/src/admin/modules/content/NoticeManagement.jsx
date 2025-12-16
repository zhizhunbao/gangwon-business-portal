/**
 * Notice Management Component
 * 公告管理组件
 */

import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Input, RichTextEditor, Alert } from '@shared/components';
import { contentService, loggerService, exceptionService } from '@shared/services';
import { validateNoticeForm } from './utils';

export default function NoticeManagement() {
  const { t } = useTranslation();
  
  // State
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(createEmptyForm());
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [messageVariant, setMessageVariant] = useState('success');
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Load notices
  const loadNotices = useCallback(async (pageNum = 1) => {
    setLoading(true);
    try {
      const response = await contentService.listNotices({ page: pageNum, pageSize: 20 });
      setNotices(response.items || []);
      setTotal(response.total || 0);
      setPage(pageNum);
      loggerService.info('Notices loaded successfully', {
        module: 'NoticeManagement',
        function: 'loadNotices',
        page: pageNum,
        count: response.items?.length || 0
      });
    } catch (error) {
      loggerService.error('Failed to load notices', {
        module: 'NoticeManagement',
        function: 'loadNotices',
        page: pageNum,
        error_message: error.message,
        error_code: error.code
      });
      exceptionService.recordException(error, {
        request_path: window.location.pathname,
        error_code: 'LOAD_NOTICES_ERROR'
      });
      setMessageVariant('error');
      setMessage(t('admin.content.notices.messages.loadFailed', '加载公告失败'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadNotices(1);
  }, [loadNotices]);

  const handleFieldChange = (field) => (event) => {
    const value = event?.target?.value !== undefined ? event.target.value : event;
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

  const handleSelect = (notice) => {
    setForm({
      id: notice.id,
      title: notice.title,
      contentHtml: notice.contentHtml || '',
      boardType: notice.boardType || 'notice'
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
    const validationErrors = validateNoticeForm(form, t);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      setMessageVariant('error');
      setMessage(t('admin.content.notices.messages.validationError', '请补全必填信息'));
      return;
    }
    
    setSaving(true);
    try {
      let savedNotice;
      if (form.id) {
        savedNotice = await contentService.updateNotice(form.id, form);
      } else {
        savedNotice = await contentService.createNotice(form);
      }
      await loadNotices(page);
      setForm(savedNotice);
      setMessageVariant('success');
      setMessage(t('admin.content.notices.messages.saved', '保存成功'));
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      loggerService.error('Failed to save notice', {
        module: 'NoticeManagement',
        function: 'handleSubmit',
        notice_id: form.id,
        error_message: error.message,
        error_code: error.code
      });
      exceptionService.recordException(error, {
        request_path: window.location.pathname,
        error_code: 'SAVE_NOTICE_ERROR'
      });
      setMessageVariant('error');
      setMessage(error?.response?.data?.detail || error?.message || t('admin.content.notices.messages.saveFailed', '保存失败'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (noticeId) => {
    if (!noticeId) return;
    if (!window.confirm(t('admin.content.notices.actions.confirmDelete', '确定要删除这个公告吗？'))) {
      return;
    }
    try {
      await contentService.deleteNotice(noticeId);
      await loadNotices(page);
      if (form.id === noticeId) {
        setForm(createEmptyForm());
      }
      setMessageVariant('success');
      setMessage(t('admin.content.notices.messages.deleted', '删除成功'));
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      loggerService.error('Failed to delete notice', {
        module: 'NoticeManagement',
        function: 'handleDelete',
        notice_id: noticeId,
        error_message: error.message,
        error_code: error.code
      });
      exceptionService.recordException(error, {
        request_path: window.location.pathname,
        error_code: 'DELETE_NOTICE_ERROR'
      });
      setMessageVariant('error');
      setMessage(t('admin.content.notices.messages.deleteFailed', '删除失败'));
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
              <h2 className="m-0 text-lg font-semibold text-gray-900">{t('admin.content.notices.list.title', '公告列表')}</h2>
              <p className="m-0 text-gray-500 text-sm">{t('admin.content.notices.list.description', '管理网站公告')}</p>
            </div>
            <Button type="button" variant="secondary" onClick={handleNew}>
              {t('admin.content.notices.actions.new', '新建')}
            </Button>
          </div>

          {loading ? (
            <div className="p-6 text-center text-gray-500">{t('common.loading', '加载中...')}</div>
          ) : notices.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <p>{t('admin.content.notices.list.empty', '暂无公告')}</p>
            </div>
          ) : (
            <ul className="list-none p-0 m-0 flex flex-col gap-3">
              {notices.map((notice) => (
                <li
                  key={notice.id}
                  className={`flex justify-between items-center p-4 bg-white border rounded-lg cursor-pointer transition-all hover:border-blue-300 ${
                    form.id === notice.id 
                      ? 'border-blue-500 shadow-lg shadow-blue-500/10' 
                      : 'border-gray-200'
                  }`}
                  onClick={() => handleSelect(notice)}
                >
                  <div className="flex-1 mr-4">
                    <div className="flex items-center gap-3 font-semibold text-gray-900 mb-1.5">
                      <span>{notice.title}</span>
                    </div>
                    <p className="m-0 text-gray-500 text-sm">
                      {notice.createdAt ? new Date(notice.createdAt).toLocaleDateString() : ''} | {t('admin.content.notices.views', '浏览')}: {notice.viewCount || 0}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDelete(notice.id);
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
              ? t('admin.content.notices.form.editTitle', '编辑公告')
              : t('admin.content.notices.form.newTitle', '新建公告')}
          </h3>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label={t('admin.content.notices.form.fields.title', '标题')}
              value={form.title}
              onChange={handleFieldChange('title')}
              required
              error={errors.title}
            />
            <RichTextEditor
              label={t('admin.content.notices.form.fields.contentHtml', '内容')}
              value={form.contentHtml}
              onChange={handleFieldChange('contentHtml')}
              required
              error={errors.contentHtml}
              placeholder={t('admin.content.notices.form.fields.contentHtmlPlaceholder', '请输入公告内容...')}
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                variant="primary"
                loading={saving}
              >
                {form.id
                  ? t('admin.content.notices.actions.update', '更新')
                  : t('admin.content.notices.actions.create', '创建')}
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
    contentHtml: '',
    boardType: 'notice'
  };
}