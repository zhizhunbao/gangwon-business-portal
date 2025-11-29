/**
 * Exception Detail Component - Admin Portal
 * 异常详情
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Card, Badge, Textarea } from '@shared/components';
import { apiClient } from '@shared/services';
import './ExceptionDetail.css';

export default function ExceptionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [exception, setException] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    loadException();
  }, [id]);

  const loadException = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/api/v1/exceptions/${id}`);
      setException(response);
      setResolutionNotes(response.resolution_notes || '');
    } catch (error) {
      console.error('Failed to load exception:', error);
      alert(t('admin.exceptions.loadFailed', '加载异常失败'));
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!confirm(t('admin.exceptions.confirmResolve', '确定要标记为已解决吗？'))) {
      return;
    }

    setResolving(true);
    try {
      await apiClient.post(`/api/v1/exceptions/${id}/resolve`, {
        resolution_notes: resolutionNotes,
      });
      loadException();
      alert(t('admin.exceptions.resolveSuccess', '标记成功'));
    } catch (error) {
      console.error('Failed to resolve exception:', error);
      alert(t('admin.exceptions.resolveFailed', '标记失败'));
    } finally {
      setResolving(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!exception) {
    return <div>{t('admin.exceptions.notFound', '异常不存在')}</div>;
  }

  return (
    <div className="exception-detail">
      <div className="exception-detail__header">
        <Button variant="outline" onClick={() => navigate('/admin/exceptions')}>
          {t('admin.exceptions.back', '返回')}
        </Button>
        <h1>{t('admin.exceptions.detail', '异常详情')}</h1>
        {exception.resolved !== 'true' && (
          <Button
            variant="primary"
            onClick={handleResolve}
            disabled={resolving}
          >
            {t('admin.exceptions.resolve', '标记已解决')}
          </Button>
        )}
      </div>

      <div className="exception-detail__content">
        <Card>
          <div className="exception-detail__section">
            <h3>{t('admin.exceptions.basicInfo', '基本信息')}</h3>
            <div className="exception-detail__fields">
              <div className="field">
                <label>{t('admin.exceptions.id', 'ID')}</label>
                <div>{exception.id}</div>
              </div>
              <div className="field">
                <label>{t('admin.exceptions.source', '来源')}</label>
                <Badge variant={exception.source === 'backend' ? 'primary' : 'success'}>
                  {exception.source === 'backend' ? t('admin.exceptions.backend', '后端') : t('admin.exceptions.frontend', '前端')}
                </Badge>
              </div>
              <div className="field">
                <label>{t('admin.exceptions.type', '异常类型')}</label>
                <Badge variant="danger">
                  {exception.exception_type}
                </Badge>
              </div>
              <div className="field">
                <label>{t('admin.exceptions.status', '状态')}</label>
                <Badge variant={exception.resolved === 'true' ? 'success' : 'warning'}>
                  {exception.resolved === 'true' ? t('admin.exceptions.resolved', '已解决') : t('admin.exceptions.unresolved', '未解决')}
                </Badge>
              </div>
              <div className="field">
                <label>{t('admin.exceptions.createdAt', '时间')}</label>
                <div>{new Date(exception.created_at).toLocaleString()}</div>
              </div>
              <div className="field field-full">
                <label>{t('admin.exceptions.message', '异常消息')}</label>
                <div className="exception-message-full">{exception.exception_message}</div>
              </div>
            </div>
          </div>

          <div className="exception-detail__section">
            <h3>{t('admin.exceptions.context', '上下文信息')}</h3>
            <div className="exception-detail__fields">
              <div className="field">
                <label>{t('admin.exceptions.traceId', '追踪ID')}</label>
                <code>{exception.trace_id || '-'}</code>
              </div>
              <div className="field">
                <label>{t('admin.exceptions.user', '用户')}</label>
                <div>{exception.user_email || '-'}</div>
              </div>
              <div className="field">
                <label>{t('admin.exceptions.requestPath', '请求路径')}</label>
                <div>{exception.request_path || '-'}</div>
              </div>
              <div className="field">
                <label>{t('admin.exceptions.requestMethod', '请求方法')}</label>
                <div>{exception.request_method || '-'}</div>
              </div>
              <div className="field">
                <label>{t('admin.exceptions.statusCode', '状态码')}</label>
                <div>{exception.status_code || '-'}</div>
              </div>
              <div className="field">
                <label>{t('admin.exceptions.errorCode', '错误代码')}</label>
                <div>{exception.error_code || '-'}</div>
              </div>
            </div>
          </div>

          {exception.stack_trace && (
            <div className="exception-detail__section">
              <h3>{t('admin.exceptions.stackTrace', '堆栈跟踪')}</h3>
              <pre className="exception-stack-trace">{exception.stack_trace}</pre>
            </div>
          )}

          {exception.request_data && (
            <div className="exception-detail__section">
              <h3>{t('admin.exceptions.requestData', '请求数据')}</h3>
              <pre className="exception-data">{JSON.stringify(exception.request_data, null, 2)}</pre>
            </div>
          )}

          {exception.context_data && (
            <div className="exception-detail__section">
              <h3>{t('admin.exceptions.contextData', '上下文数据')}</h3>
              <pre className="exception-data">{JSON.stringify(exception.context_data, null, 2)}</pre>
            </div>
          )}

          {exception.resolved === 'true' && (
            <div className="exception-detail__section">
              <h3>{t('admin.exceptions.resolution', '解决方案')}</h3>
              <div className="exception-detail__fields">
                <div className="field">
                  <label>{t('admin.exceptions.resolvedAt', '解决时间')}</label>
                  <div>{exception.resolved_at ? new Date(exception.resolved_at).toLocaleString() : '-'}</div>
                </div>
                <div className="field">
                  <label>{t('admin.exceptions.resolvedBy', '解决人')}</label>
                  <div>{exception.resolver_email || '-'}</div>
                </div>
                <div className="field field-full">
                  <label>{t('admin.exceptions.resolutionNotes', '解决备注')}</label>
                  <div>{exception.resolution_notes || '-'}</div>
                </div>
              </div>
            </div>
          )}

          {exception.resolved !== 'true' && (
            <div className="exception-detail__section">
              <h3>{t('admin.exceptions.resolve', '标记已解决')}</h3>
              <div className="exception-detail__fields">
                <div className="field field-full">
                  <label>{t('admin.exceptions.resolutionNotes', '解决备注')}</label>
                  <Textarea
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    rows={4}
                    placeholder={t('admin.exceptions.resolutionNotesPlaceholder', '请输入解决备注（可选）')}
                  />
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

