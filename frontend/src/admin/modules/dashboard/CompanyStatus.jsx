/**
 * CompanyStatus Component - 企业现状
 * 显示总企业会员数、销售合计、雇佣合计、知识产权合计等统计信息
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { Card, Select, Loading, MemberGrowthChart, MixedChart, Button } from '@shared/components';
import { BuildingIcon, CurrencyDollarIcon, UsersIcon, DocumentIcon } from '@shared/components/Icons';
import { apiService, adminService } from '@shared/services';
import { API_PREFIX } from '@shared/utils/constants';
import { formatCurrencyCompact } from '@shared/utils';
import { useDateFormatter } from '@shared/hooks';

export default function CompanyStatus() {
  const { t, i18n } = useTranslation();
  const { formatDateTime, formatDate, formatNumber, formatValue } = useDateFormatter();
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
      setStats({
        totalMembers: 0,
        totalSales: 0,
        totalEmployment: 0,
        totalIntellectualProperty: 0
      });
      setChartData({ members: [], salesEmployment: [] });
    }
    setLoading(false);
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
        result += `${param.seriesName}: ${formatNumber(param.value)}<br/>`;
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

  const handleExport = async (format = 'excel') => {
    setLoading(true);
    const params = {
      format,
      year: selectedYear === 'all' ? 'all' : selectedYear,
      quarter: selectedQuarter
    };
    
    // 使用 adminService.exportDashboard，装饰器会自动处理日志记录
    await adminService.exportDashboard(params);
    setLoading(false);
  };

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">{t('admin.dashboard.companyStatus.title', '기업 현황')}</h1>
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                {t('admin.dashboard.filter.year', '연도')}:
              </label>
              <Select
                inline
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                options={yearOptions}
                placeholder={null}
                className="w-32 text-base"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                {t('admin.dashboard.filter.quarter', '분기')}:
              </label>
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
                className="w-28 text-base"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2 ml-4">
            <Button 
              onClick={() => handleExport('excel')} 
              variant="outline"
              disabled={loading}
            >
              {t('admin.dashboard.companyStatus.export', 'Excel 내보내기')}
            </Button>
            <Button 
              onClick={() => handleExport('csv')} 
              variant="outline"
              disabled={loading}
            >
              {t('admin.dashboard.exportCsv', 'CSV 내보내기')}
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <Loading />
      ) : (
        <>
          {/* 统计卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="flex items-center gap-6 p-6 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] relative overflow-hidden hover:-translate-y-1 hover:shadow-lg hover:border-gray-300 before:content-[''] before:absolute before:top-0 before:left-0 before:w-1 before:h-full before:bg-gradient-to-b before:from-blue-500 before:to-blue-600 before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100 md:p-4 md:flex-col md:items-start md:gap-4">
              <div className="w-16 h-16 flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white text-[28px] flex-shrink-0 shadow-[0_4px_6px_-1px_rgba(59,130,246,0.3)] md:w-12 md:h-12 md:text-2xl">
                <BuildingIcon className="w-8 h-8 text-white md:w-6 md:h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm text-gray-500 m-0 mb-2 font-medium uppercase tracking-wide flex items-center flex-wrap gap-1 md:text-xs">{t('admin.dashboard.stats.totalMembers')}</h3>
                <p className="text-[30px] font-bold text-gray-900 m-0 leading-tight md:text-xl">{formatNumber(stats.totalMembers)}</p>
              </div>
            </Card>

            <Card className="flex items-center gap-6 p-6 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] relative overflow-hidden hover:-translate-y-1 hover:shadow-lg hover:border-gray-300 before:content-[''] before:absolute before:top-0 before:left-0 before:w-1 before:h-full before:bg-gradient-to-b before:from-blue-500 before:to-blue-600 before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100 md:p-4 md:flex-col md:items-start md:gap-4">
              <div className="w-16 h-16 flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white text-[28px] flex-shrink-0 shadow-[0_4px_6px_-1px_rgba(59,130,246,0.3)] md:w-12 md:h-12 md:text-2xl">
                <CurrencyDollarIcon className="w-8 h-8 text-white md:w-6 md:h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm text-gray-500 m-0 mb-2 font-medium uppercase tracking-wide flex items-center flex-wrap gap-1 md:text-xs">
                  {t('admin.dashboard.stats.totalSales')} 
                  <span className="text-xs font-normal text-gray-400 normal-case tracking-normal not-italic">
                    {' '}({t('common.unit', '단위')}: {t('common.currencyUnit', '만원')})
                  </span>
                </h3>
                <p className="text-[30px] font-bold text-gray-900 m-0 leading-tight md:text-xl">
                  {formatCurrencyCompact(stats.totalSales, { 
                    language: currentLanguage,
                    showCurrency: false,
                    showUnitLabel: false
                  })}
                </p>
              </div>
            </Card>

            <Card className="flex items-center gap-6 p-6 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] relative overflow-hidden hover:-translate-y-1 hover:shadow-lg hover:border-gray-300 before:content-[''] before:absolute before:top-0 before:left-0 before:w-1 before:h-full before:bg-gradient-to-b before:from-blue-500 before:to-blue-600 before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100 md:p-4 md:flex-col md:items-start md:gap-4">
              <div className="w-16 h-16 flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white text-[28px] flex-shrink-0 shadow-[0_4px_6px_-1px_rgba(59,130,246,0.3)] md:w-12 md:h-12 md:text-2xl">
                <UsersIcon className="w-8 h-8 text-white md:w-6 md:h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm text-gray-500 m-0 mb-2 font-medium uppercase tracking-wide flex items-center flex-wrap gap-1 md:text-xs">{t('admin.dashboard.stats.totalEmployment')}</h3>
                <p className="text-[30px] font-bold text-gray-900 m-0 leading-tight md:text-xl">{formatNumber(stats.totalEmployment)}</p>
              </div>
            </Card>

            <Card className="flex items-center gap-6 p-6 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] relative overflow-hidden hover:-translate-y-1 hover:shadow-lg hover:border-gray-300 before:content-[''] before:absolute before:top-0 before:left-0 before:w-1 before:h-full before:bg-gradient-to-b before:from-blue-500 before:to-blue-600 before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100 md:p-4 md:flex-col md:items-start md:gap-4">
              <div className="w-16 h-16 flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white text-[28px] flex-shrink-0 shadow-[0_4px_6px_-1px_rgba(59,130,246,0.3)] md:w-12 md:h-12 md:text-2xl">
                <DocumentIcon className="w-8 h-8 text-white md:w-6 md:h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm text-gray-500 m-0 mb-2 font-medium uppercase tracking-wide flex items-center flex-wrap gap-1 md:text-xs">{t('admin.dashboard.stats.totalIP')}</h3>
                <p className="text-[30px] font-bold text-gray-900 m-0 leading-tight md:text-xl">{formatNumber(stats.totalIntellectualProperty)}</p>
              </div>
            </Card>
          </div>

          {/* 图表区域 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card className="p-6 transition-shadow duration-300 hover:shadow-md md:p-4">
              <h2 className="text-lg font-semibold text-gray-800 m-0 mb-6 md:text-base md:mb-4">{t('admin.dashboard.charts.members')}</h2>
              <MemberGrowthChart
                key={`members-${selectedYear}-${selectedQuarter}`}
                data={membersChartData}
                height="300px"
              />
            </Card>

            <Card className="p-6 transition-shadow duration-300 hover:shadow-md md:p-4">
              <h2 className="text-lg font-semibold text-gray-800 m-0 mb-6 md:text-base md:mb-4">{t('admin.dashboard.charts.salesEmployment')}</h2>
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
                        formatter: (value) => formatNumber(value)
                      }
                    }
                  ]}
                />
              ) : (
                <div className="h-[300px] flex items-center justify-center bg-gray-50 rounded-lg text-gray-500">
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

