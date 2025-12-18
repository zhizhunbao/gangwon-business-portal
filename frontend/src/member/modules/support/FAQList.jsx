/**
 * FAQ List Component - Member Portal
 * FAQ列表组件（问题标题列表，点击展开答案的折叠结构）
 */

import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Card, { CardBody } from '@shared/components/Card';
import { EyeIcon, ChevronDownIcon, ChevronUpIcon, SearchIcon } from '@shared/components/Icons';
import { supportService } from '@shared/services';

export default function FAQList() {
  const { t } = useTranslation();
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    const loadFAQs = async () => {
      setLoading(true);
      const items = await supportService.listFAQs();
      setFaqs(items || []);
      setLoading(false);
    };

    loadFAQs();
  }, []);

  // 获取所有分类
  const categories = useMemo(() => {
    const categorySet = new Set();
    faqs.forEach(faq => {
      if (faq.category) {
        categorySet.add(faq.category);
      }
    });
    return Array.from(categorySet);
  }, [faqs]);

  // FAQ 分类翻译映射
  const categoryTranslations = {
    '회원가입': t('support.faqCategory.registration', '会员注册'),
    'general': t('support.faqCategory.general', '一般'),
    '성과관리': t('support.faqCategory.performance', '业绩管理'),
    '프로젝트': t('support.faqCategory.project', '项目'),
    '기업프로필': t('support.faqCategory.profile', '企业资料'),
    '문의/지원': t('support.faqCategory.support', '咨询/支持'),
    '기타': t('support.faqCategory.other', '其他')
  };

  // 分类选项
  const categoryOptions = useMemo(() => [
    { value: '', label: t('common.all', '全部') },
    ...categories.map(cat => ({ 
      value: cat, 
      label: categoryTranslations[cat] || cat 
    }))
  ], [categories, t]);

  // 过滤后的 FAQ 列表
  const filteredFaqs = useMemo(() => {
    return faqs.filter(faq => {
      if (searchKeyword) {
        const keyword = searchKeyword.toLowerCase();
        const question = (faq.question || faq.title || '').toLowerCase();
        const answer = (faq.answer || faq.content || '').toLowerCase();
        if (!question.includes(keyword) && !answer.includes(keyword)) {
          return false;
        }
      }
      if (selectedCategory && faq.category !== selectedCategory) {
        return false;
      }
      return true;
    });
  }, [faqs, searchKeyword, selectedCategory]);

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
    <div className="w-full">
      {/* 页面标题 */}
      <div className="mb-6 sm:mb-8 lg:mb-10 min-h-[48px] flex items-center">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 m-0">
          {t('support.faq', 'FAQ')}
        </h1>
      </div>

      <div className="mb-6">

        {/* 搜索和筛选 */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px] max-w-md">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder={t('support.faqSearchPlaceholder', '搜索问题或答案...')}
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
              />
            </div>
          </div>
          {categories.length > 0 && (
            <div className="w-full sm:w-48">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              >
                {categoryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* FAQ 列表 */}
      <Card>
        <CardBody>
          {/* 结果统计 */}
          <p className="text-sm text-gray-600 mb-4">
            {t('common.resultsCount', '共{{count}}条记录', { count: filteredFaqs.length })}
          </p>

          {loading ? (
            <div className="text-center py-12 text-gray-500">
              {t('common.loading', '加载中...')}
            </div>
          ) : filteredFaqs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {searchKeyword || selectedCategory 
                ? t('support.noFaqResults', '没有找到匹配的问题') 
                : t('common.noData', '暂无数据')}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredFaqs.map((faq) => {
                const isExpanded = expandedIds.has(faq.id);
                return (
                  <div 
                    key={faq.id} 
                    className={`border rounded-lg overflow-hidden transition-all ${isExpanded ? 'border-primary-300 shadow-sm' : 'border-gray-200'}`}
                  >
                    <div 
                      className={`flex items-center justify-between gap-4 p-4 cursor-pointer hover:bg-gray-50 ${isExpanded ? 'bg-primary-50' : ''}`}
                      onClick={() => toggleExpand(faq.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="m-0 text-base font-medium text-gray-900 truncate">
                          Q: {faq.question || faq.title}
                        </h3>
                        {faq.category && (
                          <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                            {faq.category}
                          </span>
                        )}
                      </div>
                      <button className="flex-shrink-0 p-1">
                        {isExpanded ? (
                          <ChevronUpIcon className="w-5 h-5 text-primary-600" />
                        ) : (
                          <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-gray-100">
                        <p className="m-0 text-gray-700 leading-relaxed pt-4 whitespace-pre-wrap">
                          A: {faq.answer || faq.content}
                        </p>
                        {faq.views !== undefined && (
                          <div className="flex items-center gap-2 mt-3 pt-3 text-sm text-gray-500 border-t border-gray-100">
                            <EyeIcon className="w-4 h-4 text-gray-400" />
                            <span>{faq.views} {t('support.viewsLabel', '次浏览')}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
