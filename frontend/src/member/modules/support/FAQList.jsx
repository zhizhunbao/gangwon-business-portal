/**
 * FAQ List Component - Member Portal
 * FAQ列表组件（问题标题列表，点击展开答案的折叠结构）
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '@shared/components/Card';
import { EyeIcon, ChevronDownIcon, ChevronUpIcon } from '@shared/components/Icons';
import { supportService } from '@shared/services';
import './FAQList.css';

export default function FAQList() {
  const { t } = useTranslation();
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedIds, setExpandedIds] = useState(new Set());

  useEffect(() => {
    const loadFAQs = async () => {
      setLoading(true);
      try {
        const items = await supportService.listFAQs();
        setFaqs(items || []);
      } catch (error) {
        console.error('Failed to load FAQs:', error);
        setFaqs([]);
      } finally {
        setLoading(false);
      }
    };

    loadFAQs();
  }, []);

  const toggleExpand = (id) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  return (
    <Card>
      <div className="faq-header">
        <h2>{t('support.faq')}</h2>
      </div>

      {loading ? (
        <div className="loading">
          <p>{t('common.loading')}</p>
        </div>
      ) : faqs.length === 0 ? (
        <div className="no-data">
          <p>{t('common.noData')}</p>
        </div>
      ) : (
        <div className="faq-list">
          {faqs.map((faq) => {
            const isExpanded = expandedIds.has(faq.id);
            return (
              <div key={faq.id} className={`faq-item group ${isExpanded ? 'expanded' : ''}`}>
                <div 
                  className="faq-question"
                  onClick={() => toggleExpand(faq.id)}
                >
                  <h3>Q: {faq.question || faq.title}</h3>
                  <button className="faq-toggle">
                    {isExpanded ? (
                      <ChevronUpIcon className="faq-icon-toggle" />
                    ) : (
                      <ChevronDownIcon className="faq-icon-toggle" />
                    )}
                  </button>
                </div>
                {isExpanded && (
                  <div className="faq-answer">
                    <p>A: {faq.answer || faq.content}</p>
                    {faq.views !== undefined && (
                      <div className="faq-meta">
                        <span>
                          <EyeIcon className="faq-icon-view" />
                          {faq.views} {t('support.viewsLabel')}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

