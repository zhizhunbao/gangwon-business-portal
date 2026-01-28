/**
 * Application Modal Component
 * 程序申请弹窗组件 - 可在列表和详情页面复用
 */

import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Modal, Badge, Button, Textarea, Alert, FileAttachments } from '@shared/components';
import { DocumentIcon } from '@shared/components/Icons';
import { useAuthStore } from '@shared/stores';
import { projectService, uploadService } from '@shared/services';

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
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [applicantName, setApplicantName] = useState('');
  const [applicantPhone, setApplicantPhone] = useState('');

  // 格式化电话号码
  const formatPhoneNumber = (value) => {
    // 移除所有非数字字符
    const numbers = value.replace(/\D/g, '');
    
    // 根据长度格式化
    if (numbers.length <= 3) {
      return numbers;
    } else if (numbers.length <= 7) {
      // 010-1234 或 02-1234
      if (numbers.startsWith('02')) {
        return `${numbers.slice(0, 2)}-${numbers.slice(2)}`;
      }
      return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    } else if (numbers.length <= 10) {
      // 02-1234-5678
      if (numbers.startsWith('02')) {
        return `${numbers.slice(0, 2)}-${numbers.slice(2, 6)}-${numbers.slice(6)}`;
      }
      // 010-123-4567
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6)}`;
    } else {
      // 010-1234-5678
      if (numbers.startsWith('02')) {
        return `${numbers.slice(0, 2)}-${numbers.slice(2, 6)}-${numbers.slice(6, 10)}`;
      }
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
    }
  };

  // 处理电话号码输入
  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setApplicantPhone(formatted);
  };
  
  // 判断是否为查看模式（已申请）
  const isViewMode = project?.viewMode || false;
  const existingApplication = project?.existingApplication;
  
  // 判断是否可以重新申请（已取消或已拒绝的申请）
  const canReapply = existingApplication && ['cancelled', 'rejected'].includes(existingApplication.status);
  
  // 如果可以重新申请，则不是查看模式
  const actualViewMode = isViewMode && !canReapply;

  // 当打开弹窗且为查看模式时，加载已有申请数据
  useEffect(() => {
    if (isOpen && actualViewMode && existingApplication) {
      setApplicationReason(existingApplication.applicationReason || '');
      setAttachments(existingApplication.attachments || []);
      setApplicantName(existingApplication.applicantName || '');
      setApplicantPhone(existingApplication.applicantPhone || '');
    } else if (isOpen && !actualViewMode) {
      // 新申请或重新申请时，预填充用户信息
      setApplicationReason('');
      setAttachments([]);
      setFormError('');
      setFormMessage(null);
      setApplicantName(user?.contactPersonName || user?.contact_person_name || user?.representative || '');
      setApplicantPhone(user?.contactPersonPhone || user?.contact_person_phone || user?.phone || '');
    }
  }, [isOpen, actualViewMode, existingApplication, user]);

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

  const handleAttachmentsChange = async (files, action, index) => {
    if (action === 'remove') {
      setAttachments(attachments.filter((_, i) => i !== index));
      return;
    }

    setUploading(true);
    try {
      const uploadedFiles = [];
      for (const file of files) {
        // 使用 uploadPublic 方法，传递空的 onUploadProgress 回调
        const result = await uploadService.uploadPublic(file, () => {});
        uploadedFiles.push({
          fileName: file.name,
          originalName: file.name,
          fileSize: file.size,
          fileUrl: result.fileUrl || result.url,
          filePath: result.filePath || result.path,
        });
      }
      setAttachments([...attachments, ...uploadedFiles]);
    } catch (error) {
      console.error('Upload error:', error);
      const errorMsg = error?.message || t('fileAttachments.uploadError', '文件上传失败，请重试');
      setFormMessage(errorMsg);
    } finally {
      setUploading(false);
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

    // 验证申请人姓名
    const trimmedName = applicantName.trim();
    if (!trimmedName) {
      setFormError(t('projects.application.applicantNameRequired', '请输入申请人姓名'));
      setFormMessage(t('projects.application.validationError', '请补全必填信息后再试'));
      return;
    }

    // 验证申请人电话
    const trimmedPhone = applicantPhone.trim();
    if (!trimmedPhone) {
      setFormError(t('projects.application.applicantPhoneRequired', '请输入申请人电话'));
      setFormMessage(t('projects.application.validationError', '请补全必填信息后再试'));
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
        applicantName: trimmedName,
        applicantPhone: trimmedPhone,
        applicationReason: trimmedReason,
        attachments: attachments.map(att => ({
          file_name: att.fileName || att.originalName,
          original_name: att.originalName || att.fileName,
          file_size: att.fileSize,
          file_url: att.fileUrl,
          file_path: att.filePath,
        })),
      });

      // 清空表单
      setApplicationReason('');
      setAttachments([]);
      setApplicantName('');
      setApplicantPhone('');
      setFormError('');
      setFormMessage(null);
      
      // 调用成功回调
      if (onSuccess) {
        onSuccess();
      }
      
      // 关闭弹窗
      onClose();
    } catch (err) {
      console.error('Application submission error:', err);
      // api.service.js 已经处理了错误码映射，返回 i18nKey
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
    setAttachments([]);
    setApplicantName('');
    setApplicantPhone('');
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
      title={actualViewMode ? t('projects.applicationDetail', '申请详情') : (canReapply ? t('projects.reapply', '重新申请') : t('projects.apply', '程序申请'))}
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

        {/* 查看模式：显示申请状态（仅在不可重新申请时显示） */}
        {isViewMode && existingApplication && !canReapply && (
          <div className="p-3 rounded-lg border bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-900">
                {t('projects.applicationStatus', '申请状态')}:
              </span>
              <Badge variant="info" className="text-xs">
                {t(`projects.applicationRecords.status.${existingApplication.status}`, existingApplication.status)}
              </Badge>
            </div>
            {existingApplication.submittedAt && (
              <div className="mt-2 text-xs text-blue-700">
                {t('projects.submittedAt', '提交时间')}: {new Date(existingApplication.submittedAt).toLocaleString()}
              </div>
            )}
          </div>
        )}

        {/* 企业信息 */}
        {user && (
          <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg text-sm">
            <div>
              <span className="text-gray-500">{t('projects.companyId', '企业ID')}: </span>
              <span className="font-medium">{user.businessNumber || user.id}</span>
            </div>
            <div>
              <span className="text-gray-500">{t('projects.companyName', '企业名')}: </span>
              <span className="font-medium">{user.companyName || '-'}</span>
            </div>
          </div>
        )}

        {/* 错误提示 */}
        {formMessage && (
          <Alert variant="error">{formMessage}</Alert>
        )}

        {/* 申请人信息 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('projects.application.form.applicantName', '申请人姓名')}
              {!actualViewMode && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="text"
              value={applicantName}
              onChange={(e) => setApplicantName(e.target.value)}
              placeholder={t('projects.application.form.applicantNamePlaceholder', '请输入申请人姓名')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
              disabled={actualViewMode}
              required={!actualViewMode}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('projects.application.form.applicantPhone', '申请人电话')}
              {!actualViewMode && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="tel"
              value={applicantPhone}
              onChange={handlePhoneChange}
              placeholder={t('projects.application.form.applicantPhonePlaceholder', '请输入电话号码')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
              disabled={actualViewMode}
              required={!actualViewMode}
              maxLength={13}
            />
          </div>
        </div>

        {/* 申请理由 */}
        <Textarea
          label={t('projects.application.form.reason', '申请理由')}
          value={applicationReason}
          onChange={handleApplicationReasonChange}
          placeholder={t('projects.application.form.reasonPlaceholder', '请详细说明申请此项目的原因（至少10个字符）')}
          rows={6}
          required={!actualViewMode}
          error={formError}
          help={!actualViewMode ? `${applicationReason.length}/10 ${t('common.characters', '字符')}` : ''}
          disabled={actualViewMode}
        />

        {/* 附件上传/查看 */}
        <FileAttachments
          label={t('projects.application.form.attachments', '附件')}
          attachments={attachments}
          onChange={handleAttachmentsChange}
          maxFiles={5}
          uploading={uploading}
          disabled={actualViewMode || submitting}
        />

        {/* 操作按钮 */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button onClick={handleClose} variant="secondary">
            {actualViewMode ? t('common.close', '닫기') : t('common.cancel', '취소')}
          </Button>
          {!actualViewMode && (
            <Button
              onClick={handleSubmitApplication}
              variant="primary"
              disabled={!applicantName.trim() || !applicantPhone.trim() || applicationReason.trim().length < 10 || submitting}
            >
              {submitting ? t('common.submitting', '提交中...') : (canReapply ? t('projects.resubmit', '重新提交') : t('common.submit', '제출'))}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}


