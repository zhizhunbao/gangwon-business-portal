/**
 * Project List Page - Member Portal
 * 程序公告列表页面 - 支持搜索、分页、程序申请、详情查看
 */

import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Badge } from '@shared/components';
import { formatDate } from '@shared/utils';
import Card from '@shared/components/Card';
import Button from '@shared/components/Button';
import SearchInput from '@shared/components/SearchInput';
import { projectService } from '@shared/services';
import ApplicationModal from './ApplicationModal';
import { PageContainer } from '@member/layouts';

export default function ProjectList() {
  const { t, i18n } = useTranslation();
  const [allProjects, setAllProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  // 使用 useCallback 包装 setFilteredProjects 避免无限循环
  const handleFilterChange = useCallback((filtered) => {
    setFilteredProjects(filtered);
  }, []);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: 1,
        pageSize: 100,
        status: 'active',
      };
      
      const response = await projectService.listProjects(params);
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
      setFilteredProjects([]);
    } finally {
      setLoading(false);
    }
  }, [i18n.language]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleApply = useCallback(async (project) => {
    setSelectedProject(project);
    
    // 检查是否已申请过此项目
    try {
      const response = await projectService.getMyApplications({ page: 1, pageSize: 100 });
      const existingApplication = response.items?.find(app => app.projectId === project.id);
      
      if (existingApplication) {
        // 如果已申请，设置为查看模式
        setSelectedProject({
          ...project,
          existingApplication: existingApplication,
          viewMode: true,
        });
      }
    } catch (error) {
      console.error('Failed to check existing application:', error);
    }
    
    setShowApplicationModal(true);
  }, []);

  const handleApplicationSuccess = useCallback(() => {
    setSelectedProject(null);
    setShowApplicationModal(false);
    // 刷新列表
    loadProjects();
  }, [loadProjects]);

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

  // 定义搜索列
  const columns = useMemo(() => [
    {
      key: 'title',
      render: (value) => value || ''
    },
    {
      key: 'description',
      render: (value) => value || ''
    },
    {
      key: 'status',
      render: (value) => {
        const statusInfo = getStatusInfo(value);
        return statusInfo.label;
      }
    },
    {
      key: 'targetCompanyName',
      render: (value) => value || ''
    },
    {
      key: 'targetBusinessNumber',
      render: (value) => value || ''
    },
    {
      key: 'startDate',
      render: (value) => value ? formatDate(value) : ''
    },
    {
      key: 'endDate',
      render: (value) => value ? formatDate(value) : ''
    },
    {
      key: 'actions',
      render: (_, row) => {
        if (row.status === 'active') {
          return t('projects.apply', '程序申请');
        }
        return t('projects.notAvailable', '不可申请');
      }
    }
  ], [getStatusInfo, t]);

  // 显示列表
  return (
    <>
      <PageContainer className="flex flex-col min-h-[calc(100vh-70px)] max-md:min-h-[calc(100vh-60px)]">
        <div className="mb-6 sm:mb-8 lg:mb-10 min-h-[48px] flex items-center">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 m-0">{t('projects.title', '项目')}</h1>
        </div>

          {/* 搜索 */}
          <Card className="p-4 sm:p-5 lg:p-6 mb-4">
            <div className="flex justify-between items-center gap-4 flex-wrap">
              <SearchInput
                data={allProjects}
                columns={columns}
                onFilter={handleFilterChange}
                placeholder={t('projects.searchPlaceholder', '按标题/内容搜索')}
                className="flex-1 min-w-[200px] max-w-md"
                debounceMs={300}
              />
              <div className="text-sm text-gray-600">
                {t('common.resultsCount', '共{{count}}条记录', { count: filteredProjects.length })}
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
        ) : filteredProjects.length === 0 ? (
          <Card>
            <div className="text-center py-12 px-4">
              <p className="text-base text-gray-500 m-0">
                {allProjects.length === 0 ? t('common.noData', '暂无数据') : t('common.noSearchResults', '没有找到匹配的结果')}
              </p>
            </div>
          </Card>
        ) : (
          <div className="flex flex-col gap-4 sm:gap-5 lg:gap-6">
            {filteredProjects.map((project) => {
                const statusInfo = project.status ? getStatusInfo(project.status) : null;
                
                return (
                  <Card key={project.id} className="p-4 sm:p-5 lg:p-6 transition-shadow duration-200 ease-in-out hover:shadow-md">
                    {/* 项目头部：标题、状态、日期 */}
                    <div className="flex justify-between items-start gap-4 mb-4 sm:mb-5 lg:mb-6 pb-4 border-b border-gray-200">
                      <div className="flex-1 min-w-0">
                        <h2 className="text-xl font-semibold text-gray-900 m-0 leading-snug mb-2 sm:mb-3 lg:mb-4 break-words">
                          {project.title}
                        </h2>
                        <div className="flex flex-wrap gap-2 sm:gap-3 lg:gap-4 items-center">
                          {statusInfo && (
                            <Badge variant={statusInfo.variant} className="text-xs sm:text-sm">
                              {statusInfo.label}
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
                    
                    {/* 项目详情：图片和文字 */}
                    <div className="mb-4 sm:mb-5 lg:mb-6">
                      <div className="flex flex-col md:flex-row gap-4">
                        {/* 项目图片 */}
                        {project.imageUrl && (
                          <div className="flex-shrink-0 w-full md:w-48 lg:w-56">
                            <img 
                              src={project.imageUrl} 
                              alt={project.title}
                              className="w-full h-32 md:h-36 lg:h-40 object-cover rounded-lg"
                            />
                          </div>
                        )}
                        {/* 项目描述 */}
                        <div className="flex-1">
                          <p className="text-[0.9375rem] text-gray-700 leading-relaxed m-0 whitespace-pre-line">
                            {project.description || ''}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* 申请按钮 */}
                    <div className="flex justify-end gap-3 pt-4 sm:pt-5 lg:pt-6 border-t border-gray-200">
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

