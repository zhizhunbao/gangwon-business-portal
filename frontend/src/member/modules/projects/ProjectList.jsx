/**
 * Project List Page - Member Portal
 * 程序公告列表页面 - 支持搜索、分页、程序申请、详情查看
 */

import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@shared/components';
import { formatDate } from '@shared/utils/format';
import Card from '@shared/components/Card';
import Button from '@shared/components/Button';
import Input from '@shared/components/Input';
import Select from '@shared/components/Select';
import { Pagination } from '@shared/components';
import { projectService } from '@shared/services';
import { SearchIcon } from '@shared/components/Icons';
import ApplicationModal from './ApplicationModal';
import { PageContainer } from '@member/layouts';

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
    setLoading(false);
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
      <PageContainer className="flex flex-col min-h-[calc(100vh-70px)] max-md:min-h-[calc(100vh-60px)]">
        <div className="mb-8 p-0 bg-transparent shadow-none">
          <h1 className="block text-2xl font-bold text-gray-900 mb-0">{t('projects.title', '项目')}</h1>
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
                    inline={true}
                    className="w-full flex-1"
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
                    inline={true}
                    className="w-40"
                  />
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <label className="text-sm text-gray-700 whitespace-nowrap">{t('projects.itemsPerPage', '每页显示')}:</label>
                  <Select
                    value={pageSize.toString()}
                    onChange={handlePageSizeChange}
                    options={pageSizeOptions}
                    placeholder={null}
                    inline={true}
                    className="w-28"
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
            <div className={`flex flex-col gap-4 sm:gap-5 lg:gap-6 ${totalPages > 1 ? 'pb-20' : 'pb-0'}`}>
              {projects.map((project) => {
                const statusInfo = project.status ? getStatusInfo(project.status) : null;
                
                return (
                  <Card key={project.id} className="p-4 sm:p-5 lg:p-6 transition-shadow duration-200 ease-in-out hover:shadow-md">
                    <div
                      className="flex justify-between items-start gap-4 mb-4 sm:mb-5 lg:mb-6 pb-4 border-b border-gray-200 cursor-pointer"
                      onClick={() => handleViewDetail(project)}
                    >
                      <div className="flex-1 min-w-0">
                        <h2 className="text-xl font-semibold text-gray-900 m-0 leading-snug mb-2 sm:mb-3 lg:mb-4 break-words hover:text-blue-700 transition-colors">
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
                          ? `${formatDate(project.startDate)} - ${formatDate(project.endDate)}`
                          : project.createdAt 
                            ? formatDate(project.createdAt)
                            : ''}
                      </span>
                    </div>
                    <div className="mb-4 sm:mb-5 lg:mb-6">
                      <p className="text-[0.9375rem] text-gray-700 leading-relaxed m-0 line-clamp-3">{project.description?.substring(0, 200) || ''}...</p>
                      {(project.target_company_name || project.target_business_number) && (
                        <p className="text-[0.9375rem] text-gray-700 leading-relaxed mt-2">
                          <strong>{t('projects.targetCompany', '목표 기업')}:</strong> 
                          {project.target_company_name && (
                            <span className="ml-1">{project.target_company_name}</span>
                          )}
                          {project.target_business_number && (
                            <span className="ml-1 text-gray-600">({project.target_business_number})</span>
                          )}
                        </p>
                      )}
                    </div>
                    <div className="flex justify-end gap-3 pt-4 sm:pt-5 lg:pt-6 border-t border-gray-200">
                      <Button
                        variant="secondary"
                        onClick={() => handleViewDetail(project)}
                      >
                        {t('projects.viewDetail', '查看详情')}
                      </Button>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApply(project);
                        }}
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

            {/* 分页（固定在底部） */}
            {totalPages > 1 && (
              <div className="sticky bottom-0 mt-auto py-3">
                <div className="flex justify-between items-center px-1 sm:px-0">
                  <div className="text-xs text-gray-500 whitespace-nowrap">
                    {t('common.itemsPerPage', '每页显示')}: {pageSize} · {t('common.total', '共')}: {total}
                  </div>
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                  />
                </div>
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
      </PageContainer>
    </>
  );
}

