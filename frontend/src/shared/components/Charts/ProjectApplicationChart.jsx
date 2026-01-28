/**
 * Project Application Chart Component
 * 项目申请统计图表组件 - 用于显示项目申请统计数据
 */

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, MixedChart } from './';

/**
 * ProjectApplicationChart - 项目申请统计图表
 * @param {Object} props
 * @param {Array<Object>} props.data - 项目申请数据 [{ period, applications, approved, rejected }]
 * @param {string} props.height - 图表高度
 * @param {string} props.chartType - 图表类型 ('bar' | 'mixed', 默认: 'bar')
 */
export default function ProjectApplicationChart({
  data = [],
  height = '400px',
  chartType = 'bar',
  ...otherProps
}) {
  const { t } = useTranslation();

  const { categories, series } = useMemo(() => {
    if (!data || data.length === 0) {
      return { categories: [], series: [] };
    }

    const periods = data.map(item => item.period || item.date || item.month || item.year);
    
    const applications = data.map(item => item.applications || item.total || 0);
    const approved = data.map(item => item.approved || 0);
    const rejected = data.map(item => item.rejected || 0);
    const pending = data.map(item => item.pending || 0);

    if (chartType === 'mixed') {
      // 混合图表：柱状图显示申请数，折线图显示批准率
      const approvalRates = data.map((item, index) => {
        const total = applications[index];
        return total > 0 ? Math.round((approved[index] / total) * 100) : 0;
      });

      return {
        categories: periods,
        series: [
          {
            name: t('admin.projects.applications', '신청 수'),
            type: 'bar',
            data: applications,
            color: '#3b82f6',
            yAxisIndex: 0
          },
          {
            name: t('admin.projects.approvalRate', '승인율'),
            type: 'line',
            data: approvalRates,
            color: '#10b981',
            yAxisIndex: 1,
            smooth: true
          }
        ]
      };
    } else {
      // 柱状图：显示申请数、批准数、拒绝数、待处理数
      return {
        categories: periods,
        series: [
          {
            name: t('admin.projects.applications', '신청 수'),
            data: applications,
            color: '#3b82f6'
          },
          {
            name: t('admin.projects.approved', '승인됨'),
            data: approved,
            color: '#10b981'
          },
          {
            name: t('admin.projects.rejected', '거부됨'),
            data: rejected,
            color: '#ef4444'
          },
          {
            name: t('admin.projects.pending', '대기 중'),
            data: pending,
            color: '#f59e0b'
          }
        ]
      };
    }
  }, [data, chartType, t]);

  if (chartType === 'mixed') {
    return (
      <MixedChart
        categories={categories}
        series={series}
        height={height}
        yAxis={[
          {
            type: 'value',
            name: t('admin.projects.applications', '신청 수'),
            position: 'left'
          },
          {
            type: 'value',
            name: t('admin.projects.approvalRate', '승인율'),
            position: 'right',
            axisLabel: {
              formatter: '{value}%'
            }
          }
        ]}
        {...otherProps}
      />
    );
  }

  return (
    <BarChart
      categories={categories}
      series={series}
      height={height}
      {...otherProps}
    />
  );
}

