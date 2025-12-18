/**
 * Report Templates Component - Admin Portal
 * 报表模板 - 预定义的报表模板，快速生成常用报表
 */

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Button, Alert } from '@shared/components';
import { adminService } from '@shared/services';

export default function ReportTemplates() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [messageVariant, setMessageVariant] = useState('success');

  const templates = [
    {
      id: 'monthly-summary',
      name: t('admin.reports.templates.monthlySummary'),
      description: t('admin.reports.templates.monthlySummaryDesc'),
      icon: '📊'
    },
    {
      id: 'quarterly-performance',
      name: t('admin.reports.templates.quarterlyPerformance'),
      description: t('admin.reports.templates.quarterlyPerformanceDesc'),
      icon: '📈'
    },
    {
      id: 'annual-report',
      name: t('admin.reports.templates.annualReport'),
      description: t('admin.reports.templates.annualReportDesc'),
      icon: '📑'
    },
    {
      id: 'industry-analysis',
      name: t('admin.reports.templates.industryAnalysis'),
      description: t('admin.reports.templates.industryAnalysisDesc'),
      icon: '🏭'
    }
  ];

  const handleGenerate = useCallback(async (templateId) => {
    setLoading(true);
    setMessage(null);
    
    // TODO: 实现报表模板生成 API
    // const response = await adminService.generateTemplateReport(templateId);
    // 下载或预览报表
    
    setMessageVariant('info');
    setMessage(t('admin.reports.templates.comingSoon'));
    setLoading(false);
  }, [t]);

  return (
    <div className="w-full">
      {message && (
        <Alert variant={messageVariant} className="mb-6">
          {message}
        </Alert>
      )}

      <Card>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((template) => (
              <Card key={template.id} className="p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="text-4xl">{template.icon}</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {template.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      {template.description}
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => handleGenerate(template.id)}
                      loading={loading}
                      className="w-full sm:w-auto"
                    >
                      {t('admin.reports.templates.generate')}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

