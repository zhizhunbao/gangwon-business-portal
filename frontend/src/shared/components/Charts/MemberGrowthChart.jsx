/**
 * Member Growth Chart Component
 * 会员增长图表组件 - 用于显示会员数量增长趋势
 */

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { LineChart } from './';

/**
 * MemberGrowthChart - 会员增长图表
 * @param {Object} props
 * @param {Array<Object>} props.data - 会员数据 [{ period, value }] 或 [{ date, count }]
 * @param {string} props.height - 图表高度
 * @param {boolean} props.showArea - 是否显示面积（默认: true）
 */
export default function MemberGrowthChart({
  data = [],
  height = '400px',
  showArea = true,
  ...otherProps
}) {
  const { t } = useTranslation();

  const { categories, series } = useMemo(() => {
    if (!data || data.length === 0) {
      return { categories: [], series: [] };
    }

    const periods = data.map(item => item.period || item.date || item.month || item.year);
    const values = data.map(item => item.value || item.count || item.members || 0);

    return {
      categories: periods,
      series: [{
        name: t('admin.dashboard.stats.totalMembers', '총 기업 회원 수'),
        data: values,
        color: '#3b82f6'
      }]
    };
  }, [data, t]);

  return (
    <LineChart
      categories={categories}
      series={series}
      height={height}
      smooth={true}
      area={showArea}
      showLegend={false}
      {...otherProps}
    />
  );
}

