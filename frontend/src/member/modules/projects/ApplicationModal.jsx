/**
 * Application Modal Component
 * 程序申请弹窗组件 - 可在列表和详情页面复用
 */

import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Modal, Badge, Button, Textarea, Alert } from '@shared/components';
import { DocumentIcon } from '@shared/components/Icons';
import useAuthStore from '@shared/stores/authStore';
import { projectService } from '@shared/services';
import './ApplicationModal.css';

export default function ApplicationModal({ 
  isOpen, 
  onClose, 
  project,
  onSuccess 
}) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [submitting, setSubmitting] = useState(false);
  const [applicationReason, setApplicationReason] = useState('');
  const [formError, setFormError] = useState('');
  const [formMessage, setFormMessage] = useState(null);

  // 获取状态显示文本和样式
  const getStatusInfo = (status) => {
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
  };

  const handleApplicationReasonChange = (e) => {
    const value = e.target.value;
    setApplicationReason(value);
    if (formError) {
      setFormError('');
    }
    if (formMessage) {
      setFormMessage(null);
    }
  };

  // 提交申请
  const handleSubmitApplication = async () => {
    if (!user?.id) {
      setFormMessage(t('common.loginRequired', '请先登录'));
      return;
    }

    if (!project?.id) {
      setFormMessage(t('projects.projectNotFound', '项目不存在'));
      return;
    }

    // 验证申请理由（至少10个字符）
    const trimmedReason = applicationReason.trim();
    if (!trimmedReason || trimmedReason.length < 10) {
      setFormError(t('projects.application.reasonMinLength', '申请理由至少需要10个字符'));
      setFormMessage(t('projects.application.validationError', '请补全必填信息后再试'));
      return;
    }

    setFormError('');
    setFormMessage(null);
    setSubmitting(true);
    
    try {
      await projectService.applyToProject(project.id, {
        applicationReason: trimmedReason
      });

      // 清空表单
      setApplicationReason('');
      setFormError('');
      setFormMessage(null);
      
      // 调用成功回调
      if (onSuccess) {
        onSuccess();
      }
      
      // 关闭弹窗
      onClose();
    } catch (error) {
      console.error('Failed to submit application:', error);
      const errorMessage = error?.response?.data?.detail || error?.message || t('message.submitFailed', '提交失败');
      setFormMessage(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // 关闭时清空表单
  const handleClose = () => {
    setApplicationReason('');
    setFormError('');
    setFormMessage(null);
    onClose();
  };

  if (!project) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('projects.apply', '程序申请')}
    >
      <div className="application-modal">
        {/* 项目信息卡片 */}
        <div className="announcement-info-card">
          <div className="announcement-info-header">
            <div className="announcement-info-icon">
              <DocumentIcon className="project-icon-document-large" />
            </div>
            <div className="announcement-info-content">
              <h3 className="announcement-info-title">{project.title}</h3>
              <div className="announcement-info-badges">
                {project.status && (
                  <Badge 
                    variant={getStatusInfo(project.status).variant} 
                    className="announcement-status"
                  >
                    {getStatusInfo(project.status).label}
                  </Badge>
                )}
                {project.applicationsCount > 0 && (
                  <Badge variant="info" className="announcement-applications">
                    {t('projects.applicationsCount', '申请数')}: {project.applicationsCount}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 企业信息卡片 */}
        {user && (
          <div className="company-info-card">
            <div className="company-info-header">
              <h4 className="company-info-title">
                <svg className="company-info-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                {t('projects.companyInfo', '企业信息')}
              </h4>
            </div>
            <div className="company-info-grid">
              <div className="info-item">
                <label className="info-label">{t('projects.companyId', '企业ID')}</label>
                <span className="info-value">{user.business_number || user.businessNumber || user.id}</span>
              </div>
              <div className="info-item">
                <label className="info-label">{t('projects.companyName', '企业名')}</label>
                <span className="info-value">{user.company_name || user.companyName || t('common.notSet', '未设置')}</span>
              </div>
              <div className="info-item">
                <label className="info-label">{t('projects.contactPerson', '负责人')}</label>
                <span className="info-value">{user.contact_person || user.name || t('common.notSet', '未设置')}</span>
              </div>
            </div>
          </div>
        )}

        {/* 申请表单 */}
        <div className="application-form-card">
          <div className="form-header">
            <h4 className="form-header-title">
              {t('projects.application.form.title', '填写申请书')}
            </h4>
            <p className="form-header-description">
              {t('projects.application.form.description', '请完整填写以下申请内容')}
            </p>
          </div>

          {formMessage && (
            <Alert variant={formError ? "error" : "info"} className="application-form-alert">
              {formMessage}
            </Alert>
          )}

          <div className="application-form-grid application-form-grid-full">
            <Textarea
              label={t('projects.application.form.reason', '申请理由')}
              value={applicationReason}
              onChange={handleApplicationReasonChange}
              placeholder={t('projects.application.form.reasonPlaceholder', '请详细说明申请此项目的原因，包括项目目标、预期效果、参与人员等信息（至少10个字符）')}
              rows={8}
              required
              error={formError}
              help={t('projects.application.form.reasonHelp', `当前 ${applicationReason.length} 个字符，至少需要 10 个字符`)}
            />
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="modal-actions">
          <Button
            onClick={handleClose}
            variant="secondary"
            disabled={submitting}
          >
            {t('common.cancel', '取消')}
          </Button>
          <Button
            onClick={handleSubmitApplication}
            variant="primary"
            disabled={!applicationReason.trim() || applicationReason.trim().length < 10 || submitting}
          >
            {submitting ? t('common.submitting', '提交中...') : t('common.submit', '提交')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}


