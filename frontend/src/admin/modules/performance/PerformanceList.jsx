/**
 * Performance List Component - Admin Portal
 * 业绩管理列表
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Table, Button, Badge, Modal, Textarea, Pagination, Alert, SearchInput } from '@shared/components';
import { adminService, uploadService } from '@shared/services';
import { formatBusinessLicense, formatDateTime } from '@shared/utils/format';

export default function PerformanceList() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const memberId = searchParams.get('memberId');
  
  // Get current language for number formatting
  const currentLanguage = i18n.language === 'zh' ? 'zh' : 'ko';
  
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [reviewComment, setReviewComment] = useState('');
  const [rejectComment, setRejectComment] = useState('');
  const [allRecords, setAllRecords] = useState([]); // 存储所有数据
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [message, setMessage] = useState(null);
  const [messageVariant, setMessageVariant] = useState('success');

  // 一次性加载所有业绩记录数据
  const loadAllPerformanceRecords = useCallback(async () => {
    setLoading(true);
    const params = {
      memberId: memberId || undefined,
      page: 1,
      pageSize: 10000 // 加载所有数据
    };
    const response = await adminService.listPerformanceRecords(params);
    if (response && response.records) {
      setAllRecords(response.records);
    } else {
      setAllRecords([]);
    }
    setLoading(false);
  }, [memberId]);

  useEffect(() => {
    loadAllPerformanceRecords();
  }, [loadAllPerformanceRecords]);

  // 前端模糊搜索和过滤 - 匹配所有列
  const filteredRecords = useMemo(() => {
    return allRecords.filter(record => {
      // 搜索关键词过滤
      if (searchKeyword) {
        const keyword = searchKeyword.toLowerCase();
        const searchKeywordNormalized = searchKeyword.replace(/-/g, '').toLowerCase();
        
        // 将所有字段值转换为可搜索的字符串
        const searchableText = [
          // 企业信息
          record.memberCompanyName || '',
          (record.memberBusinessNumber || '').replace(/-/g, ''),
          // 年度和季度
          record.year ? String(record.year) : '',
          record.quarter ? `Q${record.quarter}` : t('performance.annual', '年度'),
          // 类型（搜索原始值和翻译值）
          record.type || '',
          record.type ? t(`performance.types.${record.type}`, record.type) : '',
          // 状态（搜索原始值和翻译值）
          record.status || '',
          record.status ? t(`performance.status.${record.status}`, record.status) : '',
          // 提交时间
          record.submittedAt ? formatDateTime(record.submittedAt, 'yyyy-MM-dd HH:mm', currentLanguage) : '',
          // ID（用于精确搜索）
          record.id || '',
        ].join(' ').toLowerCase();
        
        // 同时检查原始关键词和去除连字符后的关键词
        if (!searchableText.includes(keyword) && 
            !searchableText.includes(searchKeywordNormalized)) {
          return false;
        }
      }
      return true;
    });
  }, [allRecords, searchKeyword, t, currentLanguage]);

  // 分页后的数据
  const records = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredRecords.slice(start, end);
  }, [filteredRecords, currentPage, pageSize]);

  // 更新总数
  useEffect(() => {
    setTotalCount(filteredRecords.length);
  }, [filteredRecords]);

  const handleApprove = async (record) => {
    await adminService.approvePerformance(record.id);
    setMessageVariant('success');
    setMessage(t('admin.performance.approveSuccess', '批准成功') || '批准成功');
    setTimeout(() => setMessage(null), 3000);
    loadAllPerformanceRecords();
  };

  const handleRequestRevision = async () => {
    if (!reviewComment.trim()) {
      setMessageVariant('warning');
      setMessage(t('admin.performance.revisionCommentRequired', '请输入修改意见') || '请输入修改意见');
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    await adminService.requestPerformanceRevision(selectedRecord.id, reviewComment);
    setMessageVariant('success');
    setMessage(t('admin.performance.revisionSuccess', '修改请求已发送') || '修改请求已发送');
    setTimeout(() => setMessage(null), 3000);
    setShowReviewModal(false);
    setReviewComment('');
    setSelectedRecord(null);
    loadAllPerformanceRecords();
  };

  const handleReject = async () => {
    if (!rejectComment.trim()) {
      setMessageVariant('warning');
      setMessage(t('admin.performance.rejectCommentRequired', '请输入驳回原因') || '请输入驳回原因');
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    await adminService.rejectPerformance(selectedRecord.id, rejectComment);
    setMessageVariant('success');
    setMessage(t('admin.performance.rejectSuccess', '驳回成功') || '驳回成功');
    setTimeout(() => setMessage(null), 3000);
    setShowRejectModal(false);
    setRejectComment('');
    setSelectedRecord(null);
    loadAllPerformanceRecords();
  };

  const handleViewDetail = (recordId) => {
    if (!recordId) {
      setMessageVariant('error');
      setMessage(t('admin.performance.detail.notFound', '记录ID不存在') || '记录ID不存在');
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    const idString = typeof recordId === 'string' ? recordId : String(recordId);
    navigate(`/admin/performance/${idString}`);
  };

  const handleRowClick = (row) => {
    if (row && row.id) {
      handleViewDetail(row.id);
    }
  };

  const handleDownload = (record) => {
    // 直接跳转到详情页，让用户在详情页查看和选择下载附件
    handleViewDetail(record.id);
  };

  const handleExport = async (format = 'excel') => {
    setLoading(true);
    const params = {
      format,
      memberId: memberId || undefined
    };
    await adminService.exportPerformance(params);
    setMessageVariant('success');
    setMessage(t('admin.performance.exportSuccess', '导出成功') || '导出成功');
    setTimeout(() => setMessage(null), 3000);
    setLoading(false);
  };

  const columns = [
    {
      key: 'memberCompanyName',
      label: t('admin.performance.table.memberName', '企业名称'),
      render: (value, row) => {
        if (value) return value;
        if (row.memberBusinessNumber) return row.memberBusinessNumber;
        return '-';
      }
    },
    {
      key: 'memberBusinessNumber',
      label: t('admin.performance.table.businessNumber', '营业执照号'),
      render: (value) => value ? formatBusinessLicense(value) : '-'
    },
    {
      key: 'year',
      label: t('admin.performance.table.year')
    },
    {
      key: 'quarter',
      label: t('admin.performance.table.quarter'),
      render: (value) => value ? `Q${value}` : t('performance.annual', '年度')
    },
    {
      key: 'type',
      label: t('admin.performance.table.type', '类型'),
      render: (value) => t(`performance.types.${value}`, value)
    },
    {
      key: 'status',
      label: t('admin.performance.table.status'),
      render: (value) => {
        const variantMap = {
          approved: 'success',
          submitted: 'info',
          pending: 'warning',
          revision_requested: 'warning',
          revision_required: 'warning',
          draft: 'secondary',
          rejected: 'danger'
        };
        // 映射后端状态值到 i18n key
        const statusKeyMap = {
          approved: 'approved',
          submitted: 'submitted',
          pending: 'submitted',
          revision_requested: 'revisionRequested',
          revision_required: 'revisionRequested',
          draft: 'draft',
          rejected: 'rejected'
        };
        const statusKey = statusKeyMap[value] || value;
        return (
          <Badge variant={variantMap[value] || 'default'}>
            {t(`performance.status.${statusKey}`, value)}
          </Badge>
        );
      }
    },
    {
      key: 'submittedAt',
      label: t('admin.performance.table.submittedAt', '提交时间'),
      render: (value) => {
        if (!value) return '-';
        return formatDateTime(value, 'yyyy-MM-dd HH:mm', currentLanguage);
      }
    },
    {
      key: 'actions',
      label: t('admin.performance.table.actions', '操作'),
      render: (_, row) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!row.id) {
                setMessageVariant('error');
                setMessage('记录ID不存在，无法查看详情');
                setTimeout(() => setMessage(null), 3000);
                return;
              }
              handleViewDetail(row.id);
            }}
            className="text-primary-600 hover:text-primary-900 font-medium text-sm"
          >
            {t('common.view')}
          </button>
          {/* 显示操作按钮：只有 submitted 或 pending 状态的记录可以操作 */}
          {(row.status === 'submitted' || row.status === 'pending') && (
            <>
              <span className="text-gray-300">|</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedRecord(row);
                  setShowReviewModal(true);
                }}
                className="text-yellow-600 hover:text-yellow-900 font-medium text-sm"
                title={t('admin.performance.requestRevision', '请求补正')}
              >
                {t('admin.performance.requestRevision')}
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedRecord(row);
                  setShowRejectModal(true);
                }}
                className="text-red-600 hover:text-red-900 font-medium text-sm"
                title={t('admin.performance.reject', '驳回')}
              >
                {t('admin.performance.reject', '驳回')}
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleApprove(row);
                }}
                className="text-green-600 hover:text-green-900 font-medium text-sm"
                title={t('admin.performance.approve', '批准')}
              >
                {t('admin.performance.approve')}
              </button>
            </>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="w-full">
      {message && (
        <Alert variant={messageVariant} className="mb-4" onClose={() => setMessage(null)}>
          {message}
        </Alert>
      )}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">{t('admin.performance.title')}</h1>
        
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex-1 min-w-[200px] max-w-md">
            <SearchInput
              value={searchKeyword}
              onChange={(value) => {
                setSearchKeyword(value);
                setCurrentPage(1);
              }}
              placeholder={t('admin.performance.searchPlaceholder', '搜索所有列：企业名称、营业执照号、年度、季度、类型、状态等')}
            />
          </div>
          <div className="flex items-center space-x-2 md:ml-4 w-full md:w-auto">
            <Button 
              onClick={() => handleExport('excel')} 
              variant="outline"
              disabled={loading}
            >
              {t('admin.performance.exportExcel', '导出 Excel')}
            </Button>
            <Button 
              onClick={() => handleExport('csv')} 
              variant="outline"
              disabled={loading}
            >
              {t('admin.performance.exportCsv', '导出 CSV')}
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        {(() => {
          if (loading) {
            return <div className="p-12 text-center text-gray-500">{t('common.loading')}</div>;
          }
          if (records.length === 0) {
            return (
              <div className="p-12 text-center text-gray-500">
                <p className="text-lg mb-2">{t('admin.performance.noRecords', '暂无业绩数据') || '暂无业绩数据'}</p>
                <p className="text-sm text-gray-400">
                  {totalCount === 0 
                    ? '请检查数据库是否已生成测试数据，或尝试刷新页面'
                    : '当前筛选条件下没有匹配的业绩记录'}
                </p>
              </div>
            );
          }
          return (
            <>
              <div className="overflow-x-auto -mx-4 px-4">
                <Table 
                  columns={columns} 
                  data={records}
                />
              </div>
              {totalCount > pageSize && (
                <div className="px-6 py-4 border-t border-gray-200 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center text-sm text-gray-700">
                    <span>
                      {t('common.showing', { 
                        start: ((currentPage - 1) * pageSize) + 1, 
                        end: Math.min(currentPage * pageSize, totalCount), 
                        total: totalCount 
                      }) || `显示 ${((currentPage - 1) * pageSize) + 1}-${Math.min(currentPage * pageSize, totalCount)} 共 ${totalCount} 条`}
                    </span>
                  </div>
                  <Pagination
                    current={currentPage}
                    total={totalCount}
                    pageSize={pageSize}
                    onChange={setCurrentPage}
                  />
                </div>
              )}
            </>
          );
        })()}
      </div>

      {/* 补正请求模态框 */}
      <Modal
        isOpen={showReviewModal}
        onClose={() => {
          setShowReviewModal(false);
          setReviewComment('');
          setSelectedRecord(null);
        }}
        title={t('admin.performance.revisionModal.title')}
      >
        <div className="flex flex-col gap-3 md:gap-4">
          <p>{t('admin.performance.revisionModal.description')}</p>
          <Textarea
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            placeholder={t('admin.performance.revisionModal.placeholder')}
            rows={5}
          />
          <div className="flex flex-col-reverse md:flex-row justify-end gap-3 md:gap-4 mt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowReviewModal(false);
                setReviewComment('');
                setSelectedRecord(null);
              }}
              className="w-full md:w-auto"
            >
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleRequestRevision}
              className="w-full md:w-auto"
            >
              {t('admin.performance.requestRevision')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 驳回模态框 */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setRejectComment('');
          setSelectedRecord(null);
        }}
        title={t('admin.performance.rejectModal.title', '驳回业绩记录')}
      >
        <div className="flex flex-col gap-3 md:gap-4">
          <p>{t('admin.performance.rejectModal.description', '请输入驳回原因。')}</p>
          <Textarea
            value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value)}
            placeholder={t('admin.performance.rejectModal.placeholder', '请输入驳回原因...')}
            rows={5}
          />
          <div className="flex flex-col-reverse md:flex-row justify-end gap-3 md:gap-4 mt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowRejectModal(false);
                setRejectComment('');
                setSelectedRecord(null);
              }}
              className="w-full md:w-auto"
            >
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleReject}
              variant="outline"
              className="w-full md:w-auto border-red-600 text-red-600 hover:bg-red-50"
            >
              {t('admin.performance.reject', '驳回')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

