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
    } catch (err) {
      // api.service.js 已经处理了错误码映射，返回 i18nKey
      console.log('API Error:', err); // 调试用
      const i18nKey = err?.i18nKey;
      
      // 优先使用 i18n key，否则使用后端返回的 message
      const message = i18nKey 
        ? t(i18nKey) 
        : (err?.message || t('common.unknownError', '发生未知错误，请稍后再试'));
      // 只在 Alert 显示后端错误，不在 Textarea 显示
      setFormMessage(message);
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
      size="lg"
    >
      <div className="space-y-4">
        {/* 项目信息 */}
        <div className="flex items-center gap-3 p-3 bg-primary-50 rounded-lg border border-primary-200">
          <DocumentIcon className="w-5 h-5 text-primary-600 flex-shrink-0" />
          <span className="flex-1 font-medium text-gray-900">{project.title}</span>
          {project.status && (
            <Badge variant={getStatusInfo(project.status).variant} className="text-xs">
              {getStatusInfo(project.status).label}
            </Badge>
          )}
        </div>

        {/* 企业信息 */}
        {user && (
          <div className="grid grid-cols-3 gap-4 p-3 bg-gray-50 rounded-lg text-sm">
            <div>
              <span className="text-gray-500">{t('projects.companyId', '企业ID')}: </span>
              <span className="font-medium">{user.business_number || user.businessNumber || user.id}</span>
            </div>
            <div>
              <span className="text-gray-500">{t('projects.companyName', '企业名')}: </span>
              <span className="font-medium">{user.company_name || user.companyName || '-'}</span>
            </div>
            <div>
              <span className="text-gray-500">{t('projects.contactPerson', '负责人')}: </span>
              <span className="font-medium">{user.contact_person || user.name || '-'}</span>
            </div>
          </div>
        )}

        {/* 错误提示 */}
        {formMessage && (
          <Alert variant="error">{formMessage}</Alert>
        )}

        {/* 申请理由 */}
        <Textarea
          label={t('projects.application.form.reason', '申请理由')}
          value={applicationReason}
          onChange={handleApplicationReasonChange}
          placeholder={t('projects.application.form.reasonPlaceholder', '请详细说明申请此项目的原因（至少10个字符）')}
          rows={6}
          required
          error={formError}
          help={`${applicationReason.length}/10 ${t('common.characters', '字符')}`}
        />

        {/* 操作按钮 */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button onClick={handleClose} variant="secondary" disabled={submitting}>
            {t('common.cancel', '取消')}
          </Button>
          <Button
            onClick={handleSubmitApplication}
            variant="primary"
            disabled={applicationReason.trim().length < 10 || submitting}
          >
            {submitting ? t('common.submitting', '提交中...') : t('common.submit', '提交')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}


