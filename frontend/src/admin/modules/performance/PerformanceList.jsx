/**
 * Performance List Component - Admin Portal
 * 业绩管理列表
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Table, Button, Select, Badge, Modal, Textarea } from '@shared/components';
import { adminService } from '@shared/services';
import './PerformanceList.css';

export default function PerformanceList() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const memberId = searchParams.get('memberId');
  
  // Get current language for number formatting
  const currentLanguage = i18n.language === 'zh' ? 'zh' : 'ko';
  
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewComment, setReviewComment] = useState('');
  const [records, setRecords] = useState([]);

  useEffect(() => {
    loadPerformanceRecords();
  }, [statusFilter, memberId]);

  const loadPerformanceRecords = async () => {
    setLoading(true);
    try {
      const params = {
        status: statusFilter !== 'all' ? statusFilter : undefined,
        memberId: memberId || undefined,
        page: 1,
        pageSize: 100 // Load all records for now
      };
      const response = await adminService.listPerformanceRecords(params);
      if (response.records) {
        setRecords(response.records);
      }
    } catch (error) {
      console.error('Failed to load performance records:', error);
      const errorMessage = error.response?.data?.detail || error.message || t('message.loadFailed', '加载失败');
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (record) => {
    try {
      await adminService.approvePerformance(record.id);
      alert(t('admin.performance.approveSuccess', '批准成功') || '批准成功');
      loadPerformanceRecords();
    } catch (error) {
      console.error('Failed to approve record:', error);
      const errorMessage = error.response?.data?.detail || error.message || t('admin.performance.approveFailed', '批准失败');
      alert(errorMessage);
    }
  };

  const handleRequestRevision = async () => {
    if (!reviewComment.trim()) {
      alert(t('admin.performance.revisionCommentRequired', '请输入修改意见') || '请输入修改意见');
      return;
    }

    try {
      await adminService.requestPerformanceRevision(selectedRecord.id, reviewComment);
      alert(t('admin.performance.revisionSuccess', '修改请求已发送') || '修改请求已发送');
      setShowReviewModal(false);
      setReviewComment('');
      loadPerformanceRecords();
    } catch (error) {
      console.error('Failed to request revision:', error);
      const errorMessage = error.response?.data?.detail || error.message || t('admin.performance.revisionFailed', '请求修改失败');
      alert(errorMessage);
    }
  };

  const handleViewDetail = (recordId) => {
    navigate(`/admin/performance/${recordId}`);
  };

  const handleDownload = (recordId) => {
    // Note: File download implementation pending (see 1.4 Frontend Feature Completion)
    // This will be implemented when the backend file download endpoint is ready
  };

  const handleExport = async (format = 'excel') => {
    try {
      setLoading(true);
      const params = {
        format,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        memberId: memberId || undefined
      };
      await adminService.exportPerformance(params);
      alert(t('admin.performance.exportSuccess', '导出成功') || '导出成功');
    } catch (error) {
      console.error('Failed to export performance:', error);
      const errorMessage = error.response?.data?.detail || error.message || t('admin.performance.exportFailed', '导出失败');
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      key: 'year',
      label: t('admin.performance.table.year')
    },
    {
      key: 'quarter',
      label: t('admin.performance.table.quarter'),
      render: (value) => value ? `Q${value}` : t('performance.annual')
    },
    {
      key: 'salesRevenue',
      label: t('admin.performance.table.salesRevenue'),
      render: (value) => {
        const locale = currentLanguage === 'zh' ? 'zh-CN' : 'ko-KR';
        return new Intl.NumberFormat(locale, { style: 'currency', currency: 'KRW' }).format(value || 0);
      }
    },
    {
      key: 'status',
      label: t('admin.performance.table.status'),
      render: (value) => {
        const variantMap = {
          approved: 'success',
          submitted: 'info',
          pending: 'warning', // Legacy support
          revision_requested: 'warning',
          revision_required: 'warning', // Legacy support
          draft: 'secondary',
          rejected: 'danger'
        };
        const statusLabelMap = {
          approved: t('performance.status.approved', '已批准'),
          submitted: t('performance.status.submitted', '已提交'),
          pending: t('performance.status.submitted', '已提交'), // Legacy support
          revision_requested: t('performance.status.revisionRequested', '需修改'),
          revision_required: t('performance.status.revisionRequested', '需修改'), // Legacy support
          draft: t('performance.status.draft', '草稿'),
          rejected: t('performance.status.rejected', '已驳回')
        };
        return (
          <Badge variant={variantMap[value] || 'default'}>
            {statusLabelMap[value] || value}
          </Badge>
        );
      }
    },
    {
      key: 'actions',
      label: '',
      render: (_, row) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleViewDetail(row.id);
            }}
            className="text-primary-600 hover:text-primary-900 font-medium text-sm"
          >
            {t('common.view')}
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDownload(row.id);
            }}
            className="text-primary-600 hover:text-primary-900 font-medium text-sm"
          >
            {t('common.download')}
          </button>
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
              >
                {t('admin.performance.requestRevision')}
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleApprove(row);
                }}
                className="text-green-600 hover:text-green-900 font-medium text-sm"
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
    <div className="admin-performance-list">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">{t('admin.performance.title')}</h1>
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1 max-w-md">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: t('common.all') },
                { value: 'pending', label: t('admin.performance.status.pending') },
                { value: 'revision', label: t('admin.performance.status.revision') },
                { value: 'approved', label: t('admin.performance.status.approved') }
              ]}
            />
          </div>
          <div className="flex items-center space-x-2 ml-4">
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

      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        {loading ? (
          <div className="p-12 text-center text-gray-500">{t('common.loading')}</div>
        ) : (
          <Table 
            columns={columns} 
            data={records}
            selectable={true}
            selectedRows={[]}
            onSelectRow={() => {}}
            onSelectAll={() => {}}
          />
        )}
      </div>

      {/* 补正请求模态框 */}
      <Modal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        title={t('admin.performance.revisionModal.title')}
      >
        <div className="revision-modal-content">
          <p>{t('admin.performance.revisionModal.description')}</p>
          <Textarea
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            placeholder={t('admin.performance.revisionModal.placeholder')}
            rows={5}
          />
          <div className="modal-actions">
            <Button variant="outline" onClick={() => setShowReviewModal(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleRequestRevision}>
              {t('admin.performance.requestRevision')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

