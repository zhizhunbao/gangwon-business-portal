/**
 * FAQ Management Component - Admin Portal
 * FAQ管理组件
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Button, 
  Table, 
  Modal, 
  ModalFooter,
  Input, 
  Select,
  Pagination,
  Card
} from '@shared/components';
import { SearchIcon } from '@shared/components/Icons';
import { supportService } from '@shared/services';
import { formatDate } from '@shared/utils';

export default function FAQManagement() {
  const { t, i18n } = useTranslation();
  
  // 状态管理
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingFaq, setEditingFaq] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, faqId: null });
  
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // FAQ分类选项（用于表单）
  const categoryOptions = [
    { value: 'general', label: t('admin.content.faq.categories.general', '일반 문의') },
    { value: 'registration', label: t('admin.content.faq.categories.registration', '등록 관련') },
    { value: 'performance', label: t('admin.content.faq.categories.performance', '성과 관리') },
    { value: 'project', label: t('admin.content.faq.categories.project', '지원사업 신청') },
    { value: 'technical', label: t('admin.content.faq.categories.technical', '기술 지원') }
  ];

  // 表格列定义
  const columns = [
    {
      label: t('admin.content.faq.question', '질문'),
      key: 'question',
      render: (text) => (
        <div className="max-w-md truncate" title={text}>
          {text}
        </div>
      )
    },
    {
      label: t('admin.content.faq.category', '카테고리'),
      key: 'category',
      render: (category) => {
        const option = categoryOptions.find(opt => opt.value === category);
        return option ? option.label : category;
      }
    },
    {
      label: t('admin.content.faq.displayOrder', '표시 순서'),
      key: 'displayOrder',
      width: 100,
      align: 'center'
    },
    {
      label: t('admin.content.faq.createdAt', '생성일'),
      key: 'createdAt',
      width: 150,
      render: (date) => date ? formatDate(date, 'yyyy-MM-dd', i18n.language) : '-'
    },
    {
      label: t('common.actions', '작업'),
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(record);
            }}
            className="text-primary-600 hover:text-primary-900 font-medium text-sm"
          >
            {t('common.edit', '수정')}
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(record.id);
            }}
            className="text-red-600 hover:text-red-900 font-medium text-sm"
          >
            {t('common.delete', '삭제')}
          </button>
        </div>
      )
    }
  ];

  // 获取FAQ列表
  const fetchFaqs = async () => {
    setLoading(true);
    try {
      const response = await supportService.listFAQs({});
      const faqList = response.items;
      
      let filteredFaqs = faqList;
      if (searchTerm && searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase().trim();
        filteredFaqs = faqList.filter(faq => 
          (faq.question && faq.question.toLowerCase().includes(searchLower)) ||
          (faq.answer && faq.answer.toLowerCase().includes(searchLower)) ||
          (faq.category && faq.category.toLowerCase().includes(searchLower))
        );
      }
      
      setFaqs(filteredFaqs);
      setTotal(filteredFaqs.length);
    } catch (error) {
      setFaqs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  // 初始加载和依赖更新
  useEffect(() => {
    fetchFaqs();
  }, [searchTerm]);

  // 处理新增
  const handleAdd = () => {
    setEditingFaq(null);
    setModalVisible(true);
  };

  // 处理编辑
  const handleEdit = (faq) => {
    setEditingFaq(faq);
    setModalVisible(true);
  };

  // 处理删除
  const handleDelete = (id) => {
    if (!id) return;
    setDeleteConfirm({ open: true, faqId: id });
  };

  const confirmDelete = async () => {
    const { faqId } = deleteConfirm;
    if (!faqId) return;
    
    await supportService.deleteFAQ(faqId);
    fetchFaqs();
    setDeleteConfirm({ open: false, faqId: null });
  };

  // 处理表单提交
  const handleSubmit = async (values) => {
    if (editingFaq) {
      await supportService.updateFAQ(editingFaq.id, values);
    } else {
      await supportService.createFAQ(values);
    }
    
    setModalVisible(false);
    fetchFaqs();
  };

  return (
    <div>
      <div className="mb-6 sm:mb-8 lg:mb-10 min-h-[48px] flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 m-0">
          {t('admin.content.faq.title', 'FAQ 관리')}
        </h1>
        <Button onClick={handleAdd}>
          {t('admin.content.faq.addFaq', 'FAQ 추가')}
        </Button>
      </div>

      {/* 搜索和筛选 */}
      <Card className="p-4 sm:p-5 lg:p-6 mb-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px] max-w-md">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder={t('admin.content.faq.searchPlaceholder', '질문 또는 답변 검색...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </Card>

      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">{t('common.loading', '로딩 중...')}</div>
        ) : faqs.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p className="text-lg mb-2">{t('admin.content.faq.noData', 'FAQ 데이터가 없습니다')}</p>
            <p className="text-sm text-gray-400">
              {total === 0
                ? t('admin.content.faq.noDataHint', '"FAQ 추가" 버튼을 클릭하여 첫 번째 FAQ를 생성하세요')
                : t('admin.content.faq.noSearchResult', '현재 검색 조건에 일치하는 FAQ가 없습니다')}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto -mx-4 px-4">
              <Table
                columns={columns}
                data={faqs}
              />
            </div>
            {total > pageSize && (
              <div className="px-6 py-4 border-t border-gray-200 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center text-sm text-gray-700">
                  <span>
                    {t('common.pagination.showing', { 
                      start: ((currentPage - 1) * pageSize) + 1, 
                      end: Math.min(currentPage * pageSize, total), 
                      total: total 
                    })}
                  </span>
                </div>
                <Pagination
                  current={currentPage}
                  total={total}
                  pageSize={pageSize}
                  onChange={setCurrentPage}
                  onShowSizeChange={(current, size) => {
                    setCurrentPage(1);
                    setPageSize(size);
                  }}
                  showSizeChanger
                  showQuickJumper
                />
              </div>
            )}
          </>
        )}
      </div>


      {/* FAQ编辑模态框 */}
      <Modal
        title={editingFaq 
          ? t('admin.content.faq.editFaq', 'FAQ 수정')
          : t('admin.content.faq.addFaq', 'FAQ 추가')
        }
        isOpen={modalVisible}
        onClose={() => setModalVisible(false)}
        size="lg"
      >
        <FAQForm
          initialValues={editingFaq}
          onSubmit={handleSubmit}
          onCancel={() => setModalVisible(false)}
          categoryOptions={categoryOptions.filter(opt => opt.value)}
        />
      </Modal>

      {/* 删除确认对话框 */}
      <Modal
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, faqId: null })}
        title={t('admin.content.faq.deleteConfirm', '이 FAQ를 삭제하시겠습니까?')}
        size="sm"
      >
        <div className="py-4">
          <p className="text-gray-600">
            {t('admin.content.faq.deleteConfirmMessage', '이 작업은 취소할 수 없습니다. 계속하시겠습니까?')}
          </p>
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setDeleteConfirm({ open: false, faqId: null })}>
            {t('common.cancel', '취소')}
          </Button>
          <Button variant="primary" onClick={confirmDelete}>
            {t('common.delete', '삭제')}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

