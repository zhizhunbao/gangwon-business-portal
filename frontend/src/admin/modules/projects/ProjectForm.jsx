/**
 * Project Form Component - Admin Portal
 * 项目创建/编辑表单
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Button, Input, Select, Textarea, Loading, Alert, FileAttachments } from '@shared/components';
import { adminService } from '@shared/services';
import { useUpload } from '@shared/hooks';

// Helper to format date for form (YYYY-MM-DD)
const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toISOString().split('T')[0];
};

export default function ProjectForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [messageVariant, setMessageVariant] = useState('success');

  // 使用统一的上传 hook
  const { uploading, uploadFile } = useUpload();

  const [formData, setFormData] = useState({
    title: '',
    startDate: '',
    endDate: '',
    status: 'active',
    content: '',
    image: null,
    attachments: []
  });

  useEffect(() => {
    if (isEditMode && id) {
      loadProject();
    }
  }, [id, isEditMode]);

  const loadProject = async () => {
    if (!id) return;
    setLoading(true);
    const data = await adminService.getProject(id);
    if (data) {
      setFormData({
        title: data.title || '',
        startDate: formatDateForInput(data.startDate),
        endDate: formatDateForInput(data.endDate),
        status: data.status || 'active',
        content: data.description || data.content || '',
        image: data.imageUrl || data.image || null,
        attachments: data.attachments || []
      });
    }
    setLoading(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.startDate || !formData.endDate) {
      setMessageVariant('error');
      setMessage(t('admin.projects.form.requiredFields', '필수 항목을 입력하세요: 지원사업, 시작일, 종료일'));
      setTimeout(() => setMessage(null), 5000);
      return;
    }

    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      setMessageVariant('error');
      setMessage(t('admin.projects.form.dateError', '종료일은 시작일보다 이전일 수 없습니다'));
      setTimeout(() => setMessage(null), 5000);
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        title: formData.title,
        description: formData.content,
        startDate: formData.startDate,
        endDate: formData.endDate,
        status: formData.status,
        imageUrl: formData.image || null,
        attachments: formData.attachments || [],
      };

      let successMessage;
      if (isEditMode) {
        await adminService.updateProject(id, payload);
        successMessage = t('admin.projects.form.updateSuccess', '지원사업이 성공적으로 업데이트되었습니다');
      } else {
        await adminService.createProject(payload);
        successMessage = t('admin.projects.form.createSuccess', '지원사업이 성공적으로 생성되었습니다');
      }

      navigate('/admin/projects', {
        state: { message: successMessage, messageVariant: 'success' }
      });
    } catch (err) {
      console.error('Submit failed:', err);
      setMessageVariant('error');
      setMessage(t('admin.projects.form.submitError', '저장 실패, 다시 시도해주세요'));
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('type', 'project');
      const result = await uploadFile(formDataUpload);
      if (result?.fileUrl) {
        setFormData(prev => ({ ...prev, image: result.fileUrl }));
      }
    } catch (err) {
      console.error('Upload failed:', err);
      setMessageVariant('error');
      setMessage(t('admin.projects.form.uploadError', '이미지 업로드 실패, 다시 시도해주세요'));
      setTimeout(() => setMessage(null), 5000);
    } finally {
      e.target.value = '';
    }
  };

  const handleAttachmentsChange = async (filesOrAttachments, action, index) => {
    // 如果是删除操作
    if (action === 'remove') {
      setFormData(prev => ({ ...prev, attachments: filesOrAttachments }));
      return;
    }

    // 如果是添加文件
    if (!filesOrAttachments || filesOrAttachments.length === 0) {
      return;
    }

    try {
      const uploadPromises = Array.from(filesOrAttachments).map(async (file) => {
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);
        formDataUpload.append('type', 'project');
        const result = await uploadFile(formDataUpload);
        
        return {
          fileId: result.fileId,
          fileName: result.fileName || file.name,
          fileUrl: result.fileUrl,
          fileSize: result.fileSize || file.size,
          originalName: result.fileName || file.name,
          mimeType: result.mimeType || file.type
        };
      });

      const uploadedFiles = await Promise.all(uploadPromises);
      setFormData(prev => ({
        ...prev,
        attachments: [...(prev.attachments || []), ...uploadedFiles]
      }));
      
      setMessageVariant('success');
      setMessage(t('admin.projects.form.attachmentUploadSuccess', `成功上传 ${uploadedFiles.length} 个附件`));
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error('Attachment upload failed:', err);
      setMessageVariant('error');
      setMessage(t('admin.projects.form.attachmentUploadError', '첨부파일 업로드 실패, 다시 시도해주세요'));
      setTimeout(() => setMessage(null), 5000);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="w-full">
      {message && (
        <Alert variant={messageVariant} className="mb-4" onClose={() => setMessage(null)}>
          {message}
        </Alert>
      )}

      {/* 顶部操作栏 */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/admin/projects')}>
            {t('common.back', '뒤로')}
          </Button>
          {!isEditMode && (
            <h3 className="text-lg font-semibold text-gray-900">
              {t('admin.projects.form.createTitle', '지원사업 생성')}
            </h3>
          )}
        </div>
        <div className="flex gap-4">
          <Button onClick={handleSubmit} loading={submitting}>
            {isEditMode ? t('common.save', '저장') : t('common.create', '생성')}
          </Button>
        </div>
      </div>

      {/* 左右布局：左边内容，右边图片 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：表单内容 */}
        <div className="lg:col-span-2">
          <Card>
            <div className="p-6">
              <div className="flex flex-col gap-4">
                <Input
                  label={t('admin.projects.form.title', '지원사업')}
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  placeholder={t('admin.projects.form.titlePlaceholder', '지원사업을 입력하세요')}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-700">
                      {t('admin.projects.form.startDate', '시작일')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-700">
                      {t('admin.projects.form.endDate', '종료일')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <Select
                  label={t('admin.projects.form.status', '지원사업 상태')}
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  options={[
                    { value: 'active', label: t('admin.projects.status.active', '진행중') },
                    { value: 'inactive', label: t('admin.projects.status.inactive', '종료됨') },
                    { value: 'archived', label: t('admin.projects.status.archived', '보관됨') }
                  ]}
                />

                <Textarea
                  label={t('admin.projects.form.description', '지원사업')}
                  name="content"
                  value={formData.content}
                  onChange={handleChange}
                  rows={8}
                  placeholder={t('admin.projects.form.descriptionPlaceholder', '지원사업 상세 설명을 입력하세요...')}
                />

                <FileAttachments
                  attachments={formData.attachments}
                  onChange={handleAttachmentsChange}
                  maxFiles={5}
                  maxFileSize={10 * 1024 * 1024}
                  uploading={uploading}
                />
              </div>
            </div>
          </Card>
        </div>

        {/* 右侧：封面图片 */}
        <div className="lg:col-span-1">
          <Card>
            <div className="p-6">
              <div className="mb-4">
                <h3 className="text-base font-semibold text-gray-900 mb-1">
                  {t('admin.projects.form.coverImage', '지원사업 대표 이미지')}
                </h3>
                <p className="text-sm text-gray-500">
                  {t('admin.projects.form.imageHint', 'JPG, PNG 형식 지원, 권장 크기 800x400')}
                </p>
              </div>
              
              <div className="space-y-4">
                {formData.image ? (
                  <div className="relative group">
                    <div className="w-full overflow-hidden rounded-lg border-2 border-gray-200 bg-gray-50">
                      <img
                        src={formData.image}
                        alt={t('admin.projects.form.coverImageAlt', '지원사업 대표 이미지')}
                        className="w-full h-auto object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, image: null }))}
                      className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1.5 text-sm font-medium rounded-md shadow-lg hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      {t('common.remove', '제거')}
                    </button>
                  </div>
                ) : (
                  <div className="w-full h-48 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center">
                    <span className="text-gray-400 text-sm">{t('admin.projects.form.noImage', '이미지가 없습니다')}</span>
                  </div>
                )}
                
                <label className="block">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer disabled:opacity-50"
                  />
                </label>
                {uploading && (
                  <p className="text-sm text-blue-600">{t('common.uploading', '업로드 중...')}</p>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
