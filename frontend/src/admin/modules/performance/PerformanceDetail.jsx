/**
 * Performance Detail Component - Admin Portal
 * 业绩详情页面
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Badge, Loading, Modal, Textarea, Alert } from '@shared/components';
import { adminService, uploadService } from '@shared/services';

export default function PerformanceDetail() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const currentLanguage = i18n.language === 'zh' ? 'zh' : 'ko';
  
  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState(null);
  const [member, setMember] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [reviewComment, setReviewComment] = useState('');
  const [rejectComment, setRejectComment] = useState('');
  const [message, setMessage] = useState(null);
  const [messageVariant, setMessageVariant] = useState('success');

  useEffect(() => {
    loadPerformanceDetail();
  }, [id]);


  const loadPerformanceDetail = async () => {
    setLoading(true);
    const recordData = await adminService.getPerformanceRecord(id);
    if (recordData) {
      setRecord(recordData);
      
      if (recordData.memberId) {
        const memberData = await adminService.getMemberDetail(recordData.memberId);
        setMember(memberData);
      }
    }
    setLoading(false);
  };

  const handleApprove = async () => {
    await adminService.approvePerformance(id);
    setMessageVariant('success');
    setMessage(t('admin.performance.approveSuccess', '批准成功') || '批准成功');
    setTimeout(() => setMessage(null), 3000);
    loadPerformanceDetail();
  };

  const handleRequestRevision = async () => {
    if (!reviewComment.trim()) {
      setMessageVariant('warning');
      setMessage(t('admin.performance.revisionCommentRequired', '请输入修改意见') || '请输入修改意见');
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    await adminService.requestPerformanceRevision(id, reviewComment);
    setMessageVariant('success');
    setMessage(t('admin.performance.revisionSuccess', '修改请求已发送') || '修改请求已发送');
    setTimeout(() => setMessage(null), 3000);
    setShowReviewModal(false);
    setReviewComment('');
    loadPerformanceDetail();
  };

  const handleReject = async () => {
    if (!rejectComment.trim()) {
      setMessageVariant('warning');
      setMessage(t('admin.performance.rejectCommentRequired', '请输入驳回原因') || '请输入驳回原因');
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    await adminService.rejectPerformance(id, rejectComment);
    setMessageVariant('success');
    setMessage(t('admin.performance.rejectSuccess', '驳回成功') || '驳回成功');
    setTimeout(() => setMessage(null), 3000);
    setShowRejectModal(false);
    setRejectComment('');
    loadPerformanceDetail();
  };

  const handleDownload = async (fileId, filename = null) => {
    if (!fileId) {
      setMessageVariant('error');
      setMessage(t('admin.performance.detail.fileNotFound', '文件不存在') || '文件不存在');
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    await uploadService.downloadFile(fileId, filename);
  };

  const handleDownloadByUrl = async (fileUrl, filename = null) => {
    if (!fileUrl) {
      setMessageVariant('error');
      setMessage(t('admin.performance.detail.fileNotFound', '文件不存在') || '文件不存在');
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    await uploadService.downloadFileByUrl(fileUrl, filename);
  };

  // Extract attachments from record (from Attachment table and data_json)
  const getAttachments = () => {
    const attachments = [];
    
    // First, get attachments from Attachment table (primary source)
    if (record && record.attachments && Array.isArray(record.attachments)) {
      record.attachments.forEach(att => {
        attachments.push({
          id: att.id,
          url: att.fileUrl,
          name: att.originalName || att.storedName || att.fileName || '附件',
          type: 'attachment',
          fileSize: att.fileSize,
          mimeType: att.mimeType,
          uploadedAt: att.uploadedAt
        });
      });
    }
    
    // Also check data_json for additional attachments
    if (record && record.dataJson) {
      const dataJson = record.dataJson;
      
      // Check for common attachment fields in data_json
      if (dataJson.attachments && Array.isArray(dataJson.attachments)) {
        dataJson.attachments.forEach(att => {
          // Avoid duplicates
          if (!attachments.find(a => a.id === att.id || a.id === att.fileId)) {
            attachments.push({
              id: att.id || att.fileId,
              url: att.url || att.fileUrl,
              name: att.name || att.originalName || att.fileName || '附件',
              type: 'data_json'
            });
          }
        });
      }
      
      // Check for fileId or fileUrl fields
      if (dataJson.fileId && !attachments.find(a => a.id === dataJson.fileId)) {
        attachments.push({
          id: dataJson.fileId,
          name: dataJson.fileName || dataJson.filename || '附件',
          type: 'fileId'
        });
      }
      
      if (dataJson.fileUrl && !attachments.find(a => a.url === dataJson.fileUrl)) {
        attachments.push({
          url: dataJson.fileUrl,
          name: dataJson.fileName || dataJson.filename || '附件',
          type: 'fileUrl'
        });
      }
      
      // Check for proofDocumentFileId
      if (dataJson.proofDocumentFileId && !attachments.find(a => a.id === dataJson.proofDocumentFileId)) {
        attachments.push({
          id: dataJson.proofDocumentFileId,
          name: dataJson.proofDocumentFileName || '证明文件',
          type: 'fileId'
        });
      }
      
      // Check for items array
      if (dataJson.items && Array.isArray(dataJson.items)) {
        dataJson.items.forEach((item, index) => {
          if (item.proofDocumentFileId && !attachments.find(a => a.id === item.proofDocumentFileId)) {
            attachments.push({
              id: item.proofDocumentFileId,
              name: item.proofDocumentFileName || `证明文件 ${index + 1}`,
              type: 'fileId'
            });
          }
          if (item.fileId && !attachments.find(a => a.id === item.fileId)) {
            attachments.push({
              id: item.fileId,
              name: item.fileName || item.filename || `附件 ${index + 1}`,
              type: 'file_id'
            });
          }
          if (item.fileUrl && !attachments.find(a => a.url === item.fileUrl)) {
            attachments.push({
              url: item.fileUrl,
              name: item.fileName || item.filename || `附件 ${index + 1}`,
              type: 'fileUrl'
            });
          }
        });
      }
    }
    
    return attachments;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const locale = currentLanguage === 'zh' ? 'zh-CN' : 'ko-KR';
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getStatusVariant = (status) => {
    const variantMap = {
      approved: 'success',
      submitted: 'info',
      pending: 'warning',
      revision_requested: 'warning',
      revision_required: 'warning',
      draft: 'secondary',
      rejected: 'danger'
    };
    return variantMap[status] || 'default';
  };

  const getStatusLabel = (status) => {
    const statusLabelMap = {
      approved: t('performance.status.approved', '已批准'),
      submitted: t('performance.status.submitted', '已提交'),
      pending: t('performance.status.submitted', '已提交'),
      revision_requested: t('performance.status.revisionRequested', '需修改'),
      revision_required: t('performance.status.revisionRequested', '需修改'),
      draft: t('performance.status.draft', '草稿'),
      rejected: t('performance.status.rejected', '已驳回')
    };
    return statusLabelMap[status] || status;
  };

  const getTypeLabel = (type) => {
    const typeMap = {
      sales: t('performance.types.sales'),
      support: t('performance.types.support'),
      ip: t('performance.types.ip')
    };
    return typeMap[type] || type;
  };

  const getReviewStatusLabel = (status) => {
    const statusMap = {
      approved: t('admin.performance.review.approved', '已批准'),
      revision_requested: t('admin.performance.review.revisionRequested', '需修改'),
      rejected: t('admin.performance.review.rejected', '已驳回')
    };
    return statusMap[status] || status;
  };

  if (loading) {
    return <Loading />;
  }

  if (!record) {
    return (
      <div className="p-12 text-center text-red-600">
        <p className="mb-6">{t('admin.performance.detail.notFound', '业绩记录不存在')}</p>
        <Button onClick={() => navigate('/admin/performance')}>
          {t('common.back')}
        </Button>
      </div>
    );
  }

  const attachments = getAttachments();
  const canApprove = record.status === 'submitted' || record.status === 'pending';

  const handleDownloadAll = async () => {
    const currentAttachments = getAttachments();
    if (currentAttachments.length === 0) {
      setMessageVariant('warning');
      setMessage(t('admin.performance.detail.noAttachments', '该记录没有附件') || '该记录没有附件');
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    const confirmMessage = t(
      'admin.performance.download.multipleFiles',
      `该记录有 ${currentAttachments.length} 个附件，是否全部下载？`,
      { count: currentAttachments.length }
    ) || `该记录有 ${currentAttachments.length} 个附件，是否全部下载？`;

    if (!confirm(confirmMessage)) {
      return;
    }

    let successCount = 0;
    let failCount = 0;
    const failedFiles = [];

    for (let i = 0; i < currentAttachments.length; i++) {
      const attachment = currentAttachments[i];
      if (attachment.id) {
        await uploadService.downloadFile(attachment.id, attachment.name);
      } else if (attachment.url) {
        await uploadService.downloadFileByUrl(attachment.url, attachment.name);
      }
      successCount++;

      // Add small delay between downloads to avoid browser blocking
      if (i < currentAttachments.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    // Show download result
    if (failCount === 0) {
      setMessageVariant('success');
      setMessage(t(
        'admin.performance.download.allSuccess',
        `成功下载 ${successCount} 个附件`,
        { count: successCount }
      ) || `成功下载 ${successCount} 个附件`);
      setTimeout(() => setMessage(null), 3000);
    } else {
      const failMessage = t(
        'admin.performance.download.partialSuccess',
        `成功下载 ${successCount} 个附件，${failCount} 个附件下载失败。\n失败的文件：${failedFiles.join('、')}`,
        {
          success: successCount,
          fail: failCount,
          files: failedFiles.join('、')
        }
      ) || `成功下载 ${successCount} 个附件，${failCount} 个附件下载失败。\n失败的文件：${failedFiles.join('、')}`;
      setMessageVariant('warning');
      setMessage(failMessage);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  return (
    <div className="w-full">
      {message && (
        <Alert variant={messageVariant} className="mb-4" onClose={() => setMessage(null)}>
          {message}
        </Alert>
      )}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/admin/performance')}>
            {t('common.back')}
          </Button>
        </div>
        {canApprove && (
          <div className="flex gap-4">
            <Button 
              variant="outline" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowReviewModal(true);
              }}
              className="border-yellow-600 text-yellow-600 hover:bg-yellow-50"
            >
              {t('admin.performance.requestRevision')}
            </Button>
            <Button 
              variant="outline" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowRejectModal(true);
              }}
              className="border-red-600 text-red-600 hover:bg-red-50"
            >
              {t('admin.performance.reject', '驳回')}
            </Button>
            <Button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleApprove();
              }}
            >
              {t('admin.performance.approve')}
            </Button>
          </div>
        )}
      </div>

      {/* 基本信息卡片 */}
      <Card className="mb-6 p-6">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 m-0">
            {t('admin.performance.detail.basicInfo', '基本信息')}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {member && (
            <>
              <div className="flex flex-col gap-2">
                <label className="text-sm text-gray-600 font-medium">
                  {t('admin.performance.table.memberName', '企业名称')}
                </label>
                <span className="text-base text-gray-900">
                  {member.companyName || member.businessNumber || '-'}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm text-gray-600 font-medium">
                  {t('admin.members.detail.businessNumber', '营业执照号')}
                </label>
                <span className="text-base text-gray-900">
                  {member.businessNumber || '-'}
                </span>
              </div>
            </>
          )}
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-600 font-medium">
              {t('admin.performance.table.year', '年度')}
            </label>
            <span className="text-base text-gray-900">{record.year || '-'}</span>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-600 font-medium">
              {t('admin.performance.table.quarter', '季度')}
            </label>
            <span className="text-base text-gray-900">
              {record.quarter ? `Q${record.quarter}` : t('performance.annual', '年度')}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-600 font-medium">
              {t('admin.performance.table.type', '类型')}
            </label>
            <span className="text-base text-gray-900">{getTypeLabel(record.type)}</span>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-600 font-medium">
              {t('admin.performance.table.submittedAt', '提交时间')}
            </label>
            <span className="text-base text-gray-900">{formatDate(record.submittedAt)}</span>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-600 font-medium">
              {t('admin.performance.detail.createdAt', '创建时间')}
            </label>
            <span className="text-base text-gray-900">{formatDate(record.createdAt)}</span>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-600 font-medium">
              {t('admin.performance.detail.updatedAt', '更新时间')}
            </label>
            <span className="text-base text-gray-900">{formatDate(record.updatedAt)}</span>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-600 font-medium">
              {t('admin.performance.statusLabel')}
            </label>
            <div className="flex items-center gap-2">
              <Badge variant={getStatusVariant(record.status)}>
                {getStatusLabel(record.status)}
              </Badge>

            </div>
          </div>
        </div>
      </Card>

      {/* 业绩数据卡片 */}
      <Card className="mb-6 p-6">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 m-0">
            {t('admin.performance.detail.performanceData', '业绩数据')}
          </h2>
        </div>
        <div className="space-y-4">
          {record.type === 'sales' && record.dataJson && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <label className="text-sm text-gray-600 font-medium block mb-2">
                  {t('admin.performance.detail.revenue', '营业收入')}
                </label>
                <span className="text-lg font-semibold text-gray-900">
                  {record.dataJson.revenue ? new Intl.NumberFormat(currentLanguage === 'zh' ? 'zh-CN' : 'ko-KR').format(record.dataJson.revenue) : '-'}
                </span>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <label className="text-sm text-gray-600 font-medium block mb-2">
                  {t('admin.performance.detail.employees', '员工数')}
                </label>
                <span className="text-lg font-semibold text-gray-900">
                  {record.dataJson.employees || '-'}
                </span>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <label className="text-sm text-gray-600 font-medium block mb-2">
                  {t('admin.performance.detail.newContracts', '新签合同数')}
                </label>
                <span className="text-lg font-semibold text-gray-900">
                  {record.dataJson.new_contracts || '-'}
                </span>
              </div>
            </div>
          )}
          {record.type === 'support' && record.dataJson && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <label className="text-sm text-gray-600 font-medium block mb-2">
                  {t('admin.performance.detail.supportAmount', '支持金额')}
                </label>
                <span className="text-lg font-semibold text-gray-900">
                  {record.dataJson.support_amount ? new Intl.NumberFormat(currentLanguage === 'zh' ? 'zh-CN' : 'ko-KR').format(record.dataJson.support_amount) : '-'}
                </span>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <label className="text-sm text-gray-600 font-medium block mb-2">
                  {t('admin.performance.detail.programs', '支持项目数')}
                </label>
                <span className="text-lg font-semibold text-gray-900">
                  {record.dataJson.programs || '-'}
                </span>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <label className="text-sm text-gray-600 font-medium block mb-2">
                  {t('admin.performance.detail.beneficiaries', '受益人数')}
                </label>
                <span className="text-lg font-semibold text-gray-900">
                  {record.dataJson.beneficiaries || '-'}
                </span>
              </div>
            </div>
          )}
          {record.type === 'ip' && record.dataJson && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <label className="text-sm text-gray-600 font-medium block mb-2">
                  {t('admin.performance.detail.patents', '专利数')}
                </label>
                <span className="text-lg font-semibold text-gray-900">
                  {record.dataJson.patents || '-'}
                </span>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <label className="text-sm text-gray-600 font-medium block mb-2">
                  {t('admin.performance.detail.trademarks', '商标数')}
                </label>
                <span className="text-lg font-semibold text-gray-900">
                  {record.dataJson.trademarks || '-'}
                </span>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <label className="text-sm text-gray-600 font-medium block mb-2">
                  {t('admin.performance.detail.copyrights', '著作权数')}
                </label>
                <span className="text-lg font-semibold text-gray-900">
                  {record.dataJson.copyrights || '-'}
                </span>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* 附件列表卡片 */}
      {attachments.length > 0 ? (
        <Card className="mb-6 p-6">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 m-0">
              {t('admin.performance.detail.attachments', '附件列表')}
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({attachments.length} {t('admin.performance.detail.attachmentCount', '个附件')})
              </span>
            </h2>
            {attachments.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadAll}
              >
                {t('admin.performance.detail.downloadAll', '下载全部')}
              </Button>
            )}
          </div>
          <div className="space-y-3">
            {attachments.map((attachment, index) => (
              <div 
                key={attachment.id || index}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  <svg 
                    className="w-5 h-5 text-gray-500 flex-shrink-0" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" 
                    />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-900 block truncate">
                      {attachment.name || `附件 ${index + 1}`}
                    </span>
                    {attachment.fileSize && (
                      <span className="text-xs text-gray-500">
                        {(attachment.fileSize / 1024).toFixed(2)} KB
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (attachment.id) {
                      // If we have file_url, use it directly
                      if (attachment.url) {
                        await handleDownloadByUrl(attachment.url, attachment.name);
                      } else {
                        // Otherwise try downloading by ID
                        await handleDownload(attachment.id, attachment.name);
                      }
                    } else if (attachment.url) {
                      await handleDownloadByUrl(attachment.url, attachment.name);
                    } else {
                      setMessageVariant('error');
                      setMessage(t('admin.performance.detail.fileNotFound', '文件不存在') || '文件不存在');
                      setTimeout(() => setMessage(null), 3000);
                    }
                  }}
                >
                  {t('common.download', '下载')}
                </Button>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card className="mb-6 p-6">
          <div className="text-center py-8 text-gray-500">
            <svg 
              className="w-12 h-12 mx-auto mb-4 text-gray-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" 
              />
            </svg>
            <p>{t('admin.performance.detail.noAttachments', '该记录没有附件')}</p>
          </div>
        </Card>
      )}

      {/* 审批历史卡片 */}
      {record.reviews && record.reviews.length > 0 && (
        <Card className="mb-6 p-6">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 m-0">
              {t('admin.performance.detail.reviewHistory', '审批历史')}
            </h2>
          </div>
          <div className="space-y-4">
            {record.reviews.map((review, index) => (
              <div 
                key={review.id || index}
                className="p-4 bg-gray-50 rounded-lg border-l-4"
                style={{
                  borderLeftColor: 
                    review.status === 'approved' ? '#10b981' :
                    review.status === 'rejected' ? '#ef4444' :
                    '#f59e0b'
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusVariant(review.status)}>
                      {getReviewStatusLabel(review.status)}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      {formatDate(review.reviewedAt)}
                    </span>
                  </div>
                </div>
                {review.comments && (
                  <div className="mt-3 p-3 bg-white rounded border border-gray-200">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {review.comments}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 补正请求模态框 */}
      <Modal
        isOpen={showReviewModal}
        onClose={() => {
          setShowReviewModal(false);
          setReviewComment('');
        }}
        title={t('admin.performance.revisionModal.title', '请求补正')}
      >
        <div className="flex flex-col gap-3 md:gap-4">
          <p>{t('admin.performance.revisionModal.description')}</p>
          <Textarea
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            placeholder={t('admin.performance.revisionModal.placeholder')}
            rows={5}
          />
          <div className="flex flex-col-reverse md:flex-row justify-end gap-3 md:gap-4 mt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowReviewModal(false);
                setReviewComment('');
              }}
              className="w-full md:w-auto"
            >
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleRequestRevision}
              className="w-full md:w-auto"
            >
              {t('admin.performance.requestRevision')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 驳回模态框 */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setRejectComment('');
        }}
        title={t('admin.performance.rejectModal.title', '驳回业绩记录')}
      >
        <div className="flex flex-col gap-3 md:gap-4">
          <p>{t('admin.performance.rejectModal.description', '请输入驳回原因。')}</p>
          <Textarea
            value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value)}
            placeholder={t('admin.performance.rejectModal.placeholder', '请输入驳回原因...')}
            rows={5}
          />
          <div className="flex flex-col-reverse md:flex-row justify-end gap-3 md:gap-4 mt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowRejectModal(false);
                setRejectComment('');
              }}
              className="w-full md:w-auto"
            >
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleReject}
              variant="outline"
              className="w-full md:w-auto border-red-600 text-red-600 hover:bg-red-50"
            >
              {t('admin.performance.reject', '驳回')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

