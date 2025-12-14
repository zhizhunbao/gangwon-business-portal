/**
 * Performance List Content - Member Portal
 * 成果查询页面内容组件
 */

import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card, { CardHeader, CardBody } from '@shared/components/Card';
import Button from '@shared/components/Button';
import Select from '@shared/components/Select';
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@shared/components/Table';
import { performanceService, uploadService, loggerService, exceptionService } from '@shared/services';
import { DownloadIcon, EditIcon, TrashIcon, SearchIcon } from '@shared/components/Icons';

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
  }, [i18n.language]);

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
        pageSize: 100
      });
      
      if (response.records) {
        const formatted = response.records.map(r => {
          let attachments = [];
          if (r.data_json) {
            try {
              const dataJson = typeof r.data_json === 'string' ? JSON.parse(r.data_json) : r.data_json;
              
              if (dataJson.attachments && Array.isArray(dataJson.attachments)) {
                attachments = dataJson.attachments;
              } else if (dataJson.intellectualProperty && Array.isArray(dataJson.intellectualProperty)) {
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
              loggerService.warn('Failed to parse data_json for attachments', {
                module: 'PerformanceListContent',
                function: 'loadPerformances',
                record_id: r.id,
                error_message: e.message
              });
            }
          }
          
          const firstAttachment = attachments.length > 0 ? attachments[0] : null;
          
          return {
            id: r.id,
            year: r.year,
            quarter: r.quarter,
            type: r.quarter ? 'quarterly' : 'annual',
            status: r.status,
            submittedDate: r.submittedAt ? new Date(r.submittedAt).toISOString().split('T')[0] : null,
            approvedDate: null,
            documentType: r.type || '成果报告',
            fileName: firstAttachment?.original_name || firstAttachment?.name || `成果报告_${r.year}_${r.quarter || '年度'}.pdf`,
            fileId: firstAttachment?.file_id || null,
            fileUrl: firstAttachment?.file_url || null,
            isOwnUpload: true,
            attachments: attachments
          };
        });
        setPerformances(formatted);
      }
    } catch (error) {
      loggerService.error('Failed to load performances', {
        module: 'PerformanceListContent',
        function: 'loadPerformances',
        error_message: error.message,
        error_code: error.code
      });
      exceptionService.recordException(error, {
        request_path: window.location.pathname,
        error_code: error.code || 'LOAD_PERFORMANCES_FAILED'
      });
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
      loggerService.error('Failed to delete performance record', {
        module: 'PerformanceListContent',
        function: 'handleDelete',
        record_id: id,
        error_message: error.message,
        error_code: error.code
      });
      exceptionService.recordException(error, {
        request_path: window.location.pathname,
        error_code: error.code || 'DELETE_PERFORMANCE_FAILED',
        context_data: { record_id: id }
      });
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
      await uploadService.downloadFile(fileId, fileName);
    } catch (error) {
      loggerService.error('Failed to download file', {
        module: 'PerformanceListContent',
        function: 'handleDownload',
        file_id: fileId,
        error_message: error.message,
        error_code: error.code
      });
      exceptionService.recordException(error, {
        request_path: window.location.pathname,
        error_code: error.code || 'DOWNLOAD_FILE_FAILED',
        context_data: { file_id: fileId }
      });
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
      await uploadService.downloadFileByUrl(fileUrl, fileName);
    } catch (error) {
      loggerService.error('Failed to download file by URL', {
        module: 'PerformanceListContent',
        function: 'handleDownloadByUrl',
        file_url: fileUrl,
        error_message: error.message,
        error_code: error.code
      });
      exceptionService.recordException(error, {
        request_path: window.location.pathname,
        error_code: error.code || 'DOWNLOAD_FILE_BY_URL_FAILED',
        context_data: { file_url: fileUrl }
      });
      const errorMessage = error.response?.data?.detail || error.message || t('message.downloadFailed', '下载失败');
      alert(errorMessage);
    }
  };

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      draft: 'bg-gray-50 text-gray-700 border-gray-200',
      submitted: 'bg-blue-50 text-blue-700 border-blue-200',
      revision_requested: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      needSupplement: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      approved: 'bg-green-50 text-green-700 border-green-200',
      rejected: 'bg-red-50 text-red-700 border-red-200'
    };
    return statusMap[status] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const getStatusLabel = (status) => {
    const statusMap = {
      draft: t('performance.status.draft', '草稿'),
      submitted: t('performance.status.submitted', '已提交'),
      revision_requested: t('performance.status.revisionRequested', '需修改'),
      needSupplement: t('performance.status.needSupplement', '需补充'),
      approved: t('performance.status.approved', '已批准'),
      rejected: t('performance.status.rejected', '已驳回')
    };
    return statusMap[status] || status;
  };

  const yearOptions = [
    { value: '', label: t('common.all', '全部') },
    ...Array.from({ length: 5 }, (_, i) => {
      const year = new Date().getFullYear() - i;
      return { value: year.toString(), label: year.toString() };
    })
  ];

  const quarterOptions = [
    { value: '', label: t('common.all', '全部') },
    { value: '1', label: t('performance.quarter1', '第一季度') },
    { value: '2', label: t('performance.quarter2', '第二季度') },
    { value: '3', label: t('performance.quarter3', '第三季度') },
    { value: '4', label: t('performance.quarter4', '第四季度') }
  ];

  const statusOptions = [
    { value: '', label: t('common.all', '全部') },
    { value: 'submitted', label: t('performance.status.submitted', '已提交') },
    { value: 'needSupplement', label: t('performance.status.needSupplement', '需补充') },
    { value: 'approved', label: t('performance.status.approved', '已批准') }
  ];

  return (
    <div className="performance-list-content w-full max-w-full p-6 pb-8 sm:p-8 sm:pb-10 lg:p-10 lg:pb-12 xl:p-12 xl:pb-14">
      <div className="mb-6 sm:mb-8 lg:mb-10 flex justify-between items-center gap-4 sm:gap-5 lg:gap-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <SearchIcon className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-blue-600" />
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 m-0 tracking-tight">
            {t('performance.query', '成果查询')}
          </h1>
        </div>
      </div>

      {/* 搜索筛选 */}
      <Card className="mb-6 sm:mb-8 shadow-sm hover:shadow-md transition-all duration-200">
        <CardHeader className="flex items-center gap-3 sm:gap-4 p-6 pb-4 sm:p-8 sm:pb-5 lg:p-10 lg:pb-6">
          <SearchIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0" />
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 m-0">
            {t('common.search', '搜索')}
          </h2>
        </CardHeader>
        <CardBody className="p-6 sm:p-8 lg:p-10 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
            <div className="flex flex-col [&_.form-group]:mb-0">
              <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2 sm:mb-3">
                {t('performance.year', '年度')}
              </label>
              <Select
                value={searchFilters.year}
                onChange={(e) => handleFilterChange('year', e.target.value)}
                options={yearOptions}
              />
            </div>
            <div className="flex flex-col [&_.form-group]:mb-0">
              <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2 sm:mb-3">
                {t('performance.quarter', '季度')}
              </label>
              <Select
                value={searchFilters.quarter}
                onChange={(e) => handleFilterChange('quarter', e.target.value)}
                options={quarterOptions}
              />
            </div>
            <div className="flex flex-col [&_.form-group]:mb-0">
              <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2 sm:mb-3">
                {t('performance.documentStatus', '文档状态')}
              </label>
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
      <Card className="mb-6 sm:mb-8 shadow-sm hover:shadow-md transition-all duration-200">
        <div className="mb-6 sm:mb-8 lg:mb-10 pb-0 px-6 pt-6 sm:px-8 sm:pt-8 lg:px-10 lg:pt-10">
          <p className="text-sm sm:text-base text-gray-600 font-medium m-0">
            {t('performance.resultsCount', '共{{count}}条记录', { count: filteredPerformances.length })}
          </p>
        </div>

        {loading ? (
          <div className="text-center py-16 sm:py-20 lg:py-24 px-6 sm:px-8 lg:px-10">
            <p className="text-base sm:text-lg text-gray-500 m-0">{t('common.loading', '加载中...')}</p>
          </div>
        ) : filteredPerformances.length === 0 ? (
          <div className="text-center py-16 sm:py-20 lg:py-24 px-6 sm:px-8 lg:px-10">
            <p className="text-base sm:text-lg text-gray-500 m-0">{t('common.noData', '暂无数据')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto mb-6 sm:mb-8 lg:mb-10 px-6 pb-6 sm:px-8 sm:pb-8 lg:px-10 lg:pb-10">
            <Table className="min-w-full">
              <TableHead className="bg-gray-50">
                <TableRow>
                  <TableHeader className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-b-2 border-gray-200">
                    {t('performance.documentType', '文档类型')}
                  </TableHeader>
                  <TableHeader className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-b-2 border-gray-200">
                    {t('performance.fileName', '文件名')}
                  </TableHeader>
                  <TableHeader className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-b-2 border-gray-200">
                    {t('performance.documentStatus', '文档状态')}
                  </TableHeader>
                  <TableHeader className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-b-2 border-gray-200">
                    {t('performance.documentConfirm', '文档确认')}
                  </TableHeader>
                  <TableHeader className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-b-2 border-gray-200">
                    {t('common.actions', '操作')}
                  </TableHeader>
                </TableRow>
              </TableHead>
              <TableBody className="bg-white divide-y divide-gray-200">
                {filteredPerformances.map((perf) => (
                  <TableRow key={perf.id} className="hover:bg-gray-50 transition-colors duration-150">
                    <TableCell className="px-4 sm:px-6 py-4 sm:py-5 text-sm sm:text-base text-gray-900">
                      {perf.year}{t('common.year', '年')} {perf.quarter ? `Q${perf.quarter}` : t('performance.annual', '年度')}
                    </TableCell>
                    <TableCell className="px-4 sm:px-6 py-4 sm:py-5 text-sm sm:text-base text-gray-900">
                      {perf.fileName}
                    </TableCell>
                    <TableCell className="px-4 sm:px-6 py-4 sm:py-5 text-sm sm:text-base text-gray-900">
                      <span className={`inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-md border ${getStatusBadgeClass(perf.status)}`}>
                        {getStatusLabel(perf.status)}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 sm:px-6 py-4 sm:py-5 text-sm sm:text-base text-gray-900">
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
                          <DownloadIcon className="w-4 h-4 mr-1" />
                          {t('performance.download', '下载')}
                        </Button>
                      ) : perf.attachments && perf.attachments.length > 0 ? (
                        <div className="flex flex-wrap gap-2 items-center">
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
                              className="mr-2 mb-1"
                            >
                              <DownloadIcon className="w-4 h-4 mr-1" />
                              {attachment.original_name || attachment.name || t('performance.download', '下载')}
                            </Button>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm sm:text-base">-</span>
                      )}
                    </TableCell>
                    <TableCell className="px-4 sm:px-6 py-4 sm:py-5 text-sm sm:text-base text-gray-900">
                      <div className="flex gap-2 sm:gap-3 items-center justify-start">
                        {(perf.status === 'draft' || perf.status === 'revision_requested') && (
                          <>
                            <Button
                              onClick={() => handleEdit(perf.id)}
                              variant="text"
                              size="small"
                              title={t('performance.modify', '修改')}
                              className="hover:scale-105 transition-transform"
                            >
                              <EditIcon className="w-4 h-4" />
                            </Button>
                            {perf.status === 'draft' && (
                              <Button
                                onClick={() => handleDelete(perf.id)}
                                variant="text"
                                size="small"
                                title={t('performance.delete', '删除')}
                                className="hover:scale-105 transition-transform"
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
