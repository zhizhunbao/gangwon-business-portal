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
import { performanceService, uploadService } from '@shared/services';
import { DownloadIcon, EditIcon, TrashIcon, InfoIcon } from '@shared/components/Icons';

export default function PerformanceListContent() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [performances, setPerformances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [messageVariant, setMessageVariant] = useState('success');
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });
  const [filters, setFilters] = useState({ year: '', quarter: '', status: '' });
  const [commentModal, setCommentModal] = useState({ open: false, comments: [], status: '' });
  const [attachmentModal, setAttachmentModal] = useState({ open: false, attachments: [], canDownload: false });
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
      // 添加筛选参数
      if (filters.year) params.year = filters.year;
      if (filters.quarter) params.quarter = filters.quarter;
      if (filters.status) params.status = filters.status;

      const response = await performanceService.listRecords(params);
      setPerformances(response.records || []);
      setPagination(prev => ({
        ...prev,
        page: response.page || page,
        total: response.total || 0,
        totalPages: response.totalPages || 0
      }));
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

  const handleDownload = async (fileId, fileName) => {
    if (fileId) await uploadService.downloadFile(fileId, fileName);
  };

  // 获取最新的审核评论
  const getLatestReviewComments = (record) => {
    if (!record.reviews || record.reviews.length === 0) return null;
    const sortedReviews = [...record.reviews].sort(
      (a, b) => new Date(b.reviewed_at) - new Date(a.reviewed_at)
    );
    return sortedReviews.filter(r => r.comments);
  };

  // 显示评论弹窗
  const showComments = (record) => {
    const reviews = getLatestReviewComments(record) || [];
    setCommentModal({ open: true, comments: reviews, status: record.status });
  };

  // 检查是否可以下载（只有已批准的才能下载）
  const canDownload = (status) => status === 'approved';

  // 显示附件弹窗
  const showAttachments = (record) => {
    const attachments = getAttachments(record);
    setAttachmentModal({ 
      open: true, 
      attachments, 
      canDownload: canDownload(record.status) 
    });
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

  // 格式化日期时间 (YYYY-MM-DD)
  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const yearOptions = [
    { value: '', label: t('common.all', '全部') },
    ...Array.from({ length: 5 }, (_, i) => {
      const year = new Date().getFullYear() - i;
      return { value: year.toString(), label: `${year}${t('common.year', '年')}` };
    })
  ];

  const quarterLabels = {
    1: t('performance.quarterLabels.first'),
    2: t('performance.quarterLabels.second'),
    3: t('performance.quarterLabels.third'),
    4: t('performance.quarterLabels.fourth')
  };

  const quarterOptions = [
    { value: '', label: t('common.all', '全部') },
    { value: '1', label: quarterLabels[1] },
    { value: '2', label: quarterLabels[2] },
    { value: '3', label: quarterLabels[3] },
    { value: '4', label: quarterLabels[4] }
  ];

  const statusOptions = [
    { value: '', label: t('common.all', '全部') },
    { value: 'draft', label: t('performance.status.draft', '草稿') },
    { value: 'submitted', label: t('performance.status.submitted', '已提交') },
    { value: 'revision_requested', label: t('performance.status.revisionRequested', '需修改') },
    { value: 'approved', label: t('performance.status.approved', '已批准') },
    { value: 'rejected', label: t('performance.status.rejected', '已驳回') }
  ];

  const getAttachments = (record) => {
    // 优先使用后端返回的 attachments 字段
    if (record.attachments && record.attachments.length > 0) {
      return record.attachments;
    }
    // 兼容旧数据：从 data_json 中获取
    if (!record.data_json) return [];
    const data = typeof record.data_json === 'string' ? JSON.parse(record.data_json) : record.data_json;
    return data.attachments || [];
  };

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
            <div className="text-center py-12 text-gray-500">{t('common.loading', '加载中...')}</div>
          ) : performances.length === 0 ? (
            <div className="text-center py-12 text-gray-500">{t('common.noData', '暂无数据')}</div>
          ) : (
            <>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>{t('performance.period', '期间')}</TableHeader>
                    <TableHeader>{t('performance.documentStatus', '状态')}</TableHeader>
                    <TableHeader>{t('performance.submittedAt', '提交时间')}</TableHeader>
                    <TableHeader>{t('performance.updatedAt', '更新时间')}</TableHeader>
                    <TableHeader>{t('performance.documentConfirm', '附件')}</TableHeader>
                    <TableHeader>{t('common.actions', '操作')}</TableHeader>
                  </TableRow>
                </TableHead>
                  <TableBody>
                    {performances.map((perf) => (
                      <TableRow key={perf.id}>
                        <TableCell>
                          <span className="font-medium">
                            {perf.year}{t('common.year', '年')} {perf.quarter ? quarterLabels[perf.quarter] : t('performance.annual', '年度')}
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
                          {getAttachments(perf).length > 0 ? (
                            <button
                              onClick={() => showAttachments(perf)}
                              className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-800 hover:underline"
                            >
                              <span>{t('common.attachment', '📎')}</span>
                              <span>{t('performance.fileCount', '{{count}}个文件', { count: getAttachments(perf).length })}</span>
                            </button>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
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
                                {(perf.status === 'draft' || perf.status === 'revision_requested') && (
                                  <span className="text-gray-300">|</span>
                                )}
                              </>
                            )}
                            {(perf.status === 'draft' || perf.status === 'revision_requested') && (
                              <>
                                <button
                                  onClick={() => navigate(`/member/performance/edit/${perf.id}`)}
                                  className="text-primary-600 hover:text-primary-900 font-medium text-sm"
                                >
                                  {t('common.edit', '编辑')}
                                </button>
                                {perf.status === 'draft' && (
                                  <span className="text-gray-300">|</span>
                                )}
                              </>
                            )}
                            {perf.status === 'draft' && (
                              <button
                                onClick={() => setDeleteConfirm({ open: true, id: perf.id })}
                                className="text-red-600 hover:text-red-900 font-medium text-sm"
                              >
                                {t('common.delete', '删除')}
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
                      {t('common.itemsPerPage', '每页显示')}: {pagination.pageSize} · {t('common.total', '共')}: {pagination.total}
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
            {t('common.cancel', '取消')}
          </Button>
          <Button variant="primary" onClick={confirmDelete}>
            {t('common.delete', '删除')}
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
                    {formatDateTime(review.reviewed_at)}
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
            {t('common.close', '关闭')}
          </Button>
        </ModalFooter>
      </Modal>

      {/* 附件列表弹窗 */}
      <Modal
        isOpen={attachmentModal.open}
        onClose={() => setAttachmentModal({ open: false, attachments: [], canDownload: false })}
        title={t('performance.attachmentList', '附件列表')}
        size="md"
      >
        <div className="py-4">
          {!attachmentModal.canDownload && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-700">
                {t('performance.downloadApprovedOnly', '只有已批准的文档才能下载')}
              </p>
            </div>
          )}
          {attachmentModal.attachments.length > 0 ? (
            <div className="space-y-2">
              {attachmentModal.attachments.map((att, idx) => {
                const fileName = att.original_name || att.name || t('performance.download', '下载');
                return (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-gray-400">📄</span>
                      <span className="text-sm text-gray-700 truncate">{fileName}</span>
                    </div>
                    <Button
                      variant={attachmentModal.canDownload ? 'outline' : 'secondary'}
                      size="sm"
                      disabled={!attachmentModal.canDownload}
                      onClick={() => attachmentModal.canDownload && handleDownload(att.id || att.file_id, fileName)}
                    >
                      <DownloadIcon className="w-4 h-4 mr-1" />
                      {t('common.download', '下载')}
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500">{t('common.noData', '暂无数据')}</p>
          )}
        </div>
        <ModalFooter>
          <Button variant="primary" onClick={() => setAttachmentModal({ open: false, attachments: [], canDownload: false })}>
            {t('common.close', '关闭')}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
