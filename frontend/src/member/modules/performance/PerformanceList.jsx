/**
 * Performance List Page - Member Portal
 * 绩效数据列表
 */

import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Card from '@shared/components/Card';
import Button from '@shared/components/Button';
import Input from '@shared/components/Input';
import Select from '@shared/components/Select';
import { apiService } from '@shared/services';
import { API_PREFIX } from '@shared/utils/constants';
import './Performance.css';

export default function PerformanceList() {
  const { t } = useTranslation();
  const [performances, setPerformances] = useState([]);
  const [filteredPerformances, setFilteredPerformances] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [quarterFilter, setQuarterFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPerformances();
  }, [statusFilter, yearFilter, quarterFilter]);

  const loadPerformances = async () => {
    setLoading(true);
    try {
      const params = {
        status: statusFilter !== 'all' ? statusFilter : undefined,
        year: yearFilter !== 'all' ? parseInt(yearFilter, 10) : undefined,
        quarter: quarterFilter !== 'all' ? (quarterFilter === 'annual' ? 'annual' : parseInt(quarterFilter, 10)) : undefined
      };
      const response = await apiService.get(`${API_PREFIX}/member/performance`, params);
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
        setFilteredPerformances(formatted);
      }
    } catch (error) {
      console.error('Failed to load performances:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Client-side search filter
    let filtered = [...performances];
    if (searchTerm) {
      filtered = filtered.filter(perf =>
        `${perf.year}년 ${perf.quarter ? `Q${perf.quarter}` : '연간'}`.includes(searchTerm)
      );
    }
    setFilteredPerformances(filtered);
  }, [searchTerm, performances]);

  const statusOptions = [
    { value: 'all', label: t('common.all') },
    { value: 'draft', label: t('performance.draft') },
    { value: 'submitted', label: t('performance.submitted') },
    { value: 'needSupplement', label: t('performance.needSupplement') },
    { value: 'approved', label: t('performance.approved') }
  ];

  // 生成年份选项（最近5年）
  const currentYear = new Date().getFullYear();
  const yearOptions = [
    { value: 'all', label: t('common.all') },
    ...Array.from({ length: 5 }, (_, i) => {
      const year = currentYear - i;
      return { value: year.toString(), label: year.toString() };
    })
  ];

  const quarterOptions = [
    { value: 'all', label: t('common.all') },
    { value: '1', label: t('performance.quarter1') },
    { value: '2', label: t('performance.quarter2') },
    { value: '3', label: t('performance.quarter3') },
    { value: '4', label: t('performance.quarter4') },
    { value: 'annual', label: t('performance.annual') }
  ];

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
    <div className="performance-list">
      <div className="page-header">
        <h1>{t('performance.title')}</h1>
        <div className="header-actions">
          <Link to="/member/performance/new">
            <Button variant="primary">
              + {t('performance.createNew')}
            </Button>
          </Link>
        </div>
      </div>

      {/* 搜索和过滤 */}
      <Card className="filter-card">
        <div className="filter-row">
          <div className="search-box">
            <Input
              type="search"
              placeholder={t('performance.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="filter-group">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={statusOptions}
            />
            
            <Select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              options={yearOptions}
            />
            
            <Select
              value={quarterFilter}
              onChange={(e) => setQuarterFilter(e.target.value)}
              options={quarterOptions}
            />
          </div>
        </div>
      </Card>

      {/* 绩效列表 */}
      <div className="performances-container">
        <div className="results-info">
          <p>{t('performance.resultsCount', { count: filteredPerformances.length })}</p>
        </div>

        {filteredPerformances.length === 0 ? (
          <Card>
            <div className="no-data">
              <p>{t('common.noData')}</p>
            </div>
          </Card>
        ) : (
          <div className="performances-list">
            {filteredPerformances.map((perf) => (
              <Card key={perf.id} className="performance-card">
                <div className="performance-header">
                  <div className="performance-title-section">
                    <h3>
                      {perf.year}{t('common.year')} {perf.quarter ? `Q${perf.quarter}` : t('performance.annual')}
                    </h3>
                    <span className={getStatusBadgeClass(perf.status)}>
                      {t(`performance.status.${perf.status}`)}
                    </span>
                  </div>
                  <div className="performance-meta">
                    {perf.submittedDate && (
                      <span>{t('performance.submittedDate')}: {perf.submittedDate}</span>
                    )}
                    {perf.approvedDate && (
                      <span>{t('performance.approvedDate')}: {perf.approvedDate}</span>
                    )}
                  </div>
                </div>

                <div className="performance-body">
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
                </div>

                <div className="performance-footer">
                  <Link to={`/member/performance/${perf.id}`}>
                    <Button variant="secondary">
                      {t('common.details')}
                    </Button>
                  </Link>
                  
                  {perf.status === 'draft' && (
                    <Link to={`/member/performance/${perf.id}/edit`}>
                      <Button variant="primary">
                        {t('common.edit')}
                      </Button>
                    </Link>
                  )}
                  
                  {perf.status === 'needSupplement' && (
                    <Link to={`/member/performance/${perf.id}/edit`}>
                      <Button variant="warning">
                        {t('performance.supplement')}
                      </Button>
                    </Link>
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

