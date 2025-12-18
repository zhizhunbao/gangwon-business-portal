/**
 * Audit Log Detail Component - Admin Portal
 * 审计日志详情
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, Badge, Loading } from '@shared/components';
import { adminService } from '@shared/services';
import { formatDateTime } from '@shared/utils/format';

export default function AuditLogDetail() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [log, setLog] = useState(null);

  useEffect(() => {
    loadLogDetail();
  }, [id]);

  const loadLogDetail = async () => {
    setLoading(true);
    const response = await adminService.getAuditLog(id);
    setLog(response);
    setLoading(false);
  };


  const getActionBadgeVariant = (action) => {
    if (action?.includes('create') || action?.includes('register')) {
      return 'success';
    }
    if (action?.includes('update') || action?.includes('approve')) {
      return 'info';
    }
    if (action?.includes('delete') || action?.includes('reject')) {
      return 'danger';
    }
    if (action?.includes('login') || action?.includes('logout')) {
      return 'primary';
    }
    return 'secondary';
  };

  if (loading) {
    return <Loading />;
  }

  if (!log) {
    return (
      <div className="px-6 py-6">
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            {t('admin.auditLogs.notFound', '审计日志不存在')}
          </p>
          <Button
            variant="outline"
            onClick={() => navigate('/admin/audit-logs')}
            className="mt-4"
          >
            {t('admin.auditLogs.backToList', '返回列表')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('admin.auditLogs.detail.title', '审计日志详情')}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t('admin.auditLogs.detail.description', '查看审计日志的详细信息')}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate('/admin/audit-logs')}
        >
          {t('admin.auditLogs.backToList', '返回列表')}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('admin.auditLogs.detail.basicInfo', '基本信息')}
          </h2>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t('admin.auditLogs.detail.id', '日志ID')}
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white font-mono">
                {log.id}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t('admin.auditLogs.detail.action', '操作')}
              </dt>
              <dd className="mt-1">
                <Badge variant={getActionBadgeVariant(log.action)}>
                  {log.action}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t('admin.auditLogs.detail.createdAt', '时间')}
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                {formatDateTime(log.createdAt, 'yyyy-MM-dd HH:mm:ss', i18n.language)}
              </dd>
            </div>
          </dl>
        </Card>

        {/* User Information */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('admin.auditLogs.detail.userInfo', '用户信息')}
          </h2>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t('admin.auditLogs.detail.userId', '用户ID')}
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white font-mono">
                {log.userId || '-'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t('admin.auditLogs.detail.userEmail', '用户邮箱')}
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                {log.userEmail || '-'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t('admin.auditLogs.detail.userCompany', '企业名称')}
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                {log.userCompanyName || '-'}
              </dd>
            </div>
          </dl>
        </Card>

        {/* Resource Information */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('admin.auditLogs.detail.resourceInfo', '资源信息')}
          </h2>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t('admin.auditLogs.detail.resourceType', '资源类型')}
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                {log.resourceType || '-'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t('admin.auditLogs.detail.resourceId', '资源ID')}
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white font-mono">
                {log.resourceId || '-'}
              </dd>
            </div>
          </dl>
        </Card>

        {/* Network Information */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('admin.auditLogs.detail.networkInfo', '网络信息')}
          </h2>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t('admin.auditLogs.detail.ipAddress', 'IP地址')}
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white font-mono">
                {log.ipAddress || '-'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t('admin.auditLogs.detail.userAgent', 'User-Agent')}
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white break-all">
                {log.userAgent || '-'}
              </dd>
            </div>
          </dl>
        </Card>
      </div>
    </div>
  );
}

