/**
 * Member List Component - Admin Portal
 * 企业会员列表
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Badge, Pagination, SearchInput, Alert } from '@shared/components';
import { adminService } from '@shared/services';
import { formatDate, formatBusinessLicense } from '@shared/utils';

export default function MemberList() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const currentLanguage = i18n.language === 'zh' ? 'zh' : 'ko';
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [allMembers, setAllMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [message, setMessage] = useState(null);
  const [messageVariant, setMessageVariant] = useState('success');

  // 使用 useCallback 包装 setFilteredMembers 避免无限循环
  const handleFilterChange = useCallback((filtered) => {
    setFilteredMembers(filtered);
    setCurrentPage(1);
  }, []);

  // 一次性加载所有会员数据
  const loadAllMembers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: 1,
        pageSize: 1000,
        approvalStatus: statusFilter !== 'all' ? statusFilter : undefined
      };
      const response = await adminService.listMembers(params);
      
      if (response && response.items && Array.isArray(response.items)) {
        setAllMembers(response.items);
        setFilteredMembers(response.items);
      } else {
        setAllMembers([]);
        setFilteredMembers([]);
      }
    } catch (error) {
      console.error('Failed to load members:', error);
      setAllMembers([]);
      setFilteredMembers([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadAllMembers();
  }, [loadAllMembers]);

  // 分页后的数据
  const members = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredMembers.slice(start, end);
  }, [filteredMembers, currentPage, pageSize]);

  // 更新总数
  useEffect(() => {
    setTotalCount(filteredMembers.length);
  }, [filteredMembers]);

  const handleExport = useCallback(async (format = 'excel') => {
    setLoading(true);
    try {
      const params = {
        format,
        approvalStatus: statusFilter !== 'all' ? statusFilter : undefined,
        language: i18n.language === 'zh' ? 'zh' : 'ko'
      };
      await adminService.exportMembers(params);
      setMessageVariant('success');
      setMessage(t('admin.members.exportSuccess', '导出成功'));
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessageVariant('error');
      setMessage(t('admin.members.exportFailed', '导出失败'));
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, i18n.language, t]);

  const handleApprove = useCallback(async (memberId) => {
    await adminService.approveMember(memberId);
    setMessageVariant('success');
    setMessage(t('admin.members.approveSuccess', '批准成功'));
    setTimeout(() => setMessage(null), 3000);
    loadAllMembers();
  }, [loadAllMembers, t]);

  const handleReject = useCallback(async (memberId) => {
    const reason = prompt(t('admin.members.rejectReason', '请输入拒绝原因（可选）') || '请输入拒绝原因（可选）');
    if (reason === null) return; // 用户点击了取消
    await adminService.rejectMember(memberId, reason || null);
    setMessageVariant('success');
    setMessage(t('admin.members.rejectSuccess', '拒绝成功'));
    setTimeout(() => setMessage(null), 3000);
    loadAllMembers();
  }, [loadAllMembers, t]);

  const handleResetToPending = useCallback(async (memberId) => {
    await adminService.resetMemberToPending(memberId);
    setMessageVariant('success');
    setMessage(t('admin.members.resetSuccess', '已重置为待审核'));
    setTimeout(() => setMessage(null), 3000);
    loadAllMembers();
  }, [loadAllMembers, t]);

  const handleViewDetail = useCallback((memberId) => {
    navigate(`/admin/members/${memberId}`);
  }, [navigate]);



  // 定义搜索列 - 简化版本用于搜索
  const searchColumns = useMemo(() => [
    {
      key: 'companyName',
      label: t('admin.members.table.companyName'),
      render: (value) => value || ''
    },
    {
      key: 'representative',
      label: t('admin.members.table.representative'),
      render: (value) => value || ''
    },
    {
      key: 'businessNumber',
      label: t('admin.members.table.businessNumber'),
      render: (value) => value ? formatBusinessLicense(value) : ''
    },
    {
      key: 'address',
      label: t('admin.members.table.address'),
      render: (value) => value || ''
    },
    {
      key: 'industry',
      label: t('admin.members.table.industry'),
      render: (value) => value || ''
    },
    {
      key: 'email',
      label: t('admin.members.table.email', '邮箱'),
      render: (value) => value || ''
    },
    {
      key: 'approvalStatus',
      label: t('admin.members.table.status'),
      render: (value) => t(`admin.members.status.${value}`, value)
    }
  ], [t]);

  // 使用 useMemo 缓存表格 columns 配置，避免每次渲染都重新创建
  const tableColumns = useMemo(() => {
    return [
      {
        key: 'companyName',
        label: t('admin.members.table.companyName'),
        sortable: true,
        width: '200px',
        align: 'left',
        cellClassName: 'text-left'
      },
      {
        key: 'representative',
        label: t('admin.members.table.representative'),
        sortable: true,
        width: '120px'
      },
      {
        key: 'businessNumber',
        label: t('admin.members.table.businessNumber'),
        sortable: true,
        width: '150px',
        render: (value) => value ? formatBusinessLicense(value) : '-'
      },
      {
        key: 'address',
        label: t('admin.members.table.address'),
        wrap: true,
        width: '250px',
        render: (value) => (
          <div className="max-w-xs truncate" title={value || ''}>
            {value || '-'}
          </div>
        )
      },
      {
        key: 'industry',
        label: t('admin.members.table.industry'),
        width: '120px'
      },
      {
        key: 'created_at_display',
        label: t('admin.members.table.createdAt'),
        sortable: true,
        width: '160px',
        render: (value, row) => value || formatDate(row.createdAt, 'yyyy-MM-dd HH:mm', currentLanguage)
      },
      {
        key: 'approvalStatus',
        label: t('admin.members.table.status'),
        width: '100px',
        render: (value) => (
          <Badge 
            variant={value === 'approved' ? 'success' : value === 'pending' ? 'warning' : 'danger'}
          >
            {t(`admin.members.status.${value}`)}
          </Badge>
        )
      },
      {
        key: 'actions',
        label: '',
        width: '120px',
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
            {row.approvalStatus === 'pending' && (
              <>
                <span className="text-gray-300">|</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleApprove(row.id);
                  }}
                  className="text-green-600 hover:text-green-900 font-medium text-sm"
                >
                  {t('admin.members.approve')}
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReject(row.id);
                  }}
                  className="text-red-600 hover:text-red-900 font-medium text-sm"
                >
                  {t('admin.members.reject', '拒绝')}
                </button>
              </>
            )}
            {(row.approvalStatus === 'approved' || row.approvalStatus === 'rejected') && (
              <>
                <span className="text-gray-300">|</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleResetToPending(row.id);
                  }}
                  className="text-orange-600 hover:text-orange-900 font-medium text-sm"
                >
                  {t('admin.members.resetPending', '취소')}
                </button>
              </>
            )}
          </div>
        )
      }
    ];
  }, [t, handleViewDetail, handleApprove, handleReject, handleResetToPending]);

  return (
    <div className="w-full">
      {message && (
        <Alert variant={messageVariant} className="mb-4" onClose={() => setMessage(null)}>
          {message}
        </Alert>
      )}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">{t('admin.members.title')}</h1>
        
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <SearchInput
            data={allMembers}
            columns={searchColumns}
            onFilter={handleFilterChange}
            placeholder={t('admin.members.search.placeholder', '搜索所有列：企业名称、代表、营业执照号、地址、行业、邮箱、状态等')}
            className="flex-1 min-w-[200px] max-w-md"
          />
          <div className="flex items-center space-x-2 md:ml-4 w-full md:w-auto">
            <Button 
              onClick={() => handleExport('excel')} 
              variant="outline"
              disabled={loading}
            >
              {t('admin.members.exportExcel', '导出 Excel')}
            </Button>
            <Button 
              onClick={() => handleExport('csv')} 
              variant="outline"
              disabled={loading}
            >
              {t('admin.members.exportCsv', '导出 CSV')}
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        {(() => {
          if (loading) {
            return <div className="p-12 text-center text-gray-500">{t('common.loading')}</div>;
          }
          if (members.length === 0) {
            return (
              <div className="p-12 text-center text-gray-500">
                <p className="text-lg mb-2">{t('admin.members.noMembers', '暂无会员数据')}</p>
                <p className="text-sm text-gray-400">
                  {totalCount === 0 
                    ? t('admin.members.noMembersHint', '请尝试刷新页面')
                    : t('admin.members.noMatchingMembers', '当前筛选条件下没有匹配的会员')}
                </p>
              </div>
            );
          }
          return (
            <>
              <div className="overflow-x-auto -mx-4 px-4">
                <Table 
                  columns={tableColumns} 
                  data={members}
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
    </div>
  );
}

