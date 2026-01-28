/**
 * Intellectual Property Tab Component
 * 知识产权标签页内容
 */

import { useTranslation } from 'react-i18next';
import { Button } from '@shared/components';
import { useDateFormatter } from '@shared/hooks';

export default function IntellectualPropertyTab({ record, onDownload, onDownloadByUrl }) {
  const { t } = useTranslation();
  const { formatDate, formatValue } = useDateFormatter();

  if (!record?.dataJson?.intellectualProperty || record.dataJson.intellectualProperty.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        {t('common.noData', '데이터가 없습니다')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {record.dataJson.intellectualProperty.map((item, index) => (
        <div key={index} className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-600 mb-4">#{index + 1}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-600 font-medium">
                {t('performance.intellectualPropertyFields.name', '지식재산권명')}
              </label>
              <span className="text-base text-gray-900">{formatValue(item.name)}</span>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-600 font-medium">
                {t('performance.intellectualPropertyFields.number', '지식재산권번호')}
              </label>
              <span className="text-base text-gray-900">{formatValue(item.number)}</span>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-600 font-medium">
                {t('performance.intellectualPropertyFields.type', '지식재산권 구분')}
              </label>
              <span className="text-base text-gray-900">{formatValue(item.type)}</span>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-600 font-medium">
                {t('performance.intellectualPropertyFields.registrationType', '지식재산권 등록 구분')}
              </label>
              <span className="text-base text-gray-900">{formatValue(item.registrationType)}</span>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-600 font-medium">
                {t('performance.intellectualPropertyFields.country', '등록 국가')}
              </label>
              <span className="text-base text-gray-900">{item.country || '-'}</span>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-600 font-medium">
                {t('performance.intellectualPropertyFields.overseasType', '해외 신청 구분')}
              </label>
              <span className="text-base text-gray-900">{item.overseasType || '-'}</span>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-600 font-medium">
                {t('performance.intellectualPropertyFields.registrationDate', '등록일')}
              </label>
              <span className="text-base text-gray-900">{formatDate(item.registrationDate)}</span>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-600 font-medium">
                {t('performance.intellectualPropertyFields.publicDisclosure', '공개 희망 여부')}
              </label>
              <span className="text-base text-gray-900">
                {item.publicDisclosure ? t('common.yes', '예')) : t('common.no', '아니오'))}
              </span>
            </div>
          </div>
          {item.attachments && item.attachments.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('performance.intellectualPropertyFields.proofDocument', '증빙서류')}
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
