/**
 * Performance List Content - Member Portal
 * 绩效数据列表内容组件
 */

import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import Card from '@shared/components/Card';
import Button from '@shared/components/Button';
import { apiService } from '@shared/services';
import { API_PREFIX } from '@shared/utils/constants';
import './Performance.css';

export default function PerformanceListContent() {
  const { t } = useTranslation();
  const [performances, setPerformances] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPerformances();
  }, []);

  const loadPerformances = async () => {
    setLoading(true);
    try {
      const response = await apiService.get(`${API_PREFIX}/member/performance`);
      if (response.records) {
        const formatted = response.records.map(r => ({
          id: r.id,
          year: r.year,
          quarter: r.quarter,
          type: r.quarter ? 'quarterly' : 'annual',
          status: r.status,
          submittedDate: r.submittedAt ? new Date(r.submittedAt).toISOString().split('T')[0] : null,
          approvedDate: r.reviewedAt ? new Date(r.reviewedAt).toISOString().split('T')[0] : null,
          sales: r.salesRevenue || 0,
          employment: r.employeeCount || 0,
          governmentSupport: r.governmentSupport?.reduce((sum, g) => sum + (g.amount || 0), 0) || 0,
          intellectualProperty: r.intellectualProperty?.length || 0
        }));
        setPerformances(formatted);
      }
    } catch (error) {
      console.error('Failed to load performances:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    const classes = {
      draft: 'badge-secondary',
      submitted: 'badge-info',
      needSupplement: 'badge-warning',
      approved: 'badge-success'
    };
    return `badge ${classes[status] || ''}`;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="performance-list-content">
      <div className="page-header">
        <h1>{t('performance.title', '绩效管理')}</h1>
        <div className="header-actions">
          <a
            href="#new"
            onClick={(e) => {
              e.preventDefault();
              window.location.hash = 'new';
              window.dispatchEvent(new HashChangeEvent('hashchange'));
            }}
          >
            <Button variant="primary">
              + {t('performance.createNew')}
            </Button>
          </a>
        </div>
      </div>

      {/* 绩效列表 */}
      <div className="performances-container">
        <div className="results-info">
          <p>{t('performance.resultsCount', { count: performances.length })}</p>
        </div>

        {performances.length === 0 ? (
          <Card>
            <div className="no-data">
              <p>{t('common.noData')}</p>
            </div>
          </Card>
        ) : (
          <div className="performances-list">
            {performances.map((perf) => (
              <Card key={perf.id} className="ac-card performance-card">
                <div 
                  className="ac-card-img" 
                  style={{ 
                    backgroundImage: `url('/uploads/banners/performance.png')` 
                  }}
                />
                <div className="ac-card-body">
                  <div className="performance-header">
                    <h2>
                      {perf.year}{t('common.year')} {perf.quarter ? `Q${perf.quarter}` : t('performance.annual')}
                    </h2>
                    <span className={getStatusBadgeClass(perf.status)}>
                      {t(`performance.status.${perf.status}`)}
                    </span>
                  </div>
                  <div className="performance-stats">
                    <div className="stat-item">
                      <span className="stat-label">{t('performance.sales')}:</span>
                      <span className="stat-value">{formatCurrency(perf.sales)}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">{t('performance.employment')}:</span>
                      <span className="stat-value">{perf.employment}{t('performance.people')}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">{t('performance.governmentSupport')}:</span>
                      <span className="stat-value">{formatCurrency(perf.governmentSupport)}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">{t('performance.intellectualProperty')}:</span>
                      <span className="stat-value">{perf.intellectualProperty}{t('performance.items')}</span>
                    </div>
                  </div>
                  {perf.submittedDate && (
                    <div className="performance-meta" style={{ marginBottom: '1.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                      {t('performance.submittedDate')}: {perf.submittedDate}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

