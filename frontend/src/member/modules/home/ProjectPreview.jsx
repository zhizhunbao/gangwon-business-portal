import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback } from 'react';
import HomePreview from '@shared/components/HomePreview';
import { homeService } from '@shared/services';
import { formatDate } from '@shared/utils';
import { ROUTES } from '@shared/utils/constants';

function ProjectPreview() {
  const { t, i18n } = useTranslation();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const response = await homeService.listProjects({
        page: 1,
        pageSize: 4
      });
      
      if (response.items) {
        const formattedProjects = response.items.map(p => ({
          id: p.id,
          title: p.title,
          date: formatDate(p.createdAt, 'yyyy-MM-dd', i18n.language),
          status: p.status || 'active',
          imageUrl: p.imageUrl,
          attachments: p.attachments || []
        }));
        setProjects(formattedProjects);
      }
    } catch (error) {
      console.error('Load projects error:', error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [i18n.language]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

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
    <HomePreview
      title={t('home.news.title')}
      viewAllLink={ROUTES.MEMBER_PROJECT}
      items={projects}
      loading={loading}
      emptyMessage={t('home.news.empty')}
      getBadgeInfo={getBadgeInfo}
      onItemClick={handleProjectClick}
      showModal={true}
      selectedItem={selectedProject}
      detailLoading={detailLoading}
      onCloseModal={handleCloseModal}
    />
  );
}

export default ProjectPreview;

