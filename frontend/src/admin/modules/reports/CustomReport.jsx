/**
 * Custom Report Component - Admin Portal
 * 自定义报表 - 支持自定义日期范围和筛选条件生成报表
 */

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Button, Select, Input, Alert } from '@shared/components';
import { adminService } from '@shared/services';

export default function CustomReport() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('comprehensive');
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    industry: '',
    region: '',
    year: '',
    quarter: 'all'
  });
  const [reportData, setReportData] = useState(null);
  const [message, setMessage] = useState(null);
  const [messageVariant, setMessageVariant] = useState('success');

  const handleFilterChange = useCallback((field) => (event) => {
    setFilters((prev) => ({
      ...prev,
      [field]: event.target.value
    }));
  }, []);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    
    // TODO: 实现自定义报表 API
    // const response = await adminService.generateCustomReport({
    //   reportType,
    //   ...filters
    // });
    // setReportData(response);
    
    setMessageVariant('info');
    setMessage(t('admin.reports.custom.comingSoon'));
    setLoading(false);
  }, [reportType, filters, t]);

  const handleReset = useCallback(() => {
    setFilters({
      startDate: '',
      endDate: '',
      industry: '',
      region: '',
      year: '',
      quarter: 'all'
    });
    setReportType('comprehensive');
    setReportData(null);
    setMessage(null);
  }, []);

  const reportTypeOptions = [
    { value: 'comprehensive', label: t('admin.reports.custom.types.comprehensive') },
    { value: 'enterprise', label: t('admin.reports.custom.types.enterprise') },
    { value: 'performance', label: t('admin.reports.custom.types.performance') }
  ];

  return (
    <div className="w-full">
      {message && (
        <Alert variant={messageVariant} className="mb-6">
          {message}
        </Alert>
      )}

      <Card className="mb-6">
        <div className="p-6">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('admin.reports.custom.reportType')}
              </label>
              <Select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                options={reportTypeOptions}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                type="date"
                label={t('admin.reports.custom.startDate')}
                value={filters.startDate}
                onChange={handleFilterChange('startDate')}
              />
              <Input
                type="date"
                label={t('admin.reports.custom.endDate')}
                value={filters.endDate}
                onChange={handleFilterChange('endDate')}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Select
                label={t('admin.reports.fields.industry')}
                value={filters.industry}
                onChange={handleFilterChange('industry')}
                placeholder={null}
                options={[{ value: '', label: t('common.all') }]}
              />
              <Select
                label={t('admin.reports.fields.region')}
                value={filters.region}
                onChange={handleFilterChange('region')}
                placeholder={null}
                options={[{ value: '', label: t('common.all') }]}
              />
              <Select
                label={t('admin.reports.fields.year')}
                value={filters.year}
                onChange={handleFilterChange('year')}
                placeholder={null}
                options={[{ value: '', label: t('common.all') }]}
              />
              <Select
                label={t('admin.reports.fields.quarter')}
                value={filters.quarter}
                onChange={handleFilterChange('quarter')}
                placeholder={null}
                options={[
                  { value: 'all', label: t('admin.reports.quarter.all') },
                  { value: 'Q1', label: t('admin.reports.quarter.Q1') },
                  { value: 'Q2', label: t('admin.reports.quarter.Q2') },
                  { value: 'Q3', label: t('admin.reports.quarter.Q3') },
                  { value: 'Q4', label: t('admin.reports.quarter.Q4') }
                ]}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button variant="secondary" onClick={handleReset}>
                {t('common.reset')}
              </Button>
              <Button onClick={handleGenerate} loading={loading}>
                {t('admin.reports.custom.generate')}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {reportData && (
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {t('admin.reports.custom.reportPreview')}
              </h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // TODO: 实现报表导出功能
                    setMessageVariant('info');
                    setMessage(t('admin.reports.custom.exportComingSoon', '导出功能即将推出'));
                    setTimeout(() => setMessage(null), 3000);
                  }}
                >
                  {t('admin.reports.custom.export', '导出')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setReportData(null)}
                >
                  {t('common.close', '关闭')}
                </Button>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <div className="text-center py-8">
                <div className="text-4xl mb-4">📊</div>
                <p className="text-gray-600 mb-2">
                  {t('admin.reports.custom.previewPlaceholder', '报表预览功能正在开发中')}
                </p>
                <p className="text-sm text-gray-500">
                  {t('admin.reports.custom.previewDescription', '报表数据已生成，预览功能即将推出')}
                </p>
                {reportData && typeof reportData === 'object' && (
                  <div className="mt-6 text-left bg-white rounded p-4 border border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      {t('admin.reports.custom.reportInfo', '报表信息')}:
                    </p>
                    <pre className="text-xs text-gray-600 overflow-auto">
                      {JSON.stringify(reportData, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

