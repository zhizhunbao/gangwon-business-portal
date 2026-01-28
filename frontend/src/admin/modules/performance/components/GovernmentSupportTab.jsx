/**
 * Government Support Tab Component
 * 政府支持受惠历史标签页内容
 */

import { useTranslation } from 'react-i18next';
import { Button } from '@shared/components';
import { useDateFormatter } from '@shared/hooks';

export default function GovernmentSupportTab({ record, currentLanguage, onDownload, onDownloadByUrl }) {
  const { t } = useTranslation();
  const { formatDate, formatNumber, formatValue } = useDateFormatter();

  if (!record?.dataJson?.governmentSupport || record.dataJson.governmentSupport.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        {t('common.noData', '데이터가 없습니다')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {record.dataJson.governmentSupport.map((item, index) => (
        <div key={index} className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-600 mb-4">#{index + 1}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-600 font-medium">
                {t('performance.governmentSupportFields.projectName', '실행 지원사업명')}
              </label>
              <span className="text-base text-gray-900">{item.projectName || '-'}</span>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-600 font-medium">
                {t('performance.governmentSupportFields.startupProjectName', '창업 지원사업명')}
              </label>
              <span className="text-base text-gray-900">{item.startupProjectName || '-'}</span>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-600 font-medium">
                {t('performance.governmentSupportFields.supportOrganization', '지원 기관명')}
              </label>
              <span className="text-base text-gray-900">{item.supportOrganization || '-'}</span>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-600 font-medium">
                {t('performance.governmentSupportFields.supportAmount', '지원 금액')}
              </label>
              <span className="text-base text-gray-900">
                {formatNumber(item.supportAmount)}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-600 font-medium">
                {t('performance.governmentSupportFields.startDate', '시작일')}
              </label>
              <span className="text-base text-gray-900">{formatDate(item.startDate)}</span>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-600 font-medium">
                {t('performance.governmentSupportFields.endDate', '종료일')}
              </label>
              <span className="text-base text-gray-900">{formatDate(item.endDate)}</span>
            </div>
          </div>
          {item.attachments && item.attachments.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('performance.governmentSupportFields.proofDocument', '증빙서류')}
              </label>
              <div className="space-y-2">
                {item.attachments.map((attachment, attachmentIndex) => (
                  <div key={attachmentIndex} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm text-gray-700">{attachment.fileName || t('common.document', '증명문서')}</span>
                      {attachment.fileSize && (
                        <span className="text-xs text-gray-500">
                          ({(attachment.fileSize / 1024).toFixed(1)} KB)
                        </span>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (attachment.fileUrl) {
                          onDownloadByUrl(attachment.fileUrl, attachment.fileName);
                        } else if (attachment.fileId) {
                          onDownload(attachment.fileId, attachment.fileName);
                        }
                      }}
                    >
                      {t('common.download', '다운로드')}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
