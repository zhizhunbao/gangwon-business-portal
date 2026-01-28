/**
 * Notice Management Component
 * 公告管理组件
 */

import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Input, TiptapEditor, Alert, Card, Modal, ModalFooter, FileAttachments } from '@shared/components';
import { contentService } from '@shared/services';
import { formatDate } from '@shared/utils';
import { useUpload } from '@shared/hooks';
import { validateNoticeForm } from './utils';

export default function NoticeManagement() {
  const { t, i18n } = useTranslation();
  
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
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, noticeId: null });

  // 文件上传
  const { uploading, uploadAttachments } = useUpload();

  // Load notices
  const loadNotices = useCallback(async (pageNum = 1) => {
    setLoading(true);
    const response = await contentService.listNotices({ page: pageNum, pageSize: 20 });
    setNotices(response.items || []);
    setTotal(response.total || 0);
    setPage(pageNum);
    setLoading(false);
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

  // 处理附件上传
  const handleAttachmentsChange = async (files, action, index) => {
    if (action === 'remove') {
      // 删除附件
      setForm((prev) => ({
        ...prev,
        attachments: files
      }));
      return;
    }

    // 上传新文件
    const uploadedFiles = await uploadAttachments(files);
    
    if (uploadedFiles) {
      setForm((prev) => ({
        ...prev,
        attachments: [...(prev.attachments || []), ...uploadedFiles]
      }));
    }
  };

  const handleSelect = async (notice) => {
    try {
      // 获取完整的公告详情（包括附件）
      const fullNotice = await contentService.getNotice(notice.id);
      
      setForm({
        id: fullNotice.id,
        title: fullNotice.title,
        contentHtml: fullNotice.contentHtml || '',
        boardType: fullNotice.boardType || 'notice',
        attachments: fullNotice.attachments || []
      });
      setErrors({});
      setMessage(null);
    } catch (error) {
      setMessageVariant('error');
      setMessage(t('admin.content.notices.messages.loadFailed', '공지사항 상세 정보를 불러오지 못했습니다'));
    }
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
      setMessage(t('admin.content.notices.messages.validationError', '필수 항목을 입력해주세요'));
      return;
    }
    
    setSaving(true);
    let savedNotice;
    if (form.id) {
      savedNotice = await contentService.updateNotice(form.id, form);
    } else {
      savedNotice = await contentService.createNotice(form);
    }
    
    await loadNotices(page);
    setForm(savedNotice);
    setMessageVariant('success');
    setMessage(t('admin.content.notices.messages.saved', '저장되었습니다'));
    setTimeout(() => setMessage(null), 3000);
    setSaving(false);
  };

  const handleDelete = (noticeId) => {
    if (!noticeId) return;
    setDeleteConfirm({ open: true, noticeId });
  };

  const confirmDelete = async () => {
    const { noticeId } = deleteConfirm;
    if (!noticeId) return;
    
    await contentService.deleteNotice(noticeId);
    await loadNotices(page);
    if (form.id === noticeId) {
      setForm(createEmptyForm());
    }
    setMessageVariant('success');
    setMessage(t('admin.content.notices.messages.deleted', '삭제되었습니다'));
    setTimeout(() => setMessage(null), 3000);
    setDeleteConfirm({ open: false, noticeId: null });
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
                <h2 className="m-0 text-lg font-semibold text-gray-900">{t('admin.content.notices.list.title', '공지사항 목록')}</h2>
                <p className="m-0 text-gray-500 text-sm">{t('admin.content.notices.list.description', '웹사이트 공지사항 관리')}</p>
              </div>
              <Button type="button" variant="secondary" onClick={handleNew}>
                {t('admin.content.notices.actions.new', '새로 만들기')}
              </Button>
            </div>

          {loading ? (
            <div className="text-center text-gray-500">{t('common.loading', '로딩 중...')}</div>
          ) : notices.length === 0 ? (
            <div className="text-center text-gray-500">
              <p>{t('admin.content.notices.list.empty', '공지사항이 없습니다')}</p>
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
                      {notice.createdAt ? formatDate(notice.createdAt, 'yyyy-MM-dd', i18n.language) : ''} | {t('admin.content.notices.views', '조회')}: {notice.viewCount || 0}
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
                    {t('common.delete', '삭제')}
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
              ? t('admin.content.notices.form.editTitle', '공지사항 수정')
              : t('admin.content.notices.form.newTitle', '새 공지사항')}
          </h3>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label={t('admin.content.notices.form.fields.title', '제목')}
              value={form.title}
              onChange={handleFieldChange('title')}
              required
              error={errors.title}
            />
            
            {/* 公告类型选择 */}
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="boardType"
                  checked={form.boardType === 'notice'}
                  onChange={(e) => {
                    const newValue = e.target.checked ? 'notice' : 'general';
                    setForm((prev) => ({ ...prev, boardType: newValue }));
                  }}
                  className="w-4 h-4 text-red-600 focus:ring-red-500 rounded"
                />
                <span className="text-sm font-medium text-gray-700">
                  {t('admin.content.notices.form.fields.boardTypeImportant', '중요')}
                </span>
              </label>
            </div>
            
            <TiptapEditor
              label={t('admin.content.notices.form.fields.contentHtml', '내용')}
              value={form.contentHtml}
              onChange={handleFieldChange('contentHtml')}
              required
              error={errors.contentHtml}
              placeholder={t('admin.content.notices.form.fields.contentHtmlPlaceholder', '공지사항 내용을 입력하세요...')}
            />
            <FileAttachments
              label={t('admin.content.notices.form.fields.attachments', '첨부파일')}
              attachments={form.attachments || []}
              onChange={handleAttachmentsChange}
              maxFiles={5}
              uploading={uploading}
              error={errors.attachments}
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                variant="primary"
                loading={saving}
              >
                {form.id
                  ? t('admin.content.notices.actions.update', '업데이트')
                  : t('admin.content.notices.actions.create', '생성')}
              </Button>
            </div>
          </form>
          </div>
        </Card>
      </div>

      {/* 删除确认对话框 */}
      <Modal
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, noticeId: null })}
        title={t('admin.content.notices.actions.confirmDelete', '이 공지사항을 삭제하시겠습니까?')}
        size="sm"
      >
        <div className="py-4">
          <p className="text-gray-600">
            {t('admin.content.notices.actions.confirmDeleteMessage', '이 작업은 취소할 수 없습니다. 계속하시겠습니까?')}
          </p>
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setDeleteConfirm({ open: false, noticeId: null })}>
            {t('common.cancel', '취소')}
          </Button>
          <Button variant="primary" onClick={confirmDelete}>
            {t('common.delete', '삭제')}
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
    contentHtml: '',
    boardType: 'general',
    attachments: []
  };
}