/**
 * Project List Page - Member Portal
 * 程序公告列表页面 - 支持搜索、分页、程序申请、详情查看
 */

import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@shared/components';
import Card from '@shared/components/Card';
import Button from '@shared/components/Button';
import Input from '@shared/components/Input';
import Select from '@shared/components/Select';
import { Pagination } from '@shared/components';
import { projectService, loggerService, exceptionService } from '@shared/services';
import { SearchIcon } from '@shared/components/Icons';
import ApplicationModal from './ApplicationModal';

export default function ProjectList() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        pageSize: pageSize,
        search: searchKeyword || undefined,
        status: statusFilter || undefined,
      };
      
      const response = await projectService.listProjects(params);
      if (response && response.records) {
        setProjects(response.records);
        setTotalPages(response.totalPages || 0);
        setTotal(response.total || 0);
      }
    } catch (error) {
      loggerService.error('Failed to load projects', {
        module: 'ProjectList',
        function: 'loadProjects',
        error_message: error.message,
        error_code: error.code
      });
      exceptionService.recordException(error, {
        request_path: window.location.pathname,
        error_code: error.code || 'LOAD_PROJECTS_FAILED'
      });
      setProjects([]);
      setTotalPages(0);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchKeyword, statusFilter, i18n.language]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleSearch = useCallback((e) => {
    e.preventDefault();
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handlePageSizeChange = useCallback((e) => {
    setPageSize(parseInt(e.target.value));
    setCurrentPage(1);
  }, []);

  const handleStatusFilterChange = useCallback((e) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  }, []);

  const handleApply = useCallback((project) => {
    setSelectedProject(project);
    setShowApplicationModal(true);
  }, []);

  const handleApplicationSuccess = useCallback(() => {
    setSelectedProject(null);
    setShowApplicationModal(false);
    // 刷新列表
    loadProjects();
  }, [loadProjects]);

  // 处理查看详情的回调
  const handleViewDetail = useCallback((project) => {
    navigate(`/member/programs/${project.id}`);
  }, [navigate]);

  const pageSizeOptions = [
    { value: '10', label: '10' },
    { value: '20', label: '20' },
    { value: '30', label: '30' },
    { value: '50', label: '50' }
  ];

  // 获取状态显示文本和样式 - 映射后端状态到前端显示
  const getStatusInfo = useCallback((status) => {
    const statusMap = {
      active: {
        label: t('projects.status.active', '进行中'),
        variant: 'success'
      },
      inactive: {
        label: t('projects.status.inactive', '未激活'),
        variant: 'gray'
      },
      archived: {
        label: t('projects.status.archived', '已归档'),
        variant: 'gray'
      },
      // 兼容旧的状态值
      recruiting: {
        label: t('projects.status.recruiting', '모집중'),
        variant: 'success'
      },
      ongoing: {
        label: t('projects.status.ongoing', '진행중'),
        variant: 'primary'
      },
      closed: {
        label: t('projects.status.closed', '마감'),
        variant: 'gray'
      }
    };
    return statusMap[status] || { label: status, variant: 'gray' };
  }, [t]);

  // 显示列表
  return (
    <>
      <div className="mb-8 p-0 bg-transparent shadow-none">
        <h1 className="hidden">{t('projects.title', '项目')}</h1>
      </div>

        {/* 搜索和分页设置 */}
        <Card className="p-4 sm:p-5 lg:p-6 mb-4">
          <div className="flex justify-between items-center gap-4 sm:gap-5 lg:gap-6 flex-wrap [&_.form-group]:mb-0">
            <form onSubmit={handleSearch} className="flex-shrink-0 min-w-[200px] max-w-[400px] sm:max-w-[500px] lg:max-w-[600px]">
              <div className="flex gap-3 items-center">
                <Input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder={t('projects.searchPlaceholder', '按标题/内容搜索')}
                  className="flex-1"
                />
                <Button type="submit" variant="primary">
                  <SearchIcon className="w-5 h-5" />
                  {t('common.search', '搜索')}
                </Button>
              </div>
            </form>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 flex-shrink-0">
                <label className="text-sm text-gray-700 whitespace-nowrap">{t('projects.statusFilter', '状态筛选')}:</label>
                <Select
                  value={statusFilter}
                  onChange={handleStatusFilterChange}
                  options={[
                    { value: '', label: t('common.all', '全部') },
                    { value: 'active', label: t('projects.status.active', '进行中') },
                    { value: 'inactive', label: t('projects.status.inactive', '未激活') },
                    { value: 'archived', label: t('projects.status.archived', '已归档') },
                  ]}
                />
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <label className="text-sm text-gray-700 whitespace-nowrap">{t('projects.itemsPerPage', '每页显示')}:</label>
                <Select
                  value={pageSize.toString()}
                  onChange={handlePageSizeChange}
                  options={pageSizeOptions}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* 项目列表 */}
        {loading ? (
          <Card>
            <div className="text-center py-12 px-4">
              <p className="text-base text-gray-500 m-0">{t('common.loading', '加载中...')}</p>
            </div>
          </Card>
        ) : projects.length === 0 ? (
          <Card>
            <div className="text-center py-12 px-4">
              <p className="text-base text-gray-500 m-0">{t('common.noData', '暂无数据')}</p>
            </div>
          </Card>
        ) : (
          <>
            <div className="flex flex-col gap-4 sm:gap-5 lg:gap-6 mb-6 sm:mb-8 lg:mb-10">
              {projects.map((project) => {
                const statusInfo = project.status ? getStatusInfo(project.status) : null;
                
                return (
                  <Card key={project.id} className="p-4 sm:p-5 lg:p-6 transition-shadow duration-200 ease-in-out hover:shadow-md">
                    <div className="flex justify-between items-start gap-4 mb-4 sm:mb-5 lg:mb-6 pb-4 border-b border-gray-200">
                      <div className="flex-1 min-w-0">
                        <h2 
                          className="text-xl font-semibold text-gray-900 m-0 cursor-pointer transition-colors duration-200 ease-in-out leading-snug mb-2 sm:mb-3 lg:mb-4 break-words hover:text-primary-600"
                          onClick={() => handleViewDetail(project)}
                        >
                          {project.title}
                        </h2>
                        <div className="flex flex-wrap gap-2 sm:gap-3 lg:gap-4 items-center">
                          {statusInfo && (
                            <Badge variant={statusInfo.variant} className="text-xs sm:text-sm">
                              {statusInfo.label}
                            </Badge>
                          )}
                          {project.applicationsCount > 0 && (
                            <Badge variant="info" className="text-xs sm:text-sm">
                              {t('projects.applicationsCount', '申请数')}: {project.applicationsCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <span className="text-sm text-gray-500 whitespace-nowrap flex-shrink-0">
                        {project.startDate && project.endDate 
                          ? `${new Date(project.startDate).toLocaleDateString()} - ${new Date(project.endDate).toLocaleDateString()}`
                          : project.createdAt 
                            ? new Date(project.createdAt).toLocaleDateString() 
                            : ''}
                      </span>
                    </div>
                    <div className="mb-4 sm:mb-5 lg:mb-6">
                      <p className="text-[0.9375rem] text-gray-700 leading-relaxed m-0 line-clamp-3">{project.description?.substring(0, 200) || ''}...</p>
                      {project.targetAudience && (
                        <p className="text-[0.9375rem] text-gray-700 leading-relaxed mt-2">
                          <strong>{t('projects.targetAudience', '目标对象')}:</strong> {project.targetAudience}
                        </p>
                      )}
                    </div>
                    <div className="flex justify-end pt-4 sm:pt-5 lg:pt-6 border-t border-gray-200">
                      <Button
                        onClick={() => handleApply(project)}
                        variant="primary"
                        disabled={project.status !== 'active'}
                      >
                        {project.status === 'active' 
                          ? t('projects.apply', '程序申请')
                          : t('projects.notAvailable', '不可申请')}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-6 sm:mt-8 lg:mt-10 pt-6 sm:pt-8 lg:pt-10">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </>
        )}

      {/* 程序申请弹窗 */}
      <ApplicationModal
        isOpen={showApplicationModal}
        onClose={() => setShowApplicationModal(false)}
        project={selectedProject}
        onSuccess={handleApplicationSuccess}
      />
    </>
  );
}

