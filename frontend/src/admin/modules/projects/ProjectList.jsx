/**
 * Project List Component - Admin Portal
 * 项目管理列表
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, Table, Button, Badge, Pagination, SearchInput } from '@shared/components';
import { apiService, adminService } from '@shared/services';
import { API_PREFIX } from '@shared/utils/constants';
import { formatBusinessLicense } from '@shared/utils/format';

export default function ProjectList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [allProjects, setAllProjects] = useState([]); // 存储所有数据

  const [searchKeyword, setSearchKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  // 一次性加载所有项目数据
  const loadAllProjects = useCallback(async () => {
    setLoading(true);
    const params = {
      page: 1,
      page_size: 10000 // 加载所有数据
    };
    const response = await apiService.get(`${API_PREFIX}/admin/projects`, { params });
    
    if (response.items) {
      setAllProjects(response.items);
    } else {
      setAllProjects([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAllProjects();
  }, [loadAllProjects]);

  // 前端模糊搜索和过滤
  const filteredProjects = useMemo(() => {
    return allProjects.filter(project => {
      // 搜索关键词过滤
      if (searchKeyword) {
        const keyword = searchKeyword.toLowerCase();
        const searchKeywordNormalized = searchKeyword.replace(/-/g, '').toLowerCase();
        
        // 搜索项目名称
        const title = (project.title || '').toLowerCase();
        // 搜索目标企业名称
        const targetCompanyName = (project.target_company_name || '').toLowerCase();
        // 搜索营业执照号
        const targetBusinessNumber = (project.target_business_number || '').replace(/-/g, '').toLowerCase();
        
        if (!title.includes(keyword) && 
            !targetCompanyName.includes(keyword) && 
            !targetBusinessNumber.includes(searchKeywordNormalized)) {
          return false;
        }
      }
      return true;
    });
  }, [allProjects, searchKeyword]);

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
    await adminService.exportProjects({ format });
    setLoading(false);
  };

  const columns = [
    {
      key: 'title',
      label: t('admin.projects.table.title')
    },
    {
      key: 'target_company_name',
      label: t('admin.projects.table.targetCompanyName', '목표 기업명'),
      render: (value, row) => {
        if (!value && !row.target_business_number) {
          return <span className="text-gray-400">{t('admin.projects.table.publicRecruitment', '公开招募')}</span>;
        }
        return value || '-';
      }
    },
    {
      key: 'target_business_number',
      label: t('admin.projects.table.targetBusinessNumber', '사업자등록번호'),
      render: (value) => {
        return value ? formatBusinessLicense(value) : '-';
      }
    },
    {
      key: 'start_date',
      label: t('admin.projects.table.startDate')
    },
    {
      key: 'end_date',
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

      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-semibold text-gray-900 mb-4">
          {t('admin.projects.title')}
        </h1>
        
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex-1 min-w-[200px] max-w-md">
            <SearchInput
              value={searchKeyword}
              onChange={(value) => {
                setSearchKeyword(value);
                setCurrentPage(1);
              }}
              placeholder={t('admin.projects.searchPlaceholder', '请输入项目名称、目标企业名称、营业执照号等关键词')}
            />
          </div>
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
              columns={columns} 
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

