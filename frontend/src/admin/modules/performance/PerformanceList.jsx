/**
 * Performance List Component - Admin Portal
 * 业绩管理列表
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Table, Button, Badge, Modal, Textarea, Pagination, Alert, SearchInput } from '@shared/components';
import { adminService, uploadService } from '@shared/services';
import { formatBusinessLicense } from '@shared/utils';
import { useDateFormatter, useMessage } from '@shared/hooks';

export default function PerformanceList() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const memberId = searchParams.get('memberId');
  const { formatDateTime, formatDate, formatNumber, formatValue } = useDateFormatter();
  const { message, messageVariant, showSuccess, showError, showWarning, clearMessage } = useMessage();
  
  const [loading, setLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [reviewComment, setReviewComment] = useState('');
  const [rejectComment, setRejectComment] = useState('');
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveComment, setApproveComment] = useState('');
  const [allRecords, setAllRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  // 使用 useCallback 包装 setFilteredRecords 避免无限循环
  const handleFilterChange = useCallback((filtered) => {
    setFilteredRecords(filtered);
    setCurrentPage(1); // 重置到第一页
  }, []);

  // 一次性加载所有业绩记录数据
  const loadAllPerformanceRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        memberId: memberId || undefined,
        page: 1,
        pageSize: 1000
      };
      const response = await adminService.listPerformanceRecords(params);
      if (response && response.items) {
        setAllRecords(response.items);
      } else {
        setAllRecords([]);
      }
    } catch (error) {
      console.error('Failed to load performance records:', error);
      setAllRecords([]);
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    loadAllPerformanceRecords();
  }, [loadAllPerformanceRecords]);

  // 状态映射配置
  const getStatusConfig = useCallback((status) => {
    const variantMap = {
      approved: 'success',
      submitted: 'info',
      pending: 'warning',
      revision_requested: 'warning',
      revision_required: 'warning',
      draft: 'secondary',
      rejected: 'danger'
    };
    const statusKeyMap = {
      approved: 'approved',
      submitted: 'submitted',
      pending: 'submitted',
      revision_requested: 'revisionRequested',
      revision_required: 'revisionRequested',
      draft: 'draft',
      rejected: 'rejected'
    };
    const statusKey = statusKeyMap[status] || status;
    return {
      variant: variantMap[status] || 'default',
      label: t(`performance.status.${statusKey}`, status)
    };
  }, [t]);

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

  const handleApprove = async () => {
    await adminService.approvePerformance(selectedRecord.id, approveComment || null);
    showSuccess(t('admin.performance.approveSuccess', '승인 성공'));
    setShowApproveModal(false);
    setApproveComment('');
    setSelectedRecord(null);
    loadAllPerformanceRecords();
  };

  const handleRequestRevision = async () => {
    if (!reviewComment.trim()) {
      showWarning(t('admin.performance.revisionCommentRequired', '수정 의견을 입력하세요'));
      return;
    }

    await adminService.requestPerformanceRevision(selectedRecord.id, reviewComment);
    showSuccess(t('admin.performance.revisionSuccess', '수정 요청이 전송되었습니다'));
    setShowReviewModal(false);
    setReviewComment('');
    setSelectedRecord(null);
    loadAllPerformanceRecords();
  };

  const handleReject = async () => {
    if (!rejectComment.trim()) {
      showWarning(t('admin.performance.rejectCommentRequired', '거부 사유를 입력하세요'));
      return;
    }

    await adminService.rejectPerformance(selectedRecord.id, rejectComment);
    showSuccess(t('admin.performance.rejectSuccess', '거부 성공'));
    setShowRejectModal(false);
    setRejectComment('');
    setSelectedRecord(null);
    loadAllPerformanceRecords();
  };

  const handleViewDetail = (recordId) => {
    if (!recordId) {
      showError(t('admin.performance.detail.notFound', '실적 기록이 존재하지 않습니다'));
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
    try {
      const params = {
        format,
        memberId: memberId || undefined
      };
      await adminService.exportPerformance(params);
      showSuccess(t('admin.performance.exportSuccess', '내보내기 성공'));
    } catch (error) {
      showError(t('admin.performance.exportFailed', '내보내기 실패'));
    } finally {
      setLoading(false);
    }
  };

  // 定义搜索列 - 与表格列保持一致
  const searchColumns = useMemo(() => [
    {
      key: 'memberCompanyName',
      label: t('admin.performance.table.memberName', '기업명'),
      render: (value, row) => {
        if (value) return value;
        if (row.memberBusinessNumber) return row.memberBusinessNumber;
        return '-';
      }
    },
    {
      key: 'memberBusinessNumber',
      label: t('admin.performance.table.businessNumber', '사업자등록번호'),
      render: (value) => value ? formatBusinessLicense(value) : '-'
    },
    {
      key: 'year',
      label: t('admin.performance.table.year'),
      render: (value) => value || ''
    },
    {
      key: 'quarter',
      label: t('admin.performance.table.quarter'),
      render: (value) => value ? `Q${value}` : t('performance.annual', '연간')
    },
    {
      key: 'status',
      label: t('admin.performance.table.status'),
      render: (value) => {
        const statusConfig = getStatusConfig(value);
        return statusConfig.label;
      }
    },
    {
      key: 'submittedAt',
      label: t('admin.performance.table.submittedAt', '제출 시간'),
      render: (value) => formatDateTime(value)
    }
  ], [t, getStatusConfig]);

  const tableColumns = [
    {
      key: 'memberCompanyName',
      label: t('admin.performance.table.memberName', '기업명'),
      render: (value, row) => {
        if (value) return value;
        if (row.memberBusinessNumber) return row.memberBusinessNumber;
        return '-';
      }
    },
    {
      key: 'memberBusinessNumber',
      label: t('admin.performance.table.businessNumber', '사업자등록번호'),
      render: (value) => value ? formatBusinessLicense(value) : '-'
    },
    {
      key: 'year',
      label: t('admin.performance.table.year')
    },
    {
      key: 'quarter',
      label: t('admin.performance.table.quarter'),
      render: (value) => value ? `Q${value}` : t('performance.annual', '연간')
    },
    {
      key: 'status',
      label: t('admin.performance.table.status'),
      render: (value) => {
        const statusConfig = getStatusConfig(value);
        return (
          <Badge variant={statusConfig.variant}>
            {statusConfig.label}
          </Badge>
        );
      }
    },
    {
      key: 'submittedAt',
      label: t('admin.performance.table.submittedAt', '제출 시간'),
      render: (value) => formatDateTime(value)
    },
    {
      key: 'actions',
      label: t('admin.performance.table.actions', '작업'),
      render: (_, row) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!row.id) {
                showError(t('error.record.notFound'));
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
                title={t('admin.performance.requestRevision', '보완 요청')}
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
                title={t('admin.performance.reject', '거부')}
              >
                {t('admin.performance.reject', '거부')}
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedRecord(row);
                  setShowApproveModal(true);
                }}
                className="text-green-600 hover:text-green-900 font-medium text-sm"
                title={t('admin.performance.approve', '승인')}
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
        <Alert variant={messageVariant} className="mb-4" onClose={clearMessage}>
          {message}
        </Alert>
      )}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">{t('admin.performance.title')}</h1>
        
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <SearchInput
            data={allRecords}
            columns={searchColumns}
            onFilter={handleFilterChange}
            placeholder={t('admin.performance.searchPlaceholder', '기업명, 사업자등록번호, 연도, 유형, 상태 등 검색')}
            className="flex-1 min-w-[200px] max-w-md"
          />
          <div className="flex items-center space-x-2 md:ml-4 w-full md:w-auto">
            <Button 
              onClick={() => handleExport('excel')} 
              variant="outline"
              disabled={loading}
            >
              {t('admin.performance.exportExcel', 'Excel 내보내기')}
            </Button>
            <Button 
              onClick={() => handleExport('csv')} 
              variant="outline"
              disabled={loading}
            >
              {t('admin.performance.exportCsv', 'CSV 내보내기')}
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
                <p className="text-lg mb-2">{t('admin.performance.noRecords')}</p>
                <p className="text-sm text-gray-400">
                  {totalCount === 0 
                    ? t('error.record.noDataHint')
                    : t('error.record.noMatchingRecords')}
                </p>
              </div>
            );
          }
          return (
            <>
              <div className="overflow-x-auto -mx-4 px-4">
                <Table 
                  columns={tableColumns} 
                  data={records}
                />
              </div>
              {totalCount > pageSize && (
                <div className="px-6 py-4 border-t border-gray-200 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center text-sm text-gray-700">
                    <span>
                      {t('common.pagination.showing', { 
                        start: ((currentPage - 1) * pageSize) + 1, 
                        end: Math.min(currentPage * pageSize, totalCount), 
                        total: totalCount 
                      })}
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
        title={t('admin.performance.rejectModal.title', '실적 기록 거부')}
      >
        <div className="flex flex-col gap-3 md:gap-4">
          <p>{t('admin.performance.rejectModal.description', '거부 사유를 입력하세요.')}</p>
          <Textarea
            value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value)}
            placeholder={t('admin.performance.rejectModal.placeholder', '거부 사유를 입력하세요...')}
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
              {t('admin.performance.reject', '거부')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 批准模态框 */}
      <Modal
        isOpen={showApproveModal}
        onClose={() => {
          setShowApproveModal(false);
          setApproveComment('');
          setSelectedRecord(null);
        }}
        title={t('admin.performance.approveModal.title', '실적 기록 승인')}
      >
        <div className="flex flex-col gap-3 md:gap-4">
          <p>{t('admin.performance.approveModal.description', '승인 의견을 입력하세요 (선택사항).')}</p>
          <Textarea
            value={approveComment}
            onChange={(e) => setApproveComment(e.target.value)}
            placeholder={t('admin.performance.approveModal.placeholder', '승인 의견을 입력하세요...')}
            rows={5}
          />
          <div className="flex flex-col-reverse md:flex-row justify-end gap-3 md:gap-4 mt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowApproveModal(false);
                setApproveComment('');
                setSelectedRecord(null);
              }}
              className="w-full md:w-auto"
            >
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleApprove}
              className="w-full md:w-auto"
            >
              {t('admin.performance.approve', '승인')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

