/**
 * Project List Page - Member Portal
 * 项目/사업공고列表页面
 */

import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback } from 'react';
import HomeList from '@shared/components/HomeList';
import { formatDate } from '@shared/utils';
import { homeService } from '@shared/services';
import { BANNER_TYPES } from '@shared/utils/constants';

function ProjectList() {
  const { t, i18n } = useTranslation();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);

  const loadProjects = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const response = await homeService.listProjects({
        page,
        pageSize: 20
      });
      
      if (response.items) {
        const formattedProjects = response.items.map(p => ({
          id: p.id,
          title: p.title,
          date: p.createdAt ? formatDate(p.createdAt, 'yyyy-MM-dd', i18n.language) : '',
          status: p.status || 'active',
          attachments: p.attachments || []
        }));
        setProjects(formattedProjects);
        setTotal(response.total || 0);
        setTotalPages(response.totalPages || 0);
        setCurrentPage(page);
      }
    } catch (error) {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [i18n.language]);

  useEffect(() => {
    loadProjects(1);
  }, [loadProjects]);

  function handlePageChange(page) {
    loadProjects(page);
  }

  function getBadgeInfo(project) {
    const statusMap = {
      active: {
        text: t('projects.status.active', '进行中'),
        variant: 'success'
      },
      inactive: {
        text: t('projects.status.inactive', '已结束'),
        variant: 'secondary'
      },
      archived: {
        text: t('projects.status.archived', '已归档'),
        variant: 'secondary'
      }
    };
    return statusMap[project.status] || statusMap.active;
  }

  async function handleProjectClick(projectId) {
    setDetailLoading(true);
    try {
      const detail = await homeService.getProject(projectId);
      if (detail) {
        setSelectedProject({
          id: detail.id,
          title: detail.title,
          contentHtml: detail.description || '',
          date: detail.createdAt,
          badge: getBadgeInfo({ status: detail.status }),
          imageUrl: detail.imageUrl,
          attachments: detail.attachments || []
        });
      }
    } catch (error) {
      console.error('Failed to load project detail:', error);
    } finally {
      setDetailLoading(false);
    }
  }

  function handleCloseModal() {
    setSelectedProject(null);
  }

  return (
    <HomeList
      title={t('home.news.title', '项目公告')}
      bannerType={BANNER_TYPES.MAIN_PRIMARY}
      items={projects}
      loading={loading}
      emptyMessage={t('home.news.empty', '暂无项目公告')}
      getBadgeInfo={getBadgeInfo}
      onItemClick={handleProjectClick}
      showModal={true}
      showPagination={true}
      currentPage={currentPage}
      totalPages={totalPages}
      total={total}
      onPageChange={handlePageChange}
      selectedItem={selectedProject}
      detailLoading={detailLoading}
      onCloseDetail={handleCloseModal}
    />
  );
}

export default ProjectList;

