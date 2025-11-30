/**
 * Performance List Content - Member Portal
 * 成果查询页面内容组件
 */

import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card, { CardHeader, CardBody } from '@shared/components/Card';
import Button from '@shared/components/Button';
import Input from '@shared/components/Input';
import Select from '@shared/components/Select';
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@shared/components/Table';
import { performanceService, uploadService } from '@shared/services';
import { DownloadIcon, EditIcon, TrashIcon, SearchIcon } from '@shared/components/Icons';
import './PerformanceListContent.css';

export default function PerformanceListContent() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [performances, setPerformances] = useState([]);
  const [filteredPerformances, setFilteredPerformances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchFilters, setSearchFilters] = useState({
    year: '',
    quarter: '',
    status: ''
  });

  useEffect(() => {
    loadPerformances();
  }, [i18n.language]); // Reload data when language changes

  useEffect(() => {
    filterPerformances();
  }, [performances, searchFilters]);

  const loadPerformances = async () => {
    setLoading(true);
    try {
      const response = await performanceService.listRecords({
        year: searchFilters.year || undefined,
        quarter: searchFilters.quarter || undefined,
        status: searchFilters.status || undefined,
        page: 1,
        pageSize: 100 // Load all records for now
      });
      
      if (response.records) {
        const formatted = response.records.map(r => {
          // Extract attachments from data_json if available
          let attachments = [];
          if (r.data_json) {
            try {
              const dataJson = typeof r.data_json === 'string' ? JSON.parse(r.data_json) : r.data_json;
              
              // Check for attachments in different possible locations
              if (dataJson.attachments && Array.isArray(dataJson.attachments)) {
                attachments = dataJson.attachments;
              } else if (dataJson.intellectualProperty && Array.isArray(dataJson.intellectualProperty)) {
                // Extract proof documents from intellectual property
                dataJson.intellectualProperty.forEach(ip => {
                  if (ip.proofDocument && ip.proofDocument.file_id) {
                    attachments.push({
                      file_id: ip.proofDocument.file_id,
                      original_name: ip.proofDocument.original_name || ip.proofDocument.name,
                      name: ip.proofDocument.original_name || ip.proofDocument.name
                    });
                  }
                });
              }
            } catch (e) {
              console.warn('Failed to parse data_json for attachments:', e);
            }
          }
          
          // Get file info from first attachment if available
          const firstAttachment = attachments.length > 0 ? attachments[0] : null;
          
          return {
            id: r.id,
            year: r.year,
            quarter: r.quarter,
            type: r.quarter ? 'quarterly' : 'annual',
            status: r.status,
            submittedDate: r.submittedAt ? new Date(r.submittedAt).toISOString().split('T')[0] : null,
            approvedDate: null, // Will be populated from reviews if needed
            documentType: r.type || '成果报告',
            fileName: firstAttachment?.original_name || firstAttachment?.name || `成果报告_${r.year}_${r.quarter || '年度'}.pdf`,
            fileId: firstAttachment?.file_id || null,
            fileUrl: firstAttachment?.file_url || null,
            isOwnUpload: true, // All records are owned by current user
            attachments: attachments
          };
        });
        setPerformances(formatted);
      }
    } catch (error) {
      console.error('Failed to load performances:', error);
      const errorMessage = error.response?.data?.detail || error.message || t('message.loadFailed', '加载失败');
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const filterPerformances = () => {
    let filtered = [...performances];

    if (searchFilters.year) {
      filtered = filtered.filter(p => p.year.toString() === searchFilters.year);
    }

    if (searchFilters.quarter) {
      filtered = filtered.filter(p => p.quarter?.toString() === searchFilters.quarter);
    }

    if (searchFilters.status) {
      filtered = filtered.filter(p => p.status === searchFilters.status);
    }

    setFilteredPerformances(filtered);
  };

  const handleFilterChange = (field, value) => {
    setSearchFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('common.confirmDelete', '确定要删除这条记录吗？'))) {
      return;
    }

    try {
      await performanceService.deleteRecord(id);
      alert(t('message.deleteSuccess', '删除成功'));
      loadPerformances();
    } catch (error) {
      console.error('Failed to delete:', error);
      const errorMessage = error.response?.data?.detail || error.message || t('message.deleteFailed', '删除失败');
      alert(errorMessage);
    }
  };

  const handleEdit = (id) => {
    navigate(`/member/performance/edit/${id}`);
  };

  const handleDownload = async (fileId, fileName) => {
    try {
      if (!fileId) {
        alert(t('message.fileNotFound', '文件不存在'));
        return;
      }

      // Use upload service to download file
      await uploadService.downloadFile(fileId, fileName);
    } catch (error) {
      console.error('Failed to download:', error);
      const errorMessage = error.response?.data?.detail || error.message || t('message.downloadFailed', '下载失败');
      alert(errorMessage);
    }
  };

  const handleDownloadByUrl = async (fileUrl, fileName) => {
    try {
      if (!fileUrl) {
        alert(t('message.fileNotFound', '文件不存在'));
        return;
      }

      // Use upload service to download file by URL
      await uploadService.downloadFileByUrl(fileUrl, fileName);
    } catch (error) {
      console.error('Failed to download:', error);
      const errorMessage = error.response?.data?.detail || error.message || t('message.downloadFailed', '下载失败');
      alert(errorMessage);
    }
  };

  const getStatusBadgeClass = (status) => {
    // Map backend status to frontend classes
    const statusMap = {
      draft: 'badge-secondary',
      submitted: 'badge-info',
      revision_requested: 'badge-warning',
      needSupplement: 'badge-warning', // Legacy support
      approved: 'badge-success',
      rejected: 'badge-danger'
    };
    return `badge ${statusMap[status] || 'badge-secondary'}`;
  };

  const getStatusLabel = (status) => {
    // Map backend status to frontend labels
    const statusMap = {
      draft: t('performance.status.draft', '草稿'),
      submitted: t('performance.status.submitted', '已提交'),
      revision_requested: t('performance.status.revisionRequested', '需修改'),
      needSupplement: t('performance.status.needSupplement', '需补充'), // Legacy support
      approved: t('performance.status.approved', '已批准'),
      rejected: t('performance.status.rejected', '已驳回')
    };
    return statusMap[status] || status;
  };

  // 生成年度选项
  const yearOptions = [
    { value: '', label: t('common.all', '全部') },
    ...Array.from({ length: 5 }, (_, i) => {
      const year = new Date().getFullYear() - i;
      return { value: year.toString(), label: year.toString() };
    })
  ];

  // 季度选项
  const quarterOptions = [
    { value: '', label: t('common.all', '全部') },
    { value: '1', label: t('performance.quarter1', '第一季度') },
    { value: '2', label: t('performance.quarter2', '第二季度') },
    { value: '3', label: t('performance.quarter3', '第三季度') },
    { value: '4', label: t('performance.quarter4', '第四季度') }
  ];

  // 状态选项
  const statusOptions = [
    { value: '', label: t('common.all', '全部') },
    { value: 'submitted', label: t('performance.status.submitted', '已提交') },
    { value: 'needSupplement', label: t('performance.status.needSupplement', '需补充') },
    { value: 'approved', label: t('performance.status.approved', '已批准') }
  ];

  return (
    <div className="performance-list-content">
      <div className="page-header">
        <div className="page-title-wrapper">
          <SearchIcon className="page-title-icon" />
          <h1>{t('performance.query', '成果查询')}</h1>
        </div>
      </div>

      {/* 搜索筛选 */}
      <Card>
        <CardHeader>
          <SearchIcon className="section-icon" />
          <h2>{t('common.search', '搜索')}</h2>
        </CardHeader>
        <CardBody>
          <div className="search-filters">
          <div className="form-group">
            <label>{t('performance.year', '年度')}</label>
            <Select
              value={searchFilters.year}
              onChange={(e) => handleFilterChange('year', e.target.value)}
              options={yearOptions}
            />
          </div>
          <div className="form-group">
            <label>{t('performance.quarter', '季度')}</label>
            <Select
              value={searchFilters.quarter}
              onChange={(e) => handleFilterChange('quarter', e.target.value)}
              options={quarterOptions}
            />
          </div>
          <div className="form-group">
            <label>{t('performance.documentStatus', '文档状态')}</label>
            <Select
              value={searchFilters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              options={statusOptions}
            />
          </div>
        </div>
        </CardBody>
      </Card>

      {/* 成果列表 */}
      <Card>
        <div className="results-info">
          <p>{t('performance.resultsCount', '共{{count}}条记录', { count: filteredPerformances.length })}</p>
        </div>

        {loading ? (
          <div className="loading">
            <p>{t('common.loading', '加载中...')}</p>
          </div>
        ) : filteredPerformances.length === 0 ? (
          <div className="no-data">
            <p>{t('common.noData', '暂无数据')}</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>{t('performance.documentType', '文档类型')}</TableHeader>
                  <TableHeader>{t('performance.fileName', '文件名')}</TableHeader>
                  <TableHeader>{t('performance.documentStatus', '文档状态')}</TableHeader>
                  <TableHeader>{t('performance.documentConfirm', '文档确认')}</TableHeader>
                  <TableHeader>{t('common.actions', '操作')}</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredPerformances.map((perf) => (
                  <TableRow key={perf.id}>
                    <TableCell>
                      {perf.year}{t('common.year', '年')} {perf.quarter ? `Q${perf.quarter}` : t('performance.annual', '年度')}
                    </TableCell>
                    <TableCell>{perf.fileName}</TableCell>
                    <TableCell>
                      <span className={getStatusBadgeClass(perf.status)}>
                        {getStatusLabel(perf.status)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {perf.status === 'approved' && (perf.fileId || perf.fileUrl) ? (
                        <Button
                          onClick={() => {
                            if (perf.fileId) {
                              handleDownload(perf.fileId, perf.fileName);
                            } else if (perf.fileUrl) {
                              handleDownloadByUrl(perf.fileUrl, perf.fileName);
                            }
                          }}
                          variant="secondary"
                          size="small"
                        >
                          <DownloadIcon className="w-4 h-4" style={{ marginRight: '0.25rem' }} />
                          {t('performance.download', '下载')}
                        </Button>
                      ) : perf.attachments && perf.attachments.length > 0 ? (
                        <div className="attachment-buttons">
                          {perf.attachments.map((attachment, idx) => (
                            <Button
                              key={idx}
                              onClick={() => {
                                if (attachment.file_id) {
                                  handleDownload(attachment.file_id, attachment.original_name || attachment.name);
                                } else if (attachment.file_url) {
                                  handleDownloadByUrl(attachment.file_url, attachment.original_name || attachment.name);
                                }
                              }}
                              variant="secondary"
                              size="small"
                              style={{ marginRight: '0.5rem', marginBottom: '0.25rem' }}
                            >
                              <DownloadIcon className="w-4 h-4" style={{ marginRight: '0.25rem' }} />
                              {attachment.original_name || attachment.name || t('performance.download', '下载')}
                            </Button>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="action-buttons">
                        {/* Allow edit for draft and revision_requested status */}
                        {(perf.status === 'draft' || perf.status === 'revision_requested') && (
                          <>
                            <Button
                              onClick={() => handleEdit(perf.id)}
                              variant="text"
                              size="small"
                              title={t('performance.modify', '修改')}
                            >
                              <EditIcon className="w-4 h-4" />
                            </Button>
                            {/* Only allow delete for draft status */}
                            {perf.status === 'draft' && (
                              <Button
                                onClick={() => handleDelete(perf.id)}
                                variant="text"
                                size="small"
                                title={t('performance.delete', '删除')}
                              >
                                <TrashIcon className="w-4 h-4" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
