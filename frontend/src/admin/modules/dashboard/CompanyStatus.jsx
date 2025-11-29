/**
 * CompanyStatus Component - 企业现状
 * 显示总企业会员数、销售合计、雇佣合计、知识产权合计等统计信息
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { Card, Select, Loading, MemberGrowthChart, MixedChart } from '@shared/components';
import { BuildingIcon, CurrencyDollarIcon, UsersIcon, DocumentIcon } from '@shared/components/Icons';
import { apiService } from '@shared/services';
import { API_PREFIX } from '@shared/utils/constants';
import { formatCurrencyCompact } from '@shared/utils/format';

import './Dashboard.css';

export default function CompanyStatus() {
  const { t, i18n } = useTranslation();
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedQuarter, setSelectedQuarter] = useState('all');
  const [loading, setLoading] = useState(false);
  const currentLanguage = i18n.language || 'ko';
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalSales: 0,
    totalEmployment: 0,
    totalIntellectualProperty: 0
  });
  const [chartData, setChartData] = useState({
    members: [],
    salesEmployment: []
  });

  useEffect(() => {
    loadDashboardStats();
  }, [selectedYear, selectedQuarter]);

  const loadDashboardStats = async () => {
    setLoading(true);
    try {
      const params = {
        year: selectedYear === 'all' ? 'all' : selectedYear,
        // 当选择 'all' 时，传递 'all' 明确表示显示该年度的全部季度
        quarter: selectedQuarter
      };
      const response = await apiService.get(`${API_PREFIX}/admin/dashboard/stats`, params);
      if (response && response.stats) {
        setStats(response.stats);
        // 设置图表数据
        if (response.chartData) {
          setChartData({
            members: response.chartData.members || [],
            salesEmployment: response.chartData.salesEmployment || []
          });
        } else {
          setChartData({ members: [], salesEmployment: [] });
        }
      } else {
        console.warn('Company Status response missing stats:', response);
        setStats({
          totalMembers: 0,
          totalSales: 0,
          totalEmployment: 0,
          totalIntellectualProperty: 0
        });
        setChartData({ members: [], salesEmployment: [] });
      }
    } catch (error) {
      console.error('Failed to load company status stats:', error);
      setStats({
        totalMembers: 0,
        totalSales: 0,
        totalEmployment: 0,
        totalIntellectualProperty: 0
      });
      setChartData({ members: [], salesEmployment: [] });
    } finally {
      setLoading(false);
    }
  };

  // 准备会员增长图表数据
  const membersChartData = chartData.members || [];

  // 准备销售额和雇佣趋势图表数据
  const salesEmploymentData = chartData.salesEmployment || [];
  
  // 销售额和雇佣趋势图表的格式化函数
  const salesEmploymentFormatter = (params) => {
    let result = `${params[0].name}<br/>`;
    params.forEach(param => {
      if (param.seriesName === t('admin.dashboard.stats.totalSales')) {
        const formatted = formatCurrencyCompact(param.value, { 
          language: currentLanguage,
          showCurrency: true 
        });
        result += `${param.seriesName}: ${formatted}<br/>`;
      } else {
        result += `${param.seriesName}: ${param.value.toLocaleString()}<br/>`;
      }
    });
    return result;
  };

  // 生成年份选项（全部 + 最近5年）
  const currentYear = new Date().getFullYear();
  const yearOptions = [
    { value: 'all', label: t('admin.dashboard.quarter.all') },
    ...Array.from({ length: 5 }, (_, i) => ({
      value: currentYear - i,
      label: String(currentYear - i)
    }))
  ];

  return (
    <div className="company-status">
      <div className="dashboard-header">
        <h2 className="page-title">{t('admin.dashboard.companyStatus.title')}</h2>
        <div className="header-actions">
          <Select
            inline
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            options={yearOptions}
            placeholder={null}
          />
          <Select
            inline
            value={selectedQuarter}
            onChange={(e) => setSelectedQuarter(e.target.value)}
            options={[
              { value: 'all', label: t('admin.dashboard.quarter.all') },
              { value: 'Q1', label: t('admin.dashboard.quarter.Q1') },
              { value: 'Q2', label: t('admin.dashboard.quarter.Q2') },
              { value: 'Q3', label: t('admin.dashboard.quarter.Q3') },
              { value: 'Q4', label: t('admin.dashboard.quarter.Q4') }
            ]}
            placeholder={null}
          />
        </div>
      </div>

      {loading ? (
        <Loading />
      ) : (
        <>
          {/* 统计卡片 */}
          <div className="stats-grid">
            <Card className="stat-card">
              <div className="stat-icon">
                <BuildingIcon className="w-8 h-8" />
              </div>
              <div className="stat-content">
                <h3 className="stat-label">{t('admin.dashboard.stats.totalMembers')}</h3>
                <p className="stat-value">{stats.totalMembers.toLocaleString()}</p>
              </div>
            </Card>

            <Card className="stat-card">
              <div className="stat-icon">
                <CurrencyDollarIcon className="w-8 h-8" />
              </div>
              <div className="stat-content">
                <h3 className="stat-label">
                  {t('admin.dashboard.stats.totalSales')} 
                  <span className="stat-unit">
                    {' '}({currentLanguage === 'ko' ? '단위' : '单位'}: {currentLanguage === 'ko' ? '만원' : '万元'})
                  </span>
                </h3>
                <p className="stat-value">
                  {formatCurrencyCompact(stats.totalSales, { 
                    language: currentLanguage,
                    showCurrency: false,
                    showUnitLabel: false
                  })}
                </p>
              </div>
            </Card>

            <Card className="stat-card">
              <div className="stat-icon">
                <UsersIcon className="w-8 h-8" />
              </div>
              <div className="stat-content">
                <h3 className="stat-label">{t('admin.dashboard.stats.totalEmployment')}</h3>
                <p className="stat-value">{stats.totalEmployment.toLocaleString()}</p>
              </div>
            </Card>

            <Card className="stat-card">
              <div className="stat-icon">
                <DocumentIcon className="w-8 h-8" />
              </div>
              <div className="stat-content">
                <h3 className="stat-label">{t('admin.dashboard.stats.totalIP')}</h3>
                <p className="stat-value">{stats.totalIntellectualProperty.toLocaleString()}</p>
              </div>
            </Card>
          </div>

          {/* 图表区域 */}
          <div className="charts-section">
            <Card className="chart-card">
              <h2 className="chart-title">{t('admin.dashboard.charts.members')}</h2>
              <MemberGrowthChart
                key={`members-${selectedYear}-${selectedQuarter}`}
                data={membersChartData}
                height="300px"
              />
            </Card>

            <Card className="chart-card">
              <h2 className="chart-title">{t('admin.dashboard.charts.salesEmployment')}</h2>
              {salesEmploymentData.length > 0 ? (
                <MixedChart
                  key={`sales-employment-${selectedYear}-${selectedQuarter}`}
                  categories={salesEmploymentData.map(item => item.period)}
                  series={[
                    {
                      name: t('admin.dashboard.stats.totalSales'),
                      type: 'bar',
                      data: salesEmploymentData.map(item => item.sales),
                      color: '#10b981',
                      yAxisIndex: 0,
                      barWidth: '40%'
                    },
                    {
                      name: t('admin.dashboard.stats.totalEmployment'),
                      type: 'line',
                      data: salesEmploymentData.map(item => item.employment),
                      color: '#f59e0b',
                      yAxisIndex: 1,
                      smooth: true
                    }
                  ]}
                  height="300px"
                  formatter={salesEmploymentFormatter}
                  yAxis={[
                    {
                      type: 'value',
                      name: t('admin.dashboard.stats.totalSales'),
                      position: 'left',
                      axisLabel: {
                        formatter: (value) => {
                          return formatCurrencyCompact(value, { 
                            language: currentLanguage,
                            showCurrency: false 
                          });
                        }
                      }
                    },
                    {
                      type: 'value',
                      name: t('admin.dashboard.stats.totalEmployment'),
                      position: 'right',
                      axisLabel: {
                        formatter: (value) => value.toLocaleString()
                      }
                    }
                  ]}
                />
              ) : (
                <div className="chart-placeholder">
                  <p>{t('admin.dashboard.charts.noData')}</p>
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

