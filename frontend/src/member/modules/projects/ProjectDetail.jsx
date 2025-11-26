/**
 * Project Detail Page - Member Portal
 * 程序公告详情页面 - 包含程序申请弹窗
 */

import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '@shared/components/Card';
import Button from '@shared/components/Button';
import { projectService } from '@shared/services';
import { ArrowLeftIcon } from '@shared/components/Icons';
import ApplicationModal from './ApplicationModal';
import './ProjectDetail.css';

export default function ProjectDetail() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showApplicationModal, setShowApplicationModal] = useState(false);

  const loadProjectDetail = useCallback(async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const projectData = await projectService.getProject(id);
      if (projectData) {
        setProject(projectData);
      }
    } catch (error) {
      console.error('Failed to load project detail:', error);
    } finally {
      setLoading(false);
    }
  }, [id, i18n.language]);

  useEffect(() => {
    loadProjectDetail();
  }, [loadProjectDetail]);

  const handleApply = useCallback(() => {
    setShowApplicationModal(true);
  }, []);

  const handleApplicationSuccess = useCallback(() => {
    // 可以在这里执行成功后的操作，比如刷新数据
  }, []);

  return (
    <>
      <div className="page-header">
        <Button
          onClick={() => navigate('/member/programs')}
          variant="text"
          className="back-button"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          {t('common.back', '返回')}
        </Button>
        <h1>{t('projects.detail', '项目详情')}</h1>
      </div>

        {loading ? (
          <Card>
            <div className="loading">
              <p>{t('common.loading', '加载中...')}</p>
            </div>
          </Card>
        ) : project ? (
          <Card className="announcement-detail-card">
            <div className="announcement-detail-header">
              <h2>{project.title}</h2>
              <div className="project-meta">
                {project.startDate && project.endDate && (
                  <span className="project-period">
                    {t('projects.period', '项目期间')}: {new Date(project.startDate).toLocaleDateString()} - {new Date(project.endDate).toLocaleDateString()}
                  </span>
                )}
                <span className="announcement-date">
                  {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : ''}
                </span>
              </div>
            </div>
            {project.imageUrl && (
              <div className="project-image">
                <img src={project.imageUrl} alt={project.title} />
              </div>
            )}
            <div className="announcement-detail-content">
              {project.description && (
                <div className="project-description">
                  <h3>{t('projects.description', '项目描述')}</h3>
                  <p>{project.description}</p>
                </div>
              )}
              {project.targetAudience && (
                <div className="project-target-audience">
                  <h3>{t('projects.targetAudience', '目标对象')}</h3>
                  <p>{project.targetAudience}</p>
                </div>
              )}
            </div>
            <div className="announcement-detail-footer">
              <Button 
                onClick={handleApply} 
                variant="primary"
                disabled={project.status !== 'active'}
              >
                {project.status === 'active' 
                  ? t('projects.apply', '程序申请')
                  : t('projects.notAvailable', '不可申请')}
              </Button>
            </div>
          </Card>
        ) : (
          <Card>
            <div className="no-data">
              <p>{t('common.noData', '暂无数据')}</p>
            </div>
          </Card>
        )}

      {/* 程序申请弹窗 */}
      <ApplicationModal
        isOpen={showApplicationModal}
        onClose={() => setShowApplicationModal(false)}
        project={project}
        onSuccess={handleApplicationSuccess}
      />
    </>
  );
}

