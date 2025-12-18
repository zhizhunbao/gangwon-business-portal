/**
 * Member List Component - Admin Portal
 * 企业会员列表
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Badge, Pagination, SearchInput } from '@shared/components';
import { adminService } from '@shared/services';
import { formatDate, formatBusinessLicense } from '@shared/utils/format';

export default function MemberList() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const currentLanguage = i18n.language === 'zh' ? 'zh' : 'ko';
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [allMembers, setAllMembers] = useState([]); // 存储所有数据
  const [totalCount, setTotalCount] = useState(0);

  // 一次性加载所有会员数据
  const loadAllMembers = useCallback(async () => {
    setLoading(true);
    const params = {
      page: 1,
      pageSize: 10000, // 加载所有数据
      approvalStatus: statusFilter !== 'all' ? statusFilter : undefined
    };
    const response = await adminService.listMembers(params);
    
    if (response) {
      if (response.members && Array.isArray(response.members)) {
        setAllMembers(response.members);
      } else {
        setAllMembers([]);
      }
    } else {
      setAllMembers([]);
    }
    setLoading(false);
  }, [statusFilter, t]);

  useEffect(() => {
    loadAllMembers();
  }, [loadAllMembers]);

  // 前端模糊搜索和过滤 - 匹配所有列
  const filteredMembers = useMemo(() => {
    return allMembers.filter(member => {
      // 搜索关键词过滤
      if (searchTerm) {
        const keyword = searchTerm.toLowerCase();
        const searchKeywordNormalized = searchTerm.replace(/-/g, '').toLowerCase();
        
        // 将所有字段值转换为可搜索的字符串
        const searchableText = [
          // 企业基本信息
          member.companyName || '',
          member.representative || '',
          (member.businessNumber || '').replace(/-/g, ''),
          member.address || '',
          member.industry || '',
          member.email || '',
          // 状态（搜索原始值和翻译值）
          member.approvalStatus || '',
          member.approvalStatus ? t(`admin.members.status.${member.approvalStatus}`) : '',
          // 创建时间
          member.createdAt ? formatDate(member.createdAt, 'yyyy-MM-dd', currentLanguage) : '',
          // ID（用于精确搜索）
          member.id || '',
        ].join(' ').toLowerCase();
        
        // 同时检查原始关键词和去除连字符后的关键词
        if (!searchableText.includes(keyword) && 
            !searchableText.includes(searchKeywordNormalized)) {
          return false;
        }
      }
      return true;
    });
  }, [allMembers, searchTerm, t, currentLanguage]);

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
    const params = {
      format,
      approvalStatus: statusFilter !== 'all' ? statusFilter : undefined,
      language: i18n.language === 'zh' ? 'zh' : 'ko'
    };
    await adminService.exportMembers(params);
    setLoading(false);
  }, [statusFilter, i18n.language, t]);

  const handleApprove = useCallback(async (memberId) => {
    await adminService.approveMember(memberId);
    loadAllMembers();
  }, [loadAllMembers, t]);

  const handleViewDetail = useCallback((memberId) => {
    navigate(`/admin/members/${memberId}`);
  }, [navigate]);



  // 使用 useMemo 缓存 columns 配置，避免每次渲染都重新创建
  const columns = useMemo(() => {
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
        key: 'createdAt',
        label: t('admin.members.table.createdAt'),
        sortable: true,
        width: '140px',
        render: (value) => formatDate(value, 'yyyy-MM-dd', currentLanguage)
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
              </>
            )}
          </div>
        )
      }
    ];
  }, [t, handleViewDetail, handleApprove]);

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">{t('admin.members.title')}</h1>
        
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex-1 min-w-[200px] max-w-md">
            <SearchInput
              value={searchTerm}
              onChange={(value) => {
                setSearchTerm(value);
                setCurrentPage(1);
              }}
              placeholder={t('admin.members.search.placeholder', '搜索所有列：企业名称、代表、营业执照号、地址、行业、邮箱、状态等')}
            />
          </div>
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
                  columns={columns} 
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

