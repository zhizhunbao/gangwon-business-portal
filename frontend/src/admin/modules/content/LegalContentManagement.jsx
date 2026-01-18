/**
 * Legal Content Management Component - Admin Portal
 * 法律内容管理组件（利用约款/个人信息处理方针）
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
import { contentService, homeService } from '@shared/services';

const CONTENT_TYPES = {
  TERMS_OF_SERVICE: 'terms_of_service',
  PRIVACY_POLICY: 'privacy_policy',
  THIRD_PARTY_SHARING: 'third_party_sharing',
  MARKETING_CONSENT: 'marketing_consent'
};

export default function LegalContentManagement() {
  const { t } = useTranslation();
  
  // 状态管理
  const [activeTab, setActiveTab] = useState(CONTENT_TYPES.TERMS_OF_SERVICE);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [message, setMessage] = useState(null);
  const [messageVariant, setMessageVariant] = useState('success');
  const [formData, setFormData] = useState({
    [CONTENT_TYPES.TERMS_OF_SERVICE]: '',
    [CONTENT_TYPES.PRIVACY_POLICY]: '',
    [CONTENT_TYPES.THIRD_PARTY_SHARING]: '',
    [CONTENT_TYPES.MARKETING_CONSENT]: ''
  });

  // 获取法律内容
  const fetchLegalContent = async (contentType) => {
    setLoading(true);
    try {
      const response = await homeService.getLegalContent(contentType);
      if (response && response.contentHtml) {
        setFormData(prev => ({
          ...prev,
          [contentType]: response.contentHtml
        }));
      }
    } catch (error) {
      // 如果没有内容，保持空白
    }
    setLoading(false);
  };

  // 初始加载
  useEffect(() => {
    fetchLegalContent(CONTENT_TYPES.TERMS_OF_SERVICE);
    fetchLegalContent(CONTENT_TYPES.PRIVACY_POLICY);
    fetchLegalContent(CONTENT_TYPES.THIRD_PARTY_SHARING);
    fetchLegalContent(CONTENT_TYPES.MARKETING_CONSENT);
  }, []);

  // 处理字段变化
  const handleContentChange = (value) => {
    setFormData(prev => ({
      ...prev,
      [activeTab]: value
    }));
  };

  // 处理表单提交
  const handleSubmit = async () => {
    if (!formData[activeTab].trim()) {
      setMessageVariant('error');
      setMessage(t('admin.content.legal.messages.contentRequired', '내용을 입력해주세요'));
      return;
    }

    setSaving(true);
    setMessage(null);
    
    try {
      await contentService.updateLegalContent(activeTab, {
        contentHtml: formData[activeTab]
      });
      
      setMessageVariant('success');
      setMessage(t('admin.content.legal.messages.saved', '저장되었습니다'));
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessageVariant('error');
      setMessage(t('admin.content.legal.messages.saveFailed', '저장에 실패했습니다'));
    }
    setSaving(false);
  };

  // Tab 标签
  const tabs = [
    { 
      key: CONTENT_TYPES.TERMS_OF_SERVICE, 
      label: t('admin.content.legal.termsOfService', '이용약관')
    },
    { 
      key: CONTENT_TYPES.PRIVACY_POLICY, 
      label: t('admin.content.legal.privacyPolicy', '개인정보 처리방침')
    },
    { 
      key: CONTENT_TYPES.THIRD_PARTY_SHARING, 
      label: t('admin.content.legal.thirdPartySharing', '제3자 정보 제공 동의')
    },
    { 
      key: CONTENT_TYPES.MARKETING_CONSENT, 
      label: t('admin.content.legal.marketingConsent', '마케팅 정보 수신 동의')
    }
  ];

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
          {t('admin.content.legal.title', '약관관리')}
        </h2>
        <p className="text-gray-600 text-sm m-0">
          {t('admin.content.legal.description', '이용약관과 개인정보처리방침 내용을 관리합니다.')}
        </p>
      </div>

      {/* Tab 切换 */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                ${activeTab === tab.key
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 左侧：主要内容编辑区 */}
        <div className="lg:col-span-3">
          <Card>
            <div className="p-6">
              <TiptapEditor
                value={formData[activeTab]}
                onChange={handleContentChange}
                placeholder={t('admin.content.legal.contentPlaceholder', '내용을 입력하세요...')}
                height={500}
                required
              />
            </div>
          </Card>
        </div>

        {/* 右侧：操作区 */}
        <div className="space-y-6">
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
                  disabled={!formData[activeTab].trim()}
                >
                  {t('common.save', '저장')}
                </Button>
              </div>
            </div>
          </Card>

          {/* 说明卡片 */}
          <Card>
            <div className="p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-2">
                {t('admin.content.legal.helpTitle', '안내')}
              </h3>
              <p className="text-sm text-gray-500">
                {t('admin.content.legal.helpText', '여기서 입력한 내용은 회원가입 시 이용약관 및 개인정보처리방침 팝업에 표시됩니다.')}
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* 预览模态框 */}
      <Modal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title={tabs.find(t => t.key === activeTab)?.label || t('common.preview', '미리보기')}
        size="lg"
      >
        <div className="space-y-6">
          {formData[activeTab] ? (
            <div className="prose max-w-none max-h-[60vh] overflow-y-auto">
              <div
                className="rich-text-preview"
                dangerouslySetInnerHTML={{ __html: formData[activeTab] }}
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
                {t('admin.content.legal.noContent', '미리볼 내용이 없습니다')}
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
