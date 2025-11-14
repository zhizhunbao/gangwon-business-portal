/**
 * CompanyStatus Component - 企业现状
 * 显示总企业会员数、销售合计、雇佣合计、知识产权合计等统计信息
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ReactECharts from 'echarts-for-react';

import { Card, Select, Loading } from '@shared/components';
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
      console.log('Company Status API response:', response);
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

  // 企业会员数趋势图表配置
  const getMembersChartOption = () => {
    if (!chartData.members || chartData.members.length === 0) {
      return {};
    }
    const periods = chartData.members.map(item => item.period);
    const values = chartData.members.map(item => item.value);

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'line'
        },
        formatter: (params) => {
          const param = params[0];
          return `${param.name}<br/>${param.seriesName}: ${param.value.toLocaleString()}`;
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: periods,
        axisLabel: {
          rotate: periods.length > 6 ? 45 : 0,
          interval: 0
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value) => value.toLocaleString()
        }
      },
      series: [
        {
          name: t('admin.dashboard.stats.totalMembers'),
          type: 'line',
          data: values,
          smooth: true,
          itemStyle: {
            color: '#3b82f6'
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
                { offset: 1, color: 'rgba(59, 130, 246, 0.05)' }
              ]
            }
          }
        }
      ]
    };
  };

  // 销售额及雇佣趋势图表配置
  const getSalesEmploymentChartOption = () => {
    if (!chartData.salesEmployment || chartData.salesEmployment.length === 0) {
      return {};
    }
    const periods = chartData.salesEmployment.map(item => item.period);
    const sales = chartData.salesEmployment.map(item => item.sales);
    const employment = chartData.salesEmployment.map(item => item.employment);

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        },
        formatter: (params) => {
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
        }
      },
      legend: {
        data: [
          t('admin.dashboard.stats.totalSales'),
          t('admin.dashboard.stats.totalEmployment')
        ],
        top: 10
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%', // 增加底部空间，避免标签被遮挡
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: true, // 改为true，让柱状图与坐标轴边界有间距
        data: periods,
        axisLabel: {
          rotate: periods.length > 6 ? 45 : 0,
          interval: 0,
          margin: 10 // 增加标签与坐标轴的距离
        }
      },
      yAxis: [
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
      ],
      series: [
        {
          name: t('admin.dashboard.stats.totalSales'),
          type: 'bar',
          yAxisIndex: 0,
          data: sales,
          barWidth: '40%', // 设置柱状图宽度为分类轴宽度的40%
          barCategoryGap: '20%', // 设置柱状图之间的间距
          itemStyle: {
            color: '#10b981'
          }
        },
        {
          name: t('admin.dashboard.stats.totalEmployment'),
          type: 'line',
          yAxisIndex: 1,
          data: employment,
          smooth: true,
          itemStyle: {
            color: '#f59e0b'
          }
        }
      ]
    };
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
              {chartData.members.length > 0 ? (
                <ReactECharts
                  key={`members-${selectedYear}-${selectedQuarter}`}
                  option={getMembersChartOption()}
                  style={{ height: '300px', width: '100%' }}
                  opts={{ renderer: 'svg' }}
                />
              ) : (
                <div className="chart-placeholder">
                  <p>{t('admin.dashboard.charts.noData')}</p>
                </div>
              )}
            </Card>

            <Card className="chart-card">
              <h2 className="chart-title">{t('admin.dashboard.charts.salesEmployment')}</h2>
              {chartData.salesEmployment.length > 0 ? (
                <ReactECharts
                  key={`sales-employment-${selectedYear}-${selectedQuarter}`}
                  option={getSalesEmploymentChartOption()}
                  style={{ height: '300px', width: '100%' }}
                  opts={{ renderer: 'svg' }}
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

