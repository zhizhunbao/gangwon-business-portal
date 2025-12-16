/**
 * Terms Modal Component
 * 条款模态框组件 - 显示使用条款、隐私政策等
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from './Modal';
import { Loading } from './Loading';
import { Alert } from './Alert';
import contentService from '@shared/services/content.service';
import loggerService from '@shared/services/logger.service';
import exceptionService from '@shared/services/exception.service';
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
   * TODO: 待后端条款 API 实现后，切换到此方法
   * 目前使用临时内容，后续可以从后端获取
   */
  const loadTermsContent = async (type) => {
    setLoading(true);
    setError(null);

    try {
      // TODO: 待后端条款 API 实现后，切换到此调用
      // const response = await contentService.getTerms(type);
      // setContent(response.content);

      // 临时内容（待后端 API 实现后移除）
      const placeholderContent = getPlaceholderContent(type, language);
      setContent(placeholderContent);
    } catch (err) {
      loggerService.error('Failed to load terms content', {
        module: 'TermsModal',
        function: 'loadTermsContent',
        term_type: type,
        error_message: err.message,
        error_code: err.code
      });
      exceptionService.recordException(err, {
        request_path: window.location.pathname,
        error_code: err.code || 'LOAD_TERMS_CONTENT_FAILED',
        context_data: { term_type: type }
      });
      setError(t('auth.termsLoadError', '条款加载失败，请稍后重试'));
    } finally {
      setLoading(false);
    }
  };

  /**
   * 获取临时占位内容（待后端 API 实现后移除）
   */
  const getPlaceholderContent = (type, lang) => {
    const placeholders = {
      [TERM_TYPES.TERMS_OF_SERVICE]: {
        ko: `
          <h2>이용약관</h2>
          <p>이용약관 내용이 여기에 표시됩니다.</p>
          <p>이 내용은 관리자가 설정할 수 있으며, 실제 약관 내용으로 대체될 예정입니다.</p>
        `,
        zh: `
          <h2>使用条款</h2>
          <p>使用条款内容将显示在这里。</p>
          <p>此内容可由管理员设置，将被实际条款内容替换。</p>
        `
      },
      [TERM_TYPES.PRIVACY_POLICY]: {
        ko: `
          <h2>개인정보 처리방침</h2>
          <p>개인정보 처리방침 내용이 여기에 표시됩니다.</p>
          <p>이 내용은 관리자가 설정할 수 있으며, 실제 정책 내용으로 대체될 예정입니다.</p>
        `,
        zh: `
          <h2>隐私政策</h2>
          <p>隐私政策内容将显示在这里。</p>
          <p>此内容可由管理员设置，将被实际政策内容替换。</p>
        `
      },
      [TERM_TYPES.THIRD_PARTY_SHARING]: {
        ko: `
          <h2>제3자 정보 제공 동의</h2>
          <p>제3자 정보 제공 동의 내용이 여기에 표시됩니다.</p>
          <p>이 내용은 관리자가 설정할 수 있으며, 실제 동의 내용으로 대체될 예정입니다.</p>
        `,
        zh: `
          <h2>第三方信息提供同意</h2>
          <p>第三方信息提供同意内容将显示在这里。</p>
          <p>此内容可由管理员设置，将被实际同意内容替换。</p>
        `
      },
      [TERM_TYPES.MARKETING_CONSENT]: {
        ko: `
          <h2>마케팅 정보 수신 동의</h2>
          <p>마케팅 정보 수신 동의 내용이 여기에 표시됩니다.</p>
          <p>이 내용은 관리자가 설정할 수 있으며, 실제 동의 내용으로 대체될 예정입니다.</p>
        `,
        zh: `
          <h2>营销信息接收同意</h2>
          <p>营销信息接收同意内容将显示在这里。</p>
          <p>此内容可由管理员设置，将被实际同意内容替换。</p>
        `
      }
    };

    return placeholders[type]?.[lang] || placeholders[type]?.ko || '';
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
