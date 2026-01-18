/**
 * Project List Component - Admin Portal
 * 项目管理列表
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, Table, Button, Badge, Pagination, SearchInput, Alert } from '@shared/components';
import { apiService, adminService } from '@shared/services';
import { API_PREFIX } from '@shared/utils/constants';
import { formatBusinessLicense } from '@shared/utils';

export default function ProjectList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [allProjects, setAllProjects] = useState([]); // 存储所有数据
  const [filteredProjects, setFilteredProjects] = useState([]); // 过滤后的数据
  const [message, setMessage] = useState(null);
  const [messageVariant, setMessageVariant] = useState('success');

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  // 使用 useCallback 包装 setFilteredProjects 避免无限循环
  const handleFilterChange = useCallback((filtered) => {
    setFilteredProjects(filtered);
    setCurrentPage(1);
  }, []);

  // 处理从其他页面传递过来的消息
  useEffect(() => {
    if (location.state?.message) {
      setMessage(location.state.message);
      setMessageVariant(location.state.messageVariant || 'success');
      // 清除 location state，防止刷新后重复显示
      window.history.replaceState({}, document.title);
      // 3秒后自动清除消息
      setTimeout(() => setMessage(null), 3000);
    }
  }, [location.state]);

  // 一次性加载所有项目数据
  const loadAllProjects = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: 1,
        pageSize: 1000
      };
      const response = await apiService.get(`${API_PREFIX}/admin/projects`, { params });
      
      if (response && response.items) {
        setAllProjects(response.items);
        setFilteredProjects(response.items);
      } else {
        setAllProjects([]);
        setFilteredProjects([]);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
      setAllProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllProjects();
  }, [loadAllProjects]);

  // 定义搜索列 - 与表格列保持一致
  const searchColumns = useMemo(() => [
    {
      key: 'title',
      label: t('admin.projects.table.title'),
      render: (value) => value || ''
    },
    {
      key: 'targetCompanyName',
      label: t('admin.projects.table.targetCompanyName', '목표 기업명'),
      render: (value, row) => {
        if (!value && !row.targetBusinessNumber) {
          return t('admin.projects.table.publicRecruitment', '公开招募');
        }
        return value || '';
      }
    },
    {
      key: 'targetBusinessNumber',
      label: t('admin.projects.table.targetBusinessNumber', '사업자등록번호'),
      render: (value) => value ? formatBusinessLicense(value) : ''
    },
    {
      key: 'startDate',
      label: t('admin.projects.table.startDate'),
      render: (value) => value || ''
    },
    {
      key: 'endDate',
      label: t('admin.projects.table.endDate'),
      render: (value) => value || ''
    },
    {
      key: 'status',
      label: t('admin.projects.table.status'),
      render: (value) => t(`admin.projects.status.${value}`, value)
    }
  ], [t]);

  // 分页后的数据
  const projects = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredProjects.slice(start, end);
  }, [filteredProjects, currentPage, pageSize]);

  // 更新总数
  useEffect(() => {
    setTotalCount(filteredProjects.length);
  }, [filteredProjects]);

  const handleCreate = () => {
    navigate('/admin/projects/new');
  };

  const handleEdit = (projectId) => {
    navigate(`/admin/projects/${projectId}/edit`);
  };

  const handleViewDetail = (projectId) => {
    navigate(`/admin/projects/${projectId}`);
  };

  const handleDelete = async (projectId) => {
    if (!confirm(t('admin.projects.confirmDelete', '确定要删除这个项目吗？此操作不可撤销。'))) {
      return;
    }
    await apiService.delete(`${API_PREFIX}/admin/projects/${projectId}`);
    loadAllProjects();
  };

  const handleExport = async (format = 'excel') => {
    setLoading(true);
    try {
      await adminService.exportProjects({ format });
      setMessage(t('admin.projects.exportSuccess', '导出成功'));
      setMessageVariant('success');
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage(t('admin.projects.exportFailed', '导出失败'));
      setMessageVariant('error');
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const tableColumns = [
    {
      key: 'title',
      label: t('admin.projects.table.title')
    },
    {
      key: 'targetCompanyName',
      label: t('admin.projects.table.targetCompanyName', '목표 기업명'),
      render: (value, row) => {
        if (!value && !row.targetBusinessNumber) {
          return <span className="text-gray-400">{t('admin.projects.table.publicRecruitment', '公开招募')}</span>;
        }
        return value || '-';
      }
    },
    {
      key: 'targetBusinessNumber',
      label: t('admin.projects.table.targetBusinessNumber', '사업자등록번호'),
      render: (value) => {
        return value ? formatBusinessLicense(value) : '-';
      }
    },
    {
      key: 'startDate',
      label: t('admin.projects.table.startDate')
    },
    {
      key: 'endDate',
      label: t('admin.projects.table.endDate')
    },
    {
      key: 'status',
      label: t('admin.projects.table.status'),
      render: (value) => {
        const getStatusVariant = (status) => {
          switch (status) {
            case 'active':
              return 'success';
            case 'inactive':
              return 'warning';
            case 'archived':
              return 'secondary';
            default:
              return 'default';
          }
        };
        
        return (
          <Badge variant={getStatusVariant(value)}>
            {t(`admin.projects.status.${value}`, value)}
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
            className="text-blue-600 hover:text-blue-900 font-medium text-sm"
          >
            {t('common.view')}
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(row.id);
            }}
            className="text-primary-600 hover:text-primary-900 font-medium text-sm"
          >
            {t('common.edit')}
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(row.id);
            }}
            className="text-red-600 hover:text-red-900 font-medium text-sm"
          >
            {t('common.delete')}
          </button>
        </div>
      )
    }
  ];

  return (
    <div>
      {message && (
        <Alert variant={messageVariant} className="mb-4" onClose={() => setMessage(null)}>
          {message}
        </Alert>
      )}

      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-semibold text-gray-900 mb-4">
          {t('admin.projects.title')}
        </h1>
        
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <SearchInput
            data={allProjects}
            columns={searchColumns}
            onFilter={handleFilterChange}
            placeholder={t('admin.projects.searchPlaceholder', '搜索所有列：项目名称、目标企业、营业执照号、状态等')}
            className="flex-1 min-w-[200px] max-w-md"
          />
          <div className="flex items-center space-x-2 md:ml-4 w-full md:w-auto">
            <Button 
              onClick={() => handleExport('excel')} 
              variant="outline"
              disabled={loading}
            >
              {t('admin.projects.exportExcel', '导出 Excel')}
            </Button>
            <Button 
              onClick={() => handleExport('csv')} 
              variant="outline"
              disabled={loading}
            >
              {t('admin.projects.exportCsv', '导出 CSV')}
            </Button>
            <Button onClick={handleCreate}>
              {t('admin.projects.create')}
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        {loading ? (
          <div className="p-12 text-center text-gray-500">{t('common.loading')}</div>
        ) : projects.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p className="text-lg mb-2">{t('admin.projects.noProjects', '暂无项目数据')}</p>
            <p className="text-sm text-gray-400">
              {totalCount === 0 
                ? t('admin.projects.noProjectsHint', '请创建第一个项目，或尝试刷新页面')
                : t('admin.projects.noMatchingProjects', '当前筛选条件下没有匹配的项目')}
            </p>
          </div>
        ) : (
          <>
            <Table 
              columns={tableColumns} 
              data={projects}
            />
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
        )}
      </div>
    </div>
  );
}

