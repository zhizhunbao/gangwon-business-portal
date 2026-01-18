/**
 * Terms Modal Component
 * 条款模态框组件 - 显示使用条款、隐私政策等
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from './Modal';
import { Loading } from './Loading';
import { Alert } from './Alert';
import { homeService } from '@shared/services';
import { cn } from '@shared/utils/helpers';

/**
 * 条款类型
 */
const TERM_TYPES = {
  TERMS_OF_SERVICE: 'terms_of_service',
  PRIVACY_POLICY: 'privacy_policy',
  THIRD_PARTY_SHARING: 'third_party_sharing',
  MARKETING_CONSENT: 'marketing_consent'
};

/**
 * 条款类型标签映射
 */
const TERM_LABELS = {
  [TERM_TYPES.TERMS_OF_SERVICE]: {
    ko: '이용약관',
    zh: '使用条款'
  },
  [TERM_TYPES.PRIVACY_POLICY]: {
    ko: '개인정보 처리방침',
    zh: '隐私政策'
  },
  [TERM_TYPES.THIRD_PARTY_SHARING]: {
    ko: '제3자 정보 제공 동의',
    zh: '第三方信息提供同意'
  },
  [TERM_TYPES.MARKETING_CONSENT]: {
    ko: '마케팅 정보 수신 동의',
    zh: '营销信息接收同意'
  }
};

/**
 * 条款模态框组件
 * @param {Object} props
 * @param {boolean} props.isOpen - 是否显示模态框
 * @param {string} props.termType - 条款类型（TERM_TYPES 中的值）
 * @param {Function} props.onClose - 关闭回调
 */
export function TermsModal({ isOpen, termType, onClose }) {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [content, setContent] = useState(null);

  const language = i18n.language || 'ko';
  const title = termType ? (TERM_LABELS[termType]?.[language] || TERM_LABELS[termType]?.ko || '') : '';

  useEffect(() => {
    if (isOpen && termType) {
      loadTermsContent(termType);
    } else {
      setContent(null);
      setError(null);
    }
  }, [isOpen, termType]);

  /**
   * 加载条款内容
   * 从后端 API 获取
   */
  const loadTermsContent = async (type) => {
    setLoading(true);
    setError(null);

    try {
      const response = await homeService.getLegalContent(type);
      if (response && response.contentHtml) {
        setContent(response.contentHtml);
      } else {
        setError(t('common.noData', '暂无数据'));
      }
    } catch (err) {
      console.error('[TermsModal] Failed to load terms content:', err);
      setError(t('error.generic.message', '加载失败，请稍后重试'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="lg"
    >
      <div className="flex flex-col h-full">
        {loading && (
          <div className="flex justify-center items-center p-8 min-h-[200px]">
            <Loading />
          </div>
        )}

        {error && (
          <Alert variant="error" className="my-4">
            {error}
          </Alert>
        )}

        {!loading && !error && content && (
          <div 
            className={cn(
              "flex-1 overflow-y-auto p-4 max-h-[60vh] leading-relaxed text-gray-900",
              "[&::-webkit-scrollbar]:w-2",
              "[&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-track]:rounded",
              "[&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded",
              "[&::-webkit-scrollbar-thumb]:hover:bg-gray-400",
              "[&_h2]:mt-0 [&_h2]:mb-4 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-gray-900",
              "[&_h3]:mt-6 [&_h3]:mb-3 [&_h3]:text-xl [&_h3]:font-semibold",
              "[&_p]:my-3",
              "[&_ul]:my-3 [&_ul]:pl-8",
              "[&_ol]:my-3 [&_ol]:pl-8",
              "[&_li]:my-2"
            )}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        )}

        <div className="flex justify-end p-4 border-t border-gray-200 mt-auto">
          <button
            type="button"
            className="px-6 py-2 bg-primary-600 text-white border-none rounded text-sm font-medium cursor-pointer transition-colors duration-200 hover:bg-primary-700 active:scale-[0.98]"
            onClick={onClose}
          >
            {t('common.close', '닫기')}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export { TERM_TYPES };
