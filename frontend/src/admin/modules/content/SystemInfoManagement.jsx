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
  Alert
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
        setMessage(t('admin.content.systemInfo.messages.imageUploaded', '图片上传成功'));
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessageVariant('error');
        setMessage(t('admin.content.systemInfo.messages.imageUploadFailed', '图片上传失败，请重试'));
      }
    } catch (err) {
      setMessageVariant('error');
      setMessage(t('admin.content.systemInfo.messages.imageUploadFailed', '图片上传失败，请重试'));
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
      setMessage(t('admin.content.systemInfo.messages.contentRequired', '请输入详细内容'));
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
    setMessage(t('admin.content.systemInfo.messages.saved', '保存成功'));
    setTimeout(() => setMessage(null), 3000);
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">
          {t('common.loading', '加载中...')}
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
          {t('admin.content.systemInfo.title', '系统介绍管理')}
        </h2>
        <p className="text-gray-600 text-sm m-0">
          {t('admin.content.systemInfo.description', '管理系统介绍页面的详细内容和展示图片。')}
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
                placeholder={t('admin.content.systemInfo.contentPlaceholder', '请输入系统介绍的详细内容...')}
                height={500}
                required
                error={!formData.content.trim() ? '详细内容为必填项' : ''}
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
                  {t('admin.content.systemInfo.imageLabel', '展示图片')}
                </h3>
                <p className="text-sm text-gray-500">
                  {t('admin.content.systemInfo.imageHint', '支持 JPG、PNG、GIF 格式，建议尺寸 800x600 像素')}
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
                      {t('common.remove', '移除')}
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <p className="mt-2 text-sm text-gray-500">
                      {t('admin.content.systemInfo.noImage', '暂无图片')}
                    </p>
                  </div>
                )}
                
                <label className="block">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        if (file.size > 5 * 1024 * 1024) {
                          setMessageVariant('error');
                          setMessage(t('admin.content.systemInfo.messages.imageTooLarge', '图片大小不能超过5MB'));
                          setTimeout(() => setMessage(null), 3000);
                          return;
                        }
                        handleImageUpload(file);
                      }
                    }}
                    disabled={uploading}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                  />
                </label>
              </div>
            </div>
          </Card>

          {/* 操作按钮卡片 */}
          <Card>
            <div className="p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4">
                {t('common.actions', '操作')}
              </h3>
              <div className="space-y-3">
                <Button 
                  variant="outline" 
                  onClick={() => setShowPreview(true)}
                  className="w-full"
                >
                  {t('common.preview', '预览')}
                </Button>
                <Button 
                  variant="primary"
                  onClick={handleSubmit} 
                  loading={saving}
                  className="w-full"
                  disabled={!formData.content.trim()}
                >
                  {t('common.save', '保存')}
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
        title={t('common.preview', '内容预览')}
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
                {t('admin.content.systemInfo.noContent', '暂无内容可预览')}
              </p>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t">
            <Button variant="primary" onClick={() => setShowPreview(false)}>
              {t('common.close', '关闭')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}