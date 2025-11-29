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
import './TermsModal.css';

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
      console.error('Failed to load terms content:', err);
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
      <div className="terms-modal-content">
        {loading && (
          <div className="terms-modal-loading">
            <Loading />
          </div>
        )}

        {error && (
          <Alert type="error" className="terms-modal-error">
            {error}
          </Alert>
        )}

        {!loading && !error && content && (
          <div 
            className="terms-modal-body"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        )}

        <div className="terms-modal-footer">
          <button
            type="button"
            className="terms-modal-close-btn"
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