// FAQ表单组件
function FAQForm({ initialValues, onSubmit, onCancel, categoryOptions }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    category: 'general',
    display_order: 1
  });

  // 设置初始值
  useEffect(() => {
    if (initialValues) {
      setFormData(initialValues);
    }
  }, [initialValues]);

  // 处理字段变化
  const handleFieldChange = (field) => (event) => {
    const value = event?.target?.value !== undefined ? event.target.value : event;
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 处理提交
  const handleSubmit = async () => {
    setLoading(true);
    await onSubmit(formData);
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('admin.content.faq.question', '질문')}
        </label>
        <Input 
          value={formData.question}
          onChange={handleFieldChange('question')}
          placeholder={t('admin.content.faq.questionPlaceholder', 'FAQ 질문을 입력하세요')} 
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('admin.content.faq.answer', '답변')}
        </label>
        <textarea
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={6}
          value={formData.answer}
          onChange={handleFieldChange('answer')}
          placeholder={t('admin.content.faq.answerPlaceholder', 'FAQ 답변을 입력하세요')}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('admin.content.faq.category', '카테고리')}
          </label>
          <Select
            value={formData.category}
            onChange={handleFieldChange('category')}
            options={categoryOptions}
            placeholder={t('admin.content.faq.selectCategory', '카테고리 선택')}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('admin.content.faq.displayOrder', '표시 순서')}
          </label>
          <Input
            type="number"
            min={1}
            max={999}
            value={formData.display_order}
            onChange={handleFieldChange('display_order')}
            placeholder={t('admin.content.faq.displayOrderPlaceholder', '표시 순서를 입력하세요')}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={onCancel}>
          {t('common.cancel', '取消')}
        </Button>
        <Button loading={loading} onClick={handleSubmit}>
          {t('common.save', '저장')}
        </Button>
      </div>
    </div>
  );
}