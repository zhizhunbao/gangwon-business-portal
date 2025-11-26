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
import { projectService } from '@shared/services';
import { SearchIcon } from '@shared/components/Icons';
import ApplicationModal from './ApplicationModal';
import './ProjectList.css';

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
      console.error('Failed to load projects:', error);
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
      <div className="page-header">
        <h1>{t('projects.title', '项目')}</h1>
      </div>

        {/* 搜索和分页设置 */}
        <Card>
          <div className="search-section">
            <form onSubmit={handleSearch} className="search-form">
              <div className="search-input-group">
                <Input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder={t('projects.searchPlaceholder', '按标题/内容搜索')}
                  className="search-input"
                />
                <Button type="submit" variant="primary">
                  <SearchIcon className="project-icon-search" />
                  {t('common.search', '搜索')}
                </Button>
              </div>
            </form>
            <div className="filter-group">
              <div className="status-filter">
                <label>{t('projects.statusFilter', '状态筛选')}:</label>
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
              <div className="page-size-selector">
                <label>{t('projects.itemsPerPage', '每页显示')}:</label>
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
            <div className="loading">
              <p>{t('common.loading', '加载中...')}</p>
            </div>
          </Card>
        ) : projects.length === 0 ? (
          <Card>
            <div className="no-data">
              <p>{t('common.noData', '暂无数据')}</p>
            </div>
          </Card>
        ) : (
          <>
            <div className="announcements-list">
              {projects.map((project) => {
                const statusInfo = project.status ? getStatusInfo(project.status) : null;
                
                return (
                  <Card key={project.id} className="announcement-card">
                    <div className="announcement-header">
                      <div className="announcement-title-section">
                        <h2 
                          className="announcement-title"
                          onClick={() => handleViewDetail(project)}
                        >
                          {project.title}
                        </h2>
                        <div className="announcement-meta">
                          {statusInfo && (
                            <Badge variant={statusInfo.variant} className="announcement-status">
                              {statusInfo.label}
                            </Badge>
                          )}
                          {project.applicationsCount > 0 && (
                            <Badge variant="info" className="announcement-applications">
                              {t('projects.applicationsCount', '申请数')}: {project.applicationsCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <span className="announcement-date">
                        {project.startDate && project.endDate 
                          ? `${new Date(project.startDate).toLocaleDateString()} - ${new Date(project.endDate).toLocaleDateString()}`
                          : project.createdAt 
                            ? new Date(project.createdAt).toLocaleDateString() 
                            : ''}
                      </span>
                    </div>
                    <div className="announcement-content">
                      <p>{project.description?.substring(0, 200) || ''}...</p>
                      {project.targetAudience && (
                        <p className="target-audience">
                          <strong>{t('projects.targetAudience', '目标对象')}:</strong> {project.targetAudience}
                        </p>
                      )}
                    </div>
                    <div className="announcement-footer">
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
              <div className="pagination-section">
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

