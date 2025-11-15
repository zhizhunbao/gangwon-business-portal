/**
 * Project List Page - Member Portal
 * 项目列表（公告列表）
 */

import './Projects.css';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Card from '@shared/components/Card';
import Button from '@shared/components/Button';
import Input from '@shared/components/Input';
import Select from '@shared/components/Select';
import { Modal, ModalFooter } from '@shared/components/Modal';
import { Pagination } from '@shared/components/Pagination';
import { apiService } from '@shared/services';
import { API_PREFIX, BANNER_TYPES, DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '@shared/utils/constants';
import { EyeIcon, PaperclipIcon } from '@shared/components/Icons';
import ProjectApplicationModal from './ProjectApplicationModal';

export default function ProjectList() {
  const { t } = useTranslation();
  const [projects, setProjects] = useState([]);
  const [banner, setBanner] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalCount, setTotalCount] = useState(0);
  
  // 申请弹窗状态
  const [applicationModalOpen, setApplicationModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  // 加载横幅
  const loadBanner = useCallback(async () => {
    try {
      const response = await apiService.get(`${API_PREFIX}/content/banners`);
      if (response.banners) {
        const projectBanner = response.banners.find(b => b.type === BANNER_TYPES.PROJECTS);
        if (projectBanner) {
          setBanner({
            imageUrl: projectBanner.imageUrl,
            linkUrl: projectBanner.linkUrl || null
          });
        }
      }
    } catch (error) {
      console.error('Failed to load banner:', error);
    }
  }, []);

  useEffect(() => {
    loadBanner();
  }, [loadBanner]);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const params = {
        status: statusFilter !== 'all' ? statusFilter : undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined,
        search: searchTerm || undefined,
        page: currentPage,
        page_size: pageSize
      };
      const response = await apiService.get(`${API_PREFIX}/projects`, params);
      if (response.projects) {
        const formattedProjects = response.projects.map(p => ({
          id: p.id,
          title: p.title,
          type: p.type,
          status: p.status,
          startDate: p.startDate,
          endDate: p.endDate,
          budget: p.budget,
          description: p.description,
          attachments: p.attachments?.length || 0,
          views: p.views || 0
        }));
        setProjects(formattedProjects);
        setTotalCount(response.totalCount || response.pagination?.total || formattedProjects.length);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [statusFilter, typeFilter, searchTerm, currentPage, pageSize]);

  const handleBannerClick = (linkUrl) => {
    if (linkUrl) {
      window.open(linkUrl, '_blank');
    }
  };

  const handleApplyClick = (projectId) => {
    setSelectedProjectId(projectId);
    setApplicationModalOpen(true);
  };

  const handleApplicationSuccess = () => {
    setApplicationModalOpen(false);
    setSelectedProjectId(null);
    loadProjects(); // 重新加载项目列表
  };

  const statusOptions = [
    { value: 'all', label: t('common.all') },
    { value: 'recruiting', label: t('projects.status.recruiting') },
    { value: 'ongoing', label: t('projects.status.ongoing') },
    { value: 'closed', label: t('projects.status.closed') }
  ];

  const typeOptions = [
    { value: 'all', label: t('common.all') },
    { value: 'startup', label: t('projects.types.startup') },
    { value: 'rd', label: t('projects.types.rd') },
    { value: 'export', label: t('projects.types.export') },
    { value: 'investment', label: t('projects.types.investment') }
  ];

  const getStatusBadgeClass = (status) => {
    const classes = {
      recruiting: 'badge-success',
      ongoing: 'badge-info',
      closed: 'badge-secondary'
    };
    return `badge ${classes[status] || ''}`;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="project-list">
      {/* 横幅 */}
      {banner && (
        <div 
          className="project-banner"
          style={{
            backgroundImage: `url(${banner.imageUrl})`,
            cursor: banner.linkUrl ? 'pointer' : 'default'
          }}
          onClick={() => handleBannerClick(banner.linkUrl)}
        >
          {banner.linkUrl && <div className="banner-overlay" />}
        </div>
      )}

      <div className="page-header">
        <h1>{t('projects.title')}</h1>
        <p className="subtitle">{t('projects.subtitle')}</p>
      </div>

      {/* 搜索和过滤 */}
      <Card className="filter-card">
        <div className="filter-row">
          <div className="search-box">
            <Input
              type="search"
              placeholder={t('projects.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); // 重置到第一页
              }}
            />
          </div>
          
          <div className="filter-group">
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              options={statusOptions}
            />
            
            <Select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              options={typeOptions}
            />
            
            <Select
              value={pageSize.toString()}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              options={PAGE_SIZE_OPTIONS.map(size => ({
                value: size.toString(),
                label: `${size}${t('projects.perPage')}`
              }))}
            />
          </div>
        </div>
      </Card>

      {/* 项目列表 */}
      <div className="projects-container">
        <div className="results-info">
          <p>{t('projects.resultsCount', { count: totalCount })}</p>
        </div>

        {loading ? (
          <Card>
            <div className="no-data">
              <p>{t('common.loading')}</p>
            </div>
          </Card>
        ) : projects.length === 0 ? (
          <Card>
            <div className="no-data">
              <p>{t('common.noData')}</p>
            </div>
          </Card>
        ) : (
          <>
            <div className="projects-list">
              {projects.map((project) => (
                <Card key={project.id} className="project-card">
                  <div className="project-header">
                    <div className="project-title-section">
                      <Link to={`/member/projects/${project.id}`}>
                        <h3>{project.title}</h3>
                      </Link>
                      <span className={getStatusBadgeClass(project.status)}>
                        {t(`projects.status.${project.status}`)}
                      </span>
                    </div>
                    <div className="project-meta">
                      <span className="views">
                        <EyeIcon className="w-4 h-4" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '0.25rem' }} />
                        {project.views}
                      </span>
                      <span className="attachments">
                        <PaperclipIcon className="w-4 h-4" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '0.25rem' }} />
                        {project.attachments}
                      </span>
                    </div>
                  </div>

                  <div className="project-body">
                    <p className="project-description">{project.description}</p>
                    
                    <div className="project-details">
                      <div className="detail-item">
                        <span className="label">{t('project.type')}:</span>
                        <span className="value">{t(`projects.types.${project.type}`)}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">{t('project.budget')}:</span>
                        <span className="value">{formatCurrency(project.budget)}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">{t('common.date')}:</span>
                        <span className="value">
                          {project.startDate} ~ {project.endDate}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="project-footer">
                    <Link to={`/member/projects/${project.id}`}>
                      <Button variant="secondary">
                        {t('common.details')}
                      </Button>
                    </Link>
                    
                    {project.status === 'recruiting' && (
                      <Button 
                        variant="primary"
                        onClick={() => handleApplyClick(project.id)}
                      >
                        {t('projects.apply')}
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="pagination-container">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* 申请弹窗 */}
      {selectedProjectId && (
        <ProjectApplicationModal
          isOpen={applicationModalOpen}
          onClose={() => {
            setApplicationModalOpen(false);
            setSelectedProjectId(null);
          }}
          projectId={selectedProjectId}
          onSuccess={handleApplicationSuccess}
        />
      )}
    </div>
  );
}

