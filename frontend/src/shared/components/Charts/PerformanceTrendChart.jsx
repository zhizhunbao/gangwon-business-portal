/**
 * Performance Trend Chart Component
 * 绩效数据趋势图组件 - 用于显示绩效数据的时间趋势
 */

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { LineChart } from './';
import { formatCurrencyCompact } from '@shared/utils';

/**
 * PerformanceTrendChart - 绩效数据趋势图
 * @param {Object} props
 * @param {Array<Object>} props.data - 绩效数据 [{ period, sales, employment, ip }]
 * @param {string} props.height - 图表高度
 * @param {string} props.type - 数据类型 ('sales', 'employment', 'ip', 'all')
 */
export default function PerformanceTrendChart({
  data = [],
  height = '400px',
  type = 'all',
  ...otherProps
}) {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language || 'ko';

  const { categories, series } = useMemo(() => {
    if (!data || data.length === 0) {
      return { categories: [], series: [] };
    }

    const periods = data.map(item => item.period || item.year || item.date);
    
    if (type === 'sales') {
      return {
        categories: periods,
        series: [{
          name: t('admin.dashboard.stats.totalSales', '총 매출액'),
          data: data.map(item => item.sales || item.salesRevenue || 0),
          color: '#10b981'
        }]
      };
    } else if (type === 'employment') {
      return {
        categories: periods,
        series: [{
          name: t('admin.dashboard.stats.totalEmployment', '총 고용 인원'),
          data: data.map(item => item.employment || item.employees || 0),
          color: '#f59e0b'
        }]
      };
    } else if (type === 'ip') {
      return {
        categories: periods,
        series: [{
          name: t('admin.dashboard.stats.totalIP', '총 지식재산권'),
          data: data.map(item => item.ip || item.intellectualProperty || 0),
          color: '#8b5cf6'
        }]
      };
    } else {
      // 显示所有类型
      return {
        categories: periods,
        series: [
          {
            name: t('admin.dashboard.stats.totalSales', '총 매출액'),
            data: data.map(item => item.sales || item.salesRevenue || 0),
            color: '#10b981'
          },
          {
            name: t('admin.dashboard.stats.totalEmployment', '총 고용 인원'),
            data: data.map(item => item.employment || item.employees || 0),
            color: '#f59e0b'
          },
          {
            name: t('admin.dashboard.stats.totalIP', '총 지식재산권'),
            data: data.map(item => item.ip || item.intellectualProperty || 0),
            color: '#8b5cf6'
          }
        ]
      };
    }
  }, [data, type, t]);

  // 自定义格式化函数（用于销售额）
  const formatter = useMemo(() => {
    if (type === 'sales' || type === 'all') {
      return (params) => {
        let result = `${params[0].name}<br/>`;
        params.forEach(param => {
          if (param.seriesName === t('admin.dashboard.stats.totalSales', '총 매출액')) {
            const formatted = formatCurrencyCompact(param.value, {
              language: currentLanguage,
              showCurrency: true
            });
            result += `${param.seriesName}: ${formatted}<br/>`;
          } else {
            result += `${param.seriesName}: ${param.value.toLocaleString(currentLanguage === 'zh' ? 'zh-CN' : 'ko-KR')}<br/>`;
          }
        });
        return result;
      };
    }
    return undefined;
  }, [type, currentLanguage, t]);

  return (
    <LineChart
      categories={categories}
      series={series}
      height={height}
      smooth={true}
      area={true}
      formatter={formatter}
      {...otherProps}
    />
  );
}

