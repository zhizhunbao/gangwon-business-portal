/**
 * FAQ List Component - Member Portal
 * FAQ列表组件（问题标题列表，点击展开答案的折叠结构）
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '@shared/components/Card';
import { EyeIcon, ChevronDownIcon, ChevronUpIcon } from '@shared/components/Icons';
import { supportService, loggerService, exceptionService } from '@shared/services';

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
        loggerService.error('Failed to load FAQs', {
          module: 'FAQList',
          function: 'loadFAQs',
          error_message: error.message,
          error_code: error.code
        });
        exceptionService.recordException(error, {
          request_path: window.location.pathname,
          error_code: error.code || 'LOAD_FAQS_FAILED'
        });
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
      <div className="flex justify-between items-center gap-4 mb-8 flex-wrap md:flex-col md:items-stretch">
        <h2 className="m-0">{t('support.faq')}</h2>
      </div>

      {loading ? (
        <div className="py-16 px-4 text-center flex flex-col items-center justify-center gap-4 before:content-[''] before:w-12 before:h-12 before:border-4 before:border-blue-200 before:border-t-blue-600 before:rounded-full before:animate-spin">
          <p className="m-0 text-base text-gray-600 font-medium">{t('common.loading')}</p>
        </div>
      ) : faqs.length === 0 ? (
        <div className="py-16 px-4 text-center flex flex-col items-center justify-center gap-4 before:content-['📋'] before:text-5xl before:opacity-50">
          <p className="m-0 text-base text-gray-500">{t('common.noData')}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {faqs.map((faq) => {
            const isExpanded = expandedIds.has(faq.id);
            return (
              <div key={faq.id} className={`group bg-white border rounded-xl overflow-hidden transition-all duration-300 shadow-sm hover:shadow-md ${isExpanded ? 'shadow-lg border-blue-300 bg-gradient-to-br from-white to-blue-50/30' : 'border-gray-200'}`}>
                <div 
                  className={`flex items-center justify-between gap-4 p-6 cursor-pointer transition-all duration-200 hover:bg-gray-50 ${isExpanded ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100' : ''}`}
                  onClick={() => toggleExpand(faq.id)}
                >
                  <h3 className="flex-1 m-0 text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200 pr-4 leading-relaxed first-letter:text-blue-600 first-letter:font-bold first-letter:text-xl">Q: {faq.question || faq.title}</h3>
                  <button className={`flex-shrink-0 p-2 border-0 bg-transparent cursor-pointer rounded-lg transition-all duration-200 hover:bg-white/50 flex items-center justify-center ${isExpanded ? 'bg-white shadow-sm' : ''}`}>
                    {isExpanded ? (
                      <ChevronUpIcon className="w-5 h-5 text-blue-600 transition-all duration-300 rotate-180" />
                    ) : (
                      <ChevronDownIcon className="w-5 h-5 text-gray-500 transition-all duration-300" />
                    )}
                  </button>
                </div>
                {isExpanded && (
                  <div className={`px-6 pb-6 animate-fade-in border-t ${isExpanded ? 'border-blue-100' : 'border-gray-100'}`}>
                    <p className="m-0 text-gray-700 leading-relaxed pt-4 text-base whitespace-pre-wrap first-letter:text-green-600 first-letter:font-bold first-letter:text-xl">A: {faq.answer || faq.content}</p>
                    {faq.views !== undefined && (
                      <div className="flex items-center gap-2 mt-4 pt-4 text-sm text-gray-500 border-t border-gray-100">
                        <span className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg">
                          <EyeIcon className="w-4 h-4 inline-block align-middle text-gray-400" />
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

