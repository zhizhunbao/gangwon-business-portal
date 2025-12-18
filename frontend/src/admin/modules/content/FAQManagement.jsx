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
import { formatDate } from '@shared/utils/format';

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
    { value: 'general', label: t('admin.content.faq.categories.general', '一般问题') },
    { value: 'registration', label: t('admin.content.faq.categories.registration', '注册相关') },
    { value: 'performance', label: t('admin.content.faq.categories.performance', '绩效管理') },
    { value: 'project', label: t('admin.content.faq.categories.project', '项目申报') },
    { value: 'technical', label: t('admin.content.faq.categories.technical', '技术支持') }
  ];

  // 表格列定义
  const columns = [
    {
      label: t('admin.content.faq.question', '问题'),
      key: 'question',
      render: (text) => (
        <div className="max-w-md truncate" title={text}>
          {text}
        </div>
      )
    },
    {
      label: t('admin.content.faq.category', '分类'),
      key: 'category',
      render: (category) => {
        const option = categoryOptions.find(opt => opt.value === category);
        return option ? option.label : category;
      }
    },
    {
      label: t('admin.content.faq.displayOrder', '显示顺序'),
      key: 'displayOrder',
      width: 100,
      align: 'center'
    },
    {
      label: t('admin.content.faq.createdAt', '创建时间'),
      key: 'createdAt',
      width: 150,
      render: (date) => date ? formatDate(date, 'yyyy-MM-dd', i18n.language) : '-'
    },
    {
      label: t('common.actions', '操作'),
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
            {t('common.edit', '编辑')}
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(record.id);
            }}
            className="text-red-600 hover:text-red-900 font-medium text-sm"
          >
            {t('common.delete', '删除')}
          </button>
        </div>
      )
    }
  ];

  // 获取FAQ列表
  const fetchFaqs = async () => {
    setLoading(true);
    try {
      const response = await supportService.listFAQs();
      // supportService.listFAQs 直接返回数组，不是分页对象
      const faqList = Array.isArray(response) ? response : [];
      
      // 如果提供了搜索词，进行客户端过滤
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
          {t('admin.content.faq.title', 'FAQ管理')}
        </h1>
        <Button onClick={handleAdd}>
          {t('admin.content.faq.addFaq', '添加FAQ')}
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
                placeholder={t('admin.content.faq.searchPlaceholder', '搜索问题、答案或分类...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </Card>

      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">{t('common.loading', '加载中...')}</div>
        ) : faqs.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p className="text-lg mb-2">{t('admin.content.faq.noData', '暂无FAQ数据')}</p>
            <p className="text-sm text-gray-400">
              {total === 0 
                ? t('admin.content.faq.noDataHint', '点击"添加FAQ"按钮创建第一个FAQ')
                : t('admin.content.faq.noSearchResult', '当前搜索条件下没有匹配的FAQ')}
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
                    {t('common.showing', { 
                      start: ((currentPage - 1) * pageSize) + 1, 
                      end: Math.min(currentPage * pageSize, total), 
                      total: total 
                    }) || `显示 ${((currentPage - 1) * pageSize) + 1}-${Math.min(currentPage * pageSize, total)} 共 ${total} 条`}
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
          ? t('admin.content.faq.editFaq', '编辑FAQ')
          : t('admin.content.faq.addFaq', '添加FAQ')
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
        title={t('admin.content.faq.deleteConfirm', '确定要删除这个FAQ吗？')}
        size="sm"
      >
        <div className="py-4">
          <p className="text-gray-600">
            {t('admin.content.faq.deleteConfirmMessage', '此操作不可撤销，确定要继续吗？')}
          </p>
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setDeleteConfirm({ open: false, faqId: null })}>
            {t('common.cancel', '取消')}
          </Button>
          <Button variant="primary" onClick={confirmDelete}>
            {t('common.delete', '删除')}
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
          {t('admin.content.faq.question', '问题')}
        </label>
        <Input 
          value={formData.question}
          onChange={handleFieldChange('question')}
          placeholder={t('admin.content.faq.questionPlaceholder', '请输入FAQ问题')} 
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('admin.content.faq.answer', '答案')}
        </label>
        <textarea
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={6}
          value={formData.answer}
          onChange={handleFieldChange('answer')}
          placeholder={t('admin.content.faq.answerPlaceholder', '请输入FAQ答案')}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('admin.content.faq.category', '分类')}
          </label>
          <Select
            value={formData.category}
            onChange={handleFieldChange('category')}
            options={categoryOptions}
            placeholder={t('admin.content.faq.selectCategory', '选择分类')}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('admin.content.faq.displayOrder', '显示顺序')}
          </label>
          <Input
            type="number"
            min={1}
            max={999}
            value={formData.display_order}
            onChange={handleFieldChange('display_order')}
            placeholder={t('admin.content.faq.displayOrderPlaceholder', '输入显示顺序')}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={onCancel}>
          {t('common.cancel', '取消')}
        </Button>
        <Button loading={loading} onClick={handleSubmit}>
          {t('common.save', '保存')}
        </Button>
      </div>
    </div>
  );
}