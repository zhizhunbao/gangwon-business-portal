/**
 * System Information Management Component - Admin Portal
 * 系统介绍管理组件
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Button, 
  Card, 
  TiptapEditor,
  Modal,
  Alert,
  FileUploadButton
} from '@shared/components';
import { contentService } from '@shared/services';
import { useUpload } from '@shared/hooks';

export default function SystemInfoManagement() {
  const { t } = useTranslation();
  
  // 状态管理
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [message, setMessage] = useState(null);
  const [messageVariant, setMessageVariant] = useState('success');
  const [formData, setFormData] = useState({
    content: ''
  });

  // 使用统一的上传 hook
  const { uploading, upload } = useUpload();

  // 获取系统介绍信息
  const fetchSystemInfo = async () => {
    setLoading(true);
    const response = await contentService.getSystemInfo();
    const data = response || {};
    
    setImageUrl(data.imageUrl || '');
    setFormData({
      content: data.contentHtml || ''
    });
    setLoading(false);
  };

  // 初始加载
  useEffect(() => {
    fetchSystemInfo();
  }, []);

  // 处理图片上传
  const handleImageUpload = async (file) => {
    setMessage(null);
    
    try {
      const response = await upload(file);
      if (response && response.fileUrl) {
        setImageUrl(response.fileUrl);
        setMessageVariant('success');
        setMessage(t('admin.content.systemInfo.messages.imageUploaded', '이미지가 업로드되었습니다'));
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessageVariant('error');
        setMessage(t('admin.content.systemInfo.messages.imageUploadFailed', '이미지 업로드에 실패했습니다. 다시 시도해주세요'));
      }
    } catch (err) {
      setMessageVariant('error');
      setMessage(t('admin.content.systemInfo.messages.imageUploadFailed', '이미지 업로드에 실패했습니다. 다시 시도해주세요'));
    }
  };

  // 处理图片删除
  const handleImageRemove = () => {
    setImageUrl('');
  };

  // 处理字段变化
  const handleFieldChange = (field) => (event) => {
    const value = event?.target?.value !== undefined ? event.target.value : event;
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 处理表单提交
  const handleSubmit = async () => {
    if (!formData.content.trim()) {
      setMessageVariant('error');
      setMessage(t('admin.content.systemInfo.messages.contentRequired', '상세 내용을 입력하세요'));
      return;
    }

    setSaving(true);
    setMessage(null);
    
    const submitData = {
      contentHtml: formData.content,
      imageUrl: imageUrl || null
    };
    
    await contentService.updateSystemInfo(submitData);
    
    // 重新获取数据
    await fetchSystemInfo();
    setMessageVariant('success');
    setMessage(t('admin.content.systemInfo.messages.saved', '저장되었습니다'));
    setTimeout(() => setMessage(null), 3000);
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">
          {t('common.loading', '로딩 중...')}
        </div>
      </div>
    );
  }

  return (
    <div>
      {message && (
        <Alert variant={messageVariant} className="mb-4">
          {message}
        </Alert>
      )}

      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900 m-0 mb-1">
          {t('admin.content.systemInfo.title', '시스템 소개 관리')}
        </h2>
        <p className="text-gray-600 text-sm m-0">
          {t('admin.content.systemInfo.description', '시스템 소개 페이지의 내용을 관리합니다. 제목, 설명, 상세 내용 및 표시 이미지를 포함합니다.')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：主要内容编辑区 */}
        <div className="lg:col-span-2">
          <Card>
            <div className="p-6">
              <TiptapEditor
                value={formData.content}
                onChange={handleFieldChange('content')}
                placeholder={t('admin.content.systemInfo.contentPlaceholder', '시스템 소개의 상세 내용을 입력하세요...')}
                height={500}
                required
                error={!formData.content.trim() ? t('error.validation.contentRequired', '상세 내용은 필수 입력 항목입니다') : ''}
              />
            </div>
          </Card>
        </div>

        {/* 右侧：图片和操作区 */}
        <div className="space-y-6">
          {/* 展示图片卡片 */}
          <Card>
            <div className="p-6">
              <div className="mb-4">
                <h3 className="text-base font-semibold text-gray-900 mb-1">
                  {t('admin.content.systemInfo.imageLabel', '표시 이미지')}
                </h3>
                <p className="text-sm text-gray-500">
                  {t('admin.content.systemInfo.imageHint', 'JPG, PNG, GIF 형식을 지원하며, 권장 크기는 800x600 픽셀, 파일 크기는 5MB를 초과할 수 없습니다')}
                </p>
              </div>
              
              <div className="space-y-4">
                {imageUrl ? (
                  <div className="relative group">
                    <div className="w-full max-h-[300px] overflow-hidden rounded-lg border-2 border-gray-200 bg-gray-50 flex items-center justify-center">
                      <img
                        src={imageUrl}
                        alt="System Info"
                        className="max-w-full max-h-[300px] object-contain rounded-lg"
                      />
                    </div>
                    <button
                      onClick={handleImageRemove}
                      className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1.5 text-sm font-medium rounded-md shadow-lg hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      {t('common.remove', '제거')}
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <p className="mt-2 text-sm text-gray-500">
                      {t('admin.content.systemInfo.noImage', '이미지 없음')}
                    </p>
                  </div>
                )}
                
                <FileUploadButton
                  accept="image/*"
                  onChange={(files) => {
                    const file = files[0];
                    if (file) {
                      if (file.size > 5 * 1024 * 1024) {
                        setMessageVariant('error');
                        setMessage(t('admin.content.systemInfo.messages.imageTooLarge', '이미지 크기는 5MB를 초과할 수 없습니다'));
                        setTimeout(() => setMessage(null), 3000);
                        return;
                      }
                      handleImageUpload(file);
                    }
                  }}
                  disabled={uploading}
                  className="w-full"
                >
                  {uploading 
                    ? t('common.uploading', '업로드 중...') 
                    : imageUrl 
                      ? t('common.changeImage', '이미지 변경')
                      : t('common.selectImage', '이미지 선택')
                  }
                </FileUploadButton>
              </div>
            </div>
          </Card>

          {/* 操作按钮卡片 */}
          <Card>
            <div className="p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4">
                {t('common.actions', '작업')}
              </h3>
              <div className="space-y-3">
                <Button 
                  variant="outline" 
                  onClick={() => setShowPreview(true)}
                  className="w-full"
                >
                  {t('common.preview', '미리보기')}
                </Button>
                <Button 
                  variant="primary"
                  onClick={handleSubmit} 
                  loading={saving}
                  className="w-full"
                  disabled={!formData.content.trim()}
                >
                  {t('common.save', '저장')}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* 预览模态框 */}
      <Modal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title={t('common.preview', '미리보기')}
        size="lg"
      >
        <div className="space-y-6">
          {/* 预览图片 */}
          {imageUrl && (
            <div className="mb-6">
              <img
                src={imageUrl}
                alt="Preview"
                className="w-full rounded-lg border shadow-sm"
                style={{ maxHeight: '400px', objectFit: 'contain' }}
              />
            </div>
          )}

          {/* 预览内容 */}
          {formData.content ? (
            <div className="prose max-w-none">
              <div
                className="rich-text-preview"
                dangerouslySetInnerHTML={{ __html: formData.content }}
                style={{
                  fontSize: '14px',
                  lineHeight: '1.6',
                  color: '#374151',
                }}
              />
            </div>
          ) : (
            <div className="text-center text-gray-400 py-12">
              <svg className="mx-auto h-12 w-12 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-500">
                {t('admin.content.systemInfo.noContent', '미리볼 내용이 없습니다')}
              </p>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t">
            <Button variant="primary" onClick={() => setShowPreview(false)}>
              {t('common.close', '닫기')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}