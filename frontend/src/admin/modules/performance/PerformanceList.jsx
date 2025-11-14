/**
 * Performance List Component - Admin Portal
 * 业绩管理列表
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Table, Button, Select, Badge, Modal, Textarea } from '@shared/components';
import { apiService } from '@shared/services';
import { API_PREFIX } from '@shared/utils/constants';
import './PerformanceList.css';

export default function PerformanceList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const memberId = searchParams.get('memberId');
  
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
        memberId: memberId || undefined
      };
      const response = await apiService.get(`${API_PREFIX}/admin/performance`, params);
      if (response.records) {
        setRecords(response.records);
      }
    } catch (error) {
      console.error('Failed to load performance records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (record) => {
    try {
      await apiService.post(`${API_PREFIX}/admin/performance/${record.id}/approve`);
      loadPerformanceRecords();
    } catch (error) {
      console.error('Failed to approve record:', error);
      alert(t('admin.performance.approveFailed'));
    }
  };

  const handleRequestRevision = async () => {
    try {
      await apiService.post(`${API_PREFIX}/admin/performance/${selectedRecord.id}/revision`, {
        comment: reviewComment
      });
      setShowReviewModal(false);
      setReviewComment('');
      loadPerformanceRecords();
    } catch (error) {
      console.error('Failed to request revision:', error);
      alert(t('admin.performance.revisionFailed'));
    }
  };

  const handleViewDetail = (recordId) => {
    navigate(`/admin/performance/${recordId}`);
  };

  const handleDownload = (recordId) => {
    // TODO: 实现文件下载
    console.log('Downloading record:', recordId);
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
      render: (value) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(value || 0)
    },
    {
      key: 'status',
      label: t('admin.performance.table.status'),
      render: (value) => {
        const variantMap = {
          approved: 'success',
          pending: 'warning',
          revision_required: 'warning',
          draft: 'secondary'
        };
        return (
          <Badge variant={variantMap[value] || 'default'}>
            {t(`performance.status.${value}`)}
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
          {row.status === 'pending' && (
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

