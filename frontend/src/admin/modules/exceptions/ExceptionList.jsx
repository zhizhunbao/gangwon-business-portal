/**
 * Exception List Component - Admin Portal
 * 应用异常列表
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Badge, Pagination, Select, Input } from '@shared/components';
import { apiClient } from '@shared/services';
import './ExceptionList.css';

export default function ExceptionList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [exceptions, setExceptions] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Filters
  const [sourceFilter, setSourceFilter] = useState('all'); // all, backend, frontend
  const [exceptionTypeFilter, setExceptionTypeFilter] = useState('');
  const [resolvedFilter, setResolvedFilter] = useState('all'); // all, true, false
  const [traceIdFilter, setTraceIdFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadExceptions = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        page_size: pageSize,
        source: sourceFilter !== 'all' ? sourceFilter : undefined,
        exception_type: exceptionTypeFilter || undefined,
        resolved: resolvedFilter !== 'all' ? resolvedFilter : undefined,
        trace_id: traceIdFilter || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      };
      
      const response = await apiClient.get('/api/v1/exceptions', { params });
      if (response.items) {
        setExceptions(response.items);
        setTotalCount(response.total || 0);
        setTotalPages(response.total_pages || 0);
      }
    } catch (error) {
      console.error('Failed to load exceptions:', error);
      const errorMessage = error.response?.data?.detail || error.message || t('admin.exceptions.loadFailed', '加载异常失败');
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, sourceFilter, exceptionTypeFilter, resolvedFilter, traceIdFilter, startDate, endDate, t]);

  useEffect(() => {
    loadExceptions();
  }, [loadExceptions]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSourceFilter('all');
    setExceptionTypeFilter('');
    setResolvedFilter('all');
    setTraceIdFilter('');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  const handleResolve = async (exceptionId) => {
    if (!confirm(t('admin.exceptions.confirmResolve', '确定要标记为已解决吗？'))) {
      return;
    }

    try {
      await apiClient.post(`/api/v1/exceptions/${exceptionId}/resolve`, {
        resolution_notes: '',
      });
      loadExceptions();
    } catch (error) {
      console.error('Failed to resolve exception:', error);
      alert(t('admin.exceptions.resolveFailed', '标记失败'));
    }
  };

  const columns = [
    {
      key: 'created_at',
      label: t('admin.exceptions.createdAt', '时间'),
      render: (exc) => new Date(exc.created_at).toLocaleString(),
    },
    {
      key: 'source',
      label: t('admin.exceptions.source', '来源'),
      render: (exc) => (
        <Badge variant={exc.source === 'backend' ? 'primary' : 'success'}>
          {exc.source === 'backend' ? t('admin.exceptions.backend', '后端') : t('admin.exceptions.frontend', '前端')}
        </Badge>
      ),
    },
    {
      key: 'exception_type',
      label: t('admin.exceptions.type', '异常类型'),
      render: (exc) => (
        <Badge variant="danger">
          {exc.exception_type}
        </Badge>
      ),
    },
    {
      key: 'exception_message',
      label: t('admin.exceptions.message', '异常消息'),
      render: (exc) => (
        <div className="exception-message" title={exc.exception_message}>
          {exc.exception_message.length > 100 ? `${exc.exception_message.substring(0, 100)}...` : exc.exception_message}
        </div>
      ),
    },
    {
      key: 'resolved',
      label: t('admin.exceptions.status', '状态'),
      render: (exc) => (
        <Badge variant={exc.resolved === 'true' ? 'success' : 'warning'}>
          {exc.resolved === 'true' ? t('admin.exceptions.resolved', '已解决') : t('admin.exceptions.unresolved', '未解决')}
        </Badge>
      ),
    },
    {
      key: 'trace_id',
      label: t('admin.exceptions.traceId', '追踪ID'),
      render: (exc) => (
        <code className="trace-id" title={exc.trace_id}>
          {exc.trace_id ? exc.trace_id.substring(0, 8) + '...' : '-'}
        </code>
      ),
    },
    {
      key: 'user_email',
      label: t('admin.exceptions.user', '用户'),
      render: (exc) => exc.user_email || '-',
    },
    {
      key: 'actions',
      label: t('admin.exceptions.actions', '操作'),
      render: (exc) => (
        <div className="exception-actions">
          <Button
            size="small"
            variant="outline"
            onClick={() => navigate(`/admin/exceptions/${exc.id}`)}
          >
            {t('admin.exceptions.view', '查看')}
          </Button>
          {exc.resolved !== 'true' && (
            <Button
              size="small"
              variant="primary"
              onClick={() => handleResolve(exc.id)}
            >
              {t('admin.exceptions.resolve', '标记已解决')}
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="exception-list">
      <div className="exception-list__header">
        <h1>{t('admin.exceptions.title', '应用异常')}</h1>
        <div className="exception-list__actions">
          <Button variant="outline" onClick={handleResetFilters}>
            {t('admin.exceptions.resetFilters', '重置筛选')}
          </Button>
          <Button onClick={loadExceptions}>
            {t('admin.exceptions.refresh', '刷新')}
          </Button>
        </div>
      </div>

      <div className="exception-list__filters">
        <div className="filter-group">
          <label>{t('admin.exceptions.source', '来源')}</label>
          <Select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
          >
            <option value="all">{t('admin.exceptions.all', '全部')}</option>
            <option value="backend">{t('admin.exceptions.backend', '后端')}</option>
            <option value="frontend">{t('admin.exceptions.frontend', '前端')}</option>
          </Select>
        </div>

        <div className="filter-group">
          <label>{t('admin.exceptions.type', '异常类型')}</label>
          <Input
            type="text"
            value={exceptionTypeFilter}
            onChange={(e) => setExceptionTypeFilter(e.target.value)}
            placeholder={t('admin.exceptions.typePlaceholder', '输入异常类型')}
          />
        </div>

        <div className="filter-group">
          <label>{t('admin.exceptions.status', '状态')}</label>
          <Select
            value={resolvedFilter}
            onChange={(e) => setResolvedFilter(e.target.value)}
          >
            <option value="all">{t('admin.exceptions.all', '全部')}</option>
            <option value="true">{t('admin.exceptions.resolved', '已解决')}</option>
            <option value="false">{t('admin.exceptions.unresolved', '未解决')}</option>
          </Select>
        </div>

        <div className="filter-group">
          <label>{t('admin.exceptions.traceId', '追踪ID')}</label>
          <Input
            type="text"
            value={traceIdFilter}
            onChange={(e) => setTraceIdFilter(e.target.value)}
            placeholder={t('admin.exceptions.traceIdPlaceholder', '输入追踪ID')}
          />
        </div>

        <div className="filter-group">
          <label>{t('admin.exceptions.startDate', '开始日期')}</label>
          <Input
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label>{t('admin.exceptions.endDate', '结束日期')}</label>
          <Input
            type="datetime-local"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      <div className="exception-list__table">
        <Table
          columns={columns}
          data={exceptions}
          loading={loading}
          emptyMessage={t('admin.exceptions.noExceptions', '暂无异常')}
        />
      </div>

      {totalPages > 0 && (
        <div className="exception-list__pagination">
          <Pagination
            current={currentPage}
            total={totalCount}
            pageSize={pageSize}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        </div>
      )}
    </div>
  );
}

