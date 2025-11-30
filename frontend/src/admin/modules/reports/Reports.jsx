/**
 * Reports Component - Admin Portal
 * 统计报表
 */

import { useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Select, Input, Button, Table, Badge, Alert } from '@shared/components';
import { apiService } from '@shared/services';
import { API_PREFIX } from '@shared/utils/constants';
import './Reports.css';

export default function Reports() {
  const { t, i18n } = useTranslation();
  const [filters, setFilters] = useState({
    companyName: '',
    businessNumber: '',
    industry: '',
    region: '',
    year: '',
    quarter: 'all'
  });
  const [results, setResults] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [dnbData, setDnbData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingDnb, setLoadingDnb] = useState(false);
  const [message, setMessage] = useState(null);
  const [messageVariant, setMessageVariant] = useState('success');

  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(() => (
    Array.from({ length: 5 }, (_, i) => {
      const year = String(currentYear - i);
      return { value: year, label: year };
    })
  ), [currentYear]);

  const quarterOptions = useMemo(() => ([
    { value: 'all', label: t('admin.reports.quarter.all') },
    { value: 'Q1', label: t('admin.reports.quarter.Q1') },
    { value: 'Q2', label: t('admin.reports.quarter.Q2') },
    { value: 'Q3', label: t('admin.reports.quarter.Q3') },
    { value: 'Q4', label: t('admin.reports.quarter.Q4') }
  ]), [t]);

  const numberFormatter = useMemo(() => (
    new Intl.NumberFormat(i18n.language === 'zh' ? 'zh-CN' : 'ko-KR')
  ), [i18n.language]);

  const handleFilterChange = useCallback((field) => (event) => {
    setFilters((prev) => ({
      ...prev,
      [field]: event.target.value
    }));
  }, []);

  const handleSearch = useCallback(async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const response = await apiService.post(`${API_PREFIX}/admin/company/search`, filters);
      setResults(response.results || []);
      setMessageVariant('success');
      setMessage(t('admin.reports.messages.searchSuccess', { count: response.total || 0 }));
      setSelectedCompany(null);
      setDnbData(null);
    } catch (error) {
      console.error('Failed to search companies', error);
      setMessageVariant('error');
      setMessage(t('admin.reports.messages.searchFailed'));
    } finally {
      setLoading(false);
    }
  }, [filters, t]);

  const handleReset = useCallback(() => {
    setFilters({
      companyName: '',
      businessNumber: '',
      industry: '',
      region: '',
      year: '',
      quarter: 'all'
    });
    setResults([]);
    setSelectedCompany(null);
    setDnbData(null);
    setMessage(null);
  }, []);

  /**
   * Fetch Nice D&B company analysis data
   * @param {string} businessNumber - Business registration number
   */
  const fetchNiceDnb = useCallback(async (businessNumber) => {
    if (!businessNumber) {
      setMessageVariant('error');
      setMessage(t('admin.reports.messages.dnbNoBusinessNumber'));
      return;
    }
    
    setLoadingDnb(true);
    setMessage(null); // Clear previous messages
    
    try {
      const response = await apiService.get(`${API_PREFIX}/admin/members/nice-dnb`, {
        params: { business_number: businessNumber }
      });
      
      if (response && response.data) {
        setDnbData(response);
        setMessageVariant('success');
        setMessage(t('admin.reports.messages.dnbSuccess'));
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Failed to load Nice D&B data', error);
      setMessageVariant('error');
      const errorMessage = error.response?.data?.message || error.message;
      setMessage(t('admin.reports.messages.dnbFailed', { error: errorMessage }));
      setDnbData(null);
    } finally {
      setLoadingDnb(false);
    }
  }, [t]);

  /**
   * Handle row click in the results table
   * When a company is selected, fetch its Nice D&B data if business number is available
   */
  const handleRowClick = useCallback((row) => {
    setSelectedCompany(row);
    setDnbData(null); // Reset DNB data when selecting new company
    if (row.businessNumber) {
      fetchNiceDnb(row.businessNumber);
    }
  }, [fetchNiceDnb]);

  /**
   * Table columns configuration
   * Includes custom renderers for formatted values (revenue, employees, status)
   * 使用 useMemo 缓存，避免每次渲染都重新创建
   */
  const columns = useMemo(() => [
    { key: 'companyName', label: t('admin.reports.table.companyName') },
    { key: 'businessNumber', label: t('admin.reports.table.businessNumber') },
    { key: 'industry', label: t('admin.reports.table.industry') },
    { key: 'region', label: t('admin.reports.table.region') },
    {
      key: 'revenue',
      label: t('admin.reports.table.revenue'),
      render: (value) => value ? `${numberFormatter.format(value)} KRW` : '-'
    },
    {
      key: 'employees',
      label: t('admin.reports.table.employees'),
      render: (value) => value ? numberFormatter.format(value) : '-'
    },
    {
      key: 'status',
      label: t('admin.reports.table.status'),
      render: (value) => (
        <Badge variant={value === 'approved' ? 'success' : 'secondary'}>
          {t(`admin.reports.status.${value || 'pending'}`)}
        </Badge>
      )
    }
  ], [t, numberFormatter]);

  return (
    <div className="admin-reports">
      <div className="page-header">
        <h1 className="page-title">{t('admin.reports.title')}</h1>
      </div>

      <Card className="reports-card">
        <form className="reports-search-form" onSubmit={handleSearch}>
          <div className="reports-form-header">
            <div>
              <h2>{t('admin.reports.search.title')}</h2>
              <p>{t('admin.reports.search.description')}</p>
            </div>
            <div className="reports-form-actions">
              <Button type="button" variant="secondary" onClick={handleReset}>
                {t('common.reset', '重置')}
              </Button>
              <Button type="submit" loading={loading}>
                {t('common.search', '搜索')}
              </Button>
            </div>
          </div>
          <div className="filters-grid">
            <Input
              label={t('admin.reports.fields.companyName')}
              value={filters.companyName}
              onChange={handleFilterChange('companyName')}
            />
            <Input
              label={t('admin.reports.fields.businessNumber')}
              value={filters.businessNumber}
              onChange={handleFilterChange('businessNumber')}
            />
            <Input
              label={t('admin.reports.fields.industry')}
              value={filters.industry}
              onChange={handleFilterChange('industry')}
            />
            <Input
              label={t('admin.reports.fields.region')}
              value={filters.region}
              onChange={handleFilterChange('region')}
            />
            <Select
              label={t('admin.reports.fields.year')}
              value={filters.year}
              onChange={handleFilterChange('year')}
              options={[{ value: '', label: t('common.all', '全部') }, ...yearOptions]}
            />
            <Select
              label={t('admin.reports.fields.quarter')}
              value={filters.quarter}
              onChange={handleFilterChange('quarter')}
              options={quarterOptions}
            />
          </div>
        </form>
      </Card>

      {message && (
        <Alert variant={messageVariant} className="reports-alert">
          {message}
        </Alert>
      )}

      <Card className="reports-card">
        {loading ? (
          <div className="reports-placeholder">
            <p>{t('common.loading', '검색 중...')}</p>
          </div>
        ) : results.length === 0 ? (
          <div className="reports-placeholder">
            <p>{t('admin.reports.placeholder')}</p>
          </div>
        ) : (
          <>
            <div className="reports-table-header">
              <p className="reports-table-count">
                {t('admin.reports.table.count', '총 {{count}}건', { count: results.length })}
              </p>
            </div>
            <Table
              columns={columns}
              data={results}
              onRowClick={handleRowClick}
            />
          </>
        )}
      </Card>

      {selectedCompany && (
        <Card className="reports-card">
          <div className="reports-detail-header">
            <div>
              <h3>{selectedCompany.companyName}</h3>
              <p>{selectedCompany.businessNumber}</p>
            </div>
            <Badge variant={selectedCompany.status === 'approved' ? 'success' : 'secondary'}>
              {t(`admin.reports.status.${selectedCompany.status || 'pending'}`)}
            </Badge>
          </div>
          <div className="reports-detail-grid">
            <div>
              <span>{t('admin.reports.table.industry')}</span>
              <strong>{selectedCompany.industry || '-'}</strong>
            </div>
            <div>
              <span>{t('admin.reports.table.region')}</span>
              <strong>{selectedCompany.region || '-'}</strong>
            </div>
            <div>
              <span>{t('admin.reports.table.revenue')}</span>
              <strong>{selectedCompany.revenue ? `${numberFormatter.format(selectedCompany.revenue)} KRW` : '-'}</strong>
            </div>
            <div>
              <span>{t('admin.reports.table.employees')}</span>
              <strong>{selectedCompany.employees ? numberFormatter.format(selectedCompany.employees) : '-'}</strong>
            </div>
          </div>

          <div className="reports-dnb-section">
            <div className="reports-dnb-header">
              <h4>{t('admin.reports.detail.niceTitle')}</h4>
              {loadingDnb && (
                <span className="reports-dnb-loading">
                  {t('common.loading', '加载中...')}
                </span>
              )}
            </div>
            
            {loadingDnb ? (
              <div className="reports-placeholder">
                <p>{t('admin.reports.detail.loadingDnb', 'Nice D&B 데이터를 불러오는 중...')}</p>
              </div>
            ) : dnbData ? (
              <>
                <div className="reports-detail-grid">
                  <div>
                    <span>{t('admin.reports.detail.creditGrade')}</span>
                    <strong>{dnbData.data?.creditGrade || '-'}</strong>
                  </div>
                  <div>
                    <span>{t('admin.reports.detail.riskLevel')}</span>
                    <strong>
                      {dnbData.data?.riskLevel 
                        ? t(`admin.reports.riskLevel.${dnbData.data.riskLevel}`, dnbData.data.riskLevel)
                        : '-'}
                    </strong>
                  </div>
                  <div>
                    <span>{t('admin.reports.detail.summary')}</span>
                    <strong>{dnbData.data?.summary || '-'}</strong>
                  </div>
                </div>
                
                {dnbData.financials && dnbData.financials.length > 0 && (
                  <div className="reports-financials">
                    <h5 className="reports-financials-title">
                      {t('admin.reports.detail.financialHistory', '재무 이력')}
                    </h5>
                    {dnbData.financials.map((item) => (
                      <div key={item.year} className="reports-financial-card">
                        <h5>{item.year} {t('admin.reports.detail.year', '년')}</h5>
                        <p>
                          <span>{t('admin.reports.detail.revenue')}:</span>
                          <strong>{numberFormatter.format(item.revenue || 0)} KRW</strong>
                        </p>
                        <p>
                          <span>{t('admin.reports.detail.profit')}:</span>
                          <strong>{numberFormatter.format(item.profit || 0)} KRW</strong>
                        </p>
                        <p>
                          <span>{t('admin.reports.table.employees')}:</span>
                          <strong>{numberFormatter.format(item.employees || 0)}</strong>
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                
                {dnbData.insights && dnbData.insights.length > 0 && (
                  <div className="reports-insights">
                    <h5 className="reports-insights-title">
                      {t('admin.reports.detail.insights', '기업 인사이트')}
                    </h5>
                    <div className="reports-insights-grid">
                      {dnbData.insights.map((insight, index) => (
                        <div key={index} className="reports-insight-card">
                          <span className="reports-insight-label">{insight.label}</span>
                          <strong className="reports-insight-value">{insight.value}</strong>
                          {insight.trend && (
                            <span className={`reports-insight-trend reports-insight-trend-${insight.trend}`}>
                              {insight.trend === 'up' ? '↑' : insight.trend === 'down' ? '↓' : '→'}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="reports-placeholder">
                {t('admin.reports.detail.selectHint')}
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

