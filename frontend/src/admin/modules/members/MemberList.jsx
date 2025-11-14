/**
 * Member List Component - Admin Portal
 * 企业会员列表
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, Table, Button, Input, Select, Badge, Pagination } from '@shared/components';
import { apiService } from '@shared/services';
import { API_PREFIX } from '@shared/utils/constants';
import './MemberList.css';

export default function MemberList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchField, setSearchField] = useState('companyName');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [members, setMembers] = useState([]);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    loadMembers();
  }, [currentPage, pageSize, statusFilter, searchTerm, searchField]);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        page_size: pageSize,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: searchTerm || undefined,
        search_field: searchField
      };
      const response = await apiService.get(`${API_PREFIX}/admin/members`, params);
      if (response.members) {
        setMembers(response.members);
        setTotalCount(response.pagination?.total || 0);
      }
    } catch (error) {
      console.error('Failed to load members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    loadMembers();
  };

  const handleExport = () => {
    // TODO: 实现 Excel 导出
    console.log('Exporting members...');
  };

  const handleApprove = async (memberId) => {
    try {
      await apiService.patch(`${API_PREFIX}/admin/members/${memberId}/status`, {
        approvalStatus: 'approved'
      });
      loadMembers();
    } catch (error) {
      console.error('Failed to approve member:', error);
      alert(t('admin.members.approveFailed'));
    }
  };

  const handleViewDetail = (memberId) => {
    navigate(`/admin/members/${memberId}`);
  };

  const handleViewPerformance = (memberId) => {
    navigate(`/admin/performance?memberId=${memberId}`);
  };

  const columns = [
    {
      key: 'companyName',
      label: t('admin.members.table.companyName'),
      sortable: true
    },
    {
      key: 'representative',
      label: t('admin.members.table.representative'),
      sortable: true
    },
    {
      key: 'businessNumber',
      label: t('admin.members.table.businessNumber'),
      sortable: true
    },
    {
      key: 'address',
      label: t('admin.members.table.address')
    },
    {
      key: 'industry',
      label: t('admin.members.table.industry')
    },
    {
      key: 'approvalStatus',
      label: t('admin.members.table.status'),
      render: (value) => (
        <Badge 
          variant={value === 'approved' ? 'success' : value === 'pending' ? 'warning' : 'danger'}
        >
          {t(`members.status.${value}`)}
        </Badge>
      )
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
            </>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="admin-member-list">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">{t('admin.members.title')}</h1>
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder={t('admin.members.search.placeholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
          </div>
          <Button onClick={handleExport} className="ml-4">
            {t('admin.members.export')}
          </Button>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        {loading ? (
          <div className="p-12 text-center text-gray-500">{t('common.loading')}</div>
        ) : (
          <>
            <Table 
              columns={columns} 
              data={members}
              selectable={true}
              selectedRows={[]}
              onSelectRow={() => {}}
              onSelectAll={() => {}}
              onRowClick={(row) => handleViewDetail(row.id)}
            />
            {totalCount > 0 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="flex items-center text-sm text-gray-700">
                  <span>
                    {t('common.showing')} {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalCount)} {t('common.of')} {totalCount}
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
        )}
      </div>
    </div>
  );
}

