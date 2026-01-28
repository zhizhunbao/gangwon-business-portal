/**
 * Performance List Content - Member Portal
 * 成果查询页面
 */

import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Card, { CardHeader, CardBody } from '@shared/components/Card';
import Button from '@shared/components/Button';
import Select from '@shared/components/Select';
import { Alert, Modal, ModalFooter, Pagination } from '@shared/components';
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@shared/components/Table';
import { performanceService } from '@shared/services';
import { useDateFormatter } from '@shared/hooks';

export default function PerformanceListContent() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { formatDateTime, formatDate, formatNumber, formatValue } = useDateFormatter();
  const [performances, setPerformances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [messageVariant, setMessageVariant] = useState('success');
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });
  const [filters, setFilters] = useState({ year: '', quarter: '', status: '' });
  const [commentModal, setCommentModal] = useState({ open: false, comments: [], status: '' });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0
  });

  const loadPerformances = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        pageSize: pagination.pageSize,
      };
      if (filters.year) params.year = filters.year;
      if (filters.quarter) params.quarter = filters.quarter;
      if (filters.status) params.status = filters.status;

      const response = await performanceService.listRecords(params);
      setPerformances(response.items || []);
      setPagination(prev => ({
        ...prev,
        page: response.page || page,
        total: response.total || 0,
        totalPages: response.totalPages || 0
      }));
    } catch (error) {
      console.error('Load performances error:', error);
      console.error('Error response:', JSON.stringify(error.response?.data, null, 2));
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.pageSize]);

  useEffect(() => {
    loadPerformances(1);
  }, [filters]);

  const handlePageChange = (newPage) => {
    loadPerformances(newPage);
  };

  const confirmDelete = async () => {
    await performanceService.deleteRecord(deleteConfirm.id);
    setMessageVariant('success');
    setMessage(t('message.deleteSuccess', '删除成功'));
    setDeleteConfirm({ open: false, id: null });
    loadPerformances(pagination.page);
  };

  // 获取最新的审核评论
  const getLatestReviewComments = (record) => {
    if (!record.reviews || record.reviews.length === 0) return null;
    const sortedReviews = [...record.reviews].sort(
      (a, b) => new Date(b.reviewedAt) - new Date(a.reviewedAt)
    );
    return sortedReviews.filter(r => r.comments);
  };

  // 显示评论弹窗
  const showComments = (record) => {
    const reviews = getLatestReviewComments(record) || [];
    setCommentModal({ open: true, comments: reviews, status: record.status });
  };

  const getStatusBadge = (status) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-800',
      submitted: 'bg-blue-100 text-blue-800',
      revision_requested: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    const labels = {
      draft: t('performance.status.draft', '草稿'),
      submitted: t('performance.status.submitted', '已提交'),
      revision_requested: t('performance.status.revisionRequested', '需修改'),
      approved: t('performance.status.approved', '已批准'),
      rejected: t('performance.status.rejected', '已驳回')
    };
    return (
      <span className={`inline-block px-1.5 py-0.5 rounded text-xs sm:text-sm font-medium ${styles[status] || styles.draft}`}>
        {labels[status] || status}
      </span>
    );
  };

  const yearOptions = [
    { value: '', label: t('common.all', '전체') },
    ...Array.from({ length: 5 }, (_, i) => {
      const year = new Date().getFullYear() - i;
      return { value: year.toString(), label: `${year}${t('common.year', '년')}` };
    })
  ];

  const quarterLabels = {
    1: t('performance.quarterLabels.first'),
    2: t('performance.quarterLabels.second'),
    3: t('performance.quarterLabels.third'),
    4: t('performance.quarterLabels.fourth')
  };

  const quarterOptions = [
    { value: '', label: t('common.all', '전체') },
    { value: '1', label: quarterLabels[1] },
    { value: '2', label: quarterLabels[2] },
    { value: '3', label: quarterLabels[3] },
    { value: '4', label: quarterLabels[4] }
  ];

  const statusOptions = [
    { value: '', label: t('common.all', '전체') },
    { value: 'draft', label: t('performance.status.draft', '草稿') },
    { value: 'submitted', label: t('performance.status.submitted', '已提交') },
    { value: 'revision_requested', label: t('performance.status.revisionRequested', '需修改') },
    { value: 'approved', label: t('performance.status.approved', '已批准') },
    { value: 'rejected', label: t('performance.status.rejected', '已驳回') }
  ];

  return (
    <div className="performance-list-content w-full max-w-full">
      {message && (
        <div className="mb-4">
          <Alert variant={messageVariant} onClose={() => setMessage(null)}>
            {message}
          </Alert>
        </div>
      )}

      {/* 标题栏 */}
      <div className="mb-6 sm:mb-8 lg:mb-10 min-h-[48px] flex items-center">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 m-0">
          {t('performance.query', '成果查询')}
        </h1>
      </div>

      {/* 筛选 */}
      <Card className="mb-6">
        <CardHeader>
          <h2 className="text-lg font-semibold">{t('common.filter', '筛选')}</h2>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label={t('performance.year', '年度')}
              value={filters.year}
              onChange={(e) => setFilters(f => ({ ...f, year: e.target.value }))}
              options={yearOptions}
            />
            <Select
              label={t('performance.quarter', '季度')}
              value={filters.quarter}
              onChange={(e) => setFilters(f => ({ ...f, quarter: e.target.value }))}
              options={quarterOptions}
            />
            <Select
              label={t('performance.documentStatus', '状态')}
              value={filters.status}
              onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
              options={statusOptions}
            />
          </div>
        </CardBody>
      </Card>

      {/* 列表 */}
      <Card>
        <CardBody>
          <p className="text-sm text-gray-600 mb-4">
            {t('performance.resultsCount', '共{{count}}条记录', { count: pagination.total })}
          </p>

          {loading ? (
            <div className="text-center py-12 text-gray-500">{t('common.loading', '로딩 중...')}</div>
          ) : performances.length === 0 ? (
            <div className="text-center py-12 text-gray-500">{t('common.noData', '데이터가 없습니다')}</div>
          ) : (
            <>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>{t('performance.period', '期间')}</TableHeader>
                    <TableHeader>{t('performance.documentStatus', '状态')}</TableHeader>
                    <TableHeader>{t('performance.submittedAt', '提交时间')}</TableHeader>
                    <TableHeader>{t('performance.updatedAt', '更新时间')}</TableHeader>
                    <TableHeader>{t('common.actions', '작업')}</TableHeader>
                  </TableRow>
                </TableHead>
                  <TableBody>
                    {performances.map((perf) => (
                      <TableRow key={perf.id}>
                        <TableCell>
                          <span className="font-medium">
                            {perf.year}{t('common.year', '년')} {perf.quarter ? quarterLabels[perf.quarter] : t('performance.annual', '年度')}
                          </span>
                        </TableCell>
                        <TableCell>{getStatusBadge(perf.status)}</TableCell>
                        <TableCell className="text-gray-600 text-sm">
                          {formatDateTime(perf.submittedAt)}
                        </TableCell>
                        <TableCell className="text-gray-600 text-sm">
                          {formatDateTime(perf.updatedAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {/* 查看管理员备注按钮 */}
                            {(perf.status === 'revision_requested' || perf.status === 'rejected') && 
                              getLatestReviewComments(perf)?.length > 0 && (
                              <>
                                <button
                                  onClick={() => showComments(perf)}
                                  className="text-yellow-600 hover:text-yellow-900 font-medium text-sm"
                                >
                                  {t('performance.viewComments', '查看意见')}
                                </button>
                                <span className="text-gray-300">|</span>
                              </>
                            )}
                            {/* 编辑按钮 - 只有草稿和需修改状态可以编辑 */}
                            {(perf.status === 'draft' || perf.status === 'revision_requested') && (
                              <>
                                <button
                                  onClick={() => navigate(`/member/performance/edit/${perf.id}`)}
                                  className="text-primary-600 hover:text-primary-900 font-medium text-sm"
                                >
                                  {t('common.edit', '수정')}
                                </button>
                                <span className="text-gray-300">|</span>
                              </>
                            )}
                            {/* 删除按钮 - 只有草稿和需修改状态可以删除 */}
                            {(perf.status === 'draft' || perf.status === 'revision_requested') && (
                              <button
                                onClick={() => setDeleteConfirm({ open: true, id: perf.id })}
                                className="text-red-600 hover:text-red-900 font-medium text-sm"
                              >
                                {t('common.delete', '삭제')}
                              </button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

              {/* 分页 */}
              {pagination.totalPages > 1 && (
                <div className="sticky bottom-0 mt-auto py-3">
                  <div className="flex justify-between items-center px-1 sm:px-0">
                    <div className="text-xs text-gray-500 whitespace-nowrap">
                      {t('common.itemsPerPage', '每页显示')}: {pagination.pageSize} · {t('common.total', '합계')}: {pagination.total}
                    </div>
                    <Pagination
                      currentPage={pagination.page}
                      totalPages={pagination.totalPages}
                      onPageChange={handlePageChange}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </CardBody>
      </Card>

      {/* 删除确认弹窗 */}
      <Modal
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, id: null })}
        title={t('common.confirmDeleteTitle', '删除确认')}
        size="sm"
      >
        <p className="py-4 text-gray-700">{t('common.confirmDelete', '确定要删除这条记录吗？')}</p>
        <ModalFooter>
          <Button variant="outline" onClick={() => setDeleteConfirm({ open: false, id: null })}>
            {t('common.cancel', '취소')}
          </Button>
          <Button variant="primary" onClick={confirmDelete}>
            {t('common.delete', '삭제')}
          </Button>
        </ModalFooter>
      </Modal>

      {/* 管理员审核意见弹窗 */}
      <Modal
        isOpen={commentModal.open}
        onClose={() => setCommentModal({ open: false, comments: [], status: '' })}
        title={t('performance.reviewComments', '审核意见')}
        size="md"
      >
        <div className="py-4">
          {commentModal.status && (
            <div className="mb-4">
              <span className="text-sm text-gray-500">{t('performance.documentStatus', '状态')}：</span>
              {getStatusBadge(commentModal.status)}
            </div>
          )}
          {commentModal.comments.length > 0 ? (
            <div className="space-y-4">
              {commentModal.comments.map((review, idx) => (
                <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-gray-700 whitespace-pre-wrap">{review.comments}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {formatDateTime(review.reviewedAt)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">{t('performance.noComments', '暂无审核意见')}</p>
          )}
        </div>
        <ModalFooter>
          <Button variant="primary" onClick={() => setCommentModal({ open: false, comments: [], status: '' })}>
            {t('common.close', '닫기')}
          </Button>
        </ModalFooter>
      </Modal>

    </div>
  );
}
