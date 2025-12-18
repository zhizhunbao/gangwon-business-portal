/**
 * Project Detail Page - Member Portal
 * 程序公告详情页面 - 包含程序申请弹窗
 */

import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import Card from '@shared/components/Card';
import Button from '@shared/components/Button';
import { projectService } from '@shared/services';
import { formatDate } from '@shared/utils/format';
import ApplicationModal from './ApplicationModal';
import { PageContainer } from '@member/layouts';

export default function ProjectDetail() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showApplicationModal, setShowApplicationModal] = useState(false);

  const loadProjectDetail = useCallback(async () => {
    if (!id) return;
    
    setLoading(true);
    const projectData = await projectService.getProject(id);
    if (projectData) {
      setProject(projectData);
    }
    setLoading(false);
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
      <PageContainer>
        <div className="mb-8 p-0 bg-transparent shadow-none">
          <h1 className="block text-2xl font-bold text-gray-900 mb-0">{t('projects.detail', '项目详情')}</h1>
        </div>

        {loading ? (
          <Card>
            <div className="text-center py-12 px-4">
              <p className="text-base text-gray-500 m-0">{t('common.loading', '加载中...')}</p>
            </div>
          </Card>
        ) : project ? (
          <Card className="w-full max-w-full p-4 sm:p-5 lg:p-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4 pb-3 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 m-0 flex-1">{project.title}</h2>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-sm text-gray-500">
                {project.startDate && project.endDate && (
                  <span>
                    {t('projects.period', '项目期间')}: {formatDate(project.startDate)} - {formatDate(project.endDate)}
                  </span>
                )}
                {project.createdAt && (
                  <span className="whitespace-nowrap flex-shrink-0">
                    {t('common.createdAt', '创建时间')}: {formatDate(project.createdAt)}
                  </span>
                )}
              </div>
            </div>
            {project.imageUrl && (
              <div className="mb-4 rounded-lg overflow-hidden">
                <img src={project.imageUrl} alt={project.title} className="w-full h-auto max-h-[300px] object-cover" />
              </div>
            )}
            <div className="mb-4 text-sm text-gray-700 leading-relaxed">
              {project.description && (
                <div className="mb-4">
                  <h3 className="text-base font-semibold text-gray-900 mb-2">{t('projects.description', '项目描述')}</h3>
                  <p className="mb-2 leading-relaxed">{project.description}</p>
                </div>
              )}
              {(project.target_company_name || project.target_business_number) && (
                <div>
                  <h3 className="text-base font-semibold text-gray-900 mb-2">{t('projects.targetCompany', '목표 기업')}</h3>
                  <div className="leading-relaxed">
                    {project.target_company_name && (
                      <p className="font-medium">{project.target_company_name}</p>
                    )}
                    {project.target_business_number && (
                      <p className="text-gray-600 text-sm">{t('projects.businessNumber', '营业执照号')}: {project.target_business_number}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end pt-4 border-t border-gray-200">
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
            <div className="text-center py-12 px-4">
              <p className="text-base text-gray-500 m-0">{t('common.noData', '暂无数据')}</p>
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
      </PageContainer>
    </>
  );
}

