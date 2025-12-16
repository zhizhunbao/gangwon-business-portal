/**
 * Bar Chart Component
 * 柱状图组件 - 用于显示分类数据对比
 */

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import BaseChart from './BaseChart';

/**
 * BarChart - 柱状图组件
 * @param {Object} props
 * @param {Array<string>} props.categories - X 轴分类数据
 * @param {Array<Object>} props.series - 系列数据数组 [{ name, data, color }]
 * @param {string} props.title - 图表标题
 * @param {string} props.height - 图表高度
 * @param {boolean} props.horizontal - 是否横向显示（默认: false）
 * @param {boolean} props.showLegend - 是否显示图例（默认: true）
 * @param {boolean} props.showTooltip - 是否显示提示框（默认: true）
 * @param {Function} props.formatter - 自定义格式化函数
 * @param {string} props.barWidth - 柱状图宽度（默认: '60%'）
 * @param {Object} props.grid - 网格配置
 * @param {Object} props.xAxis - X 轴配置
 * @param {Object} props.yAxis - Y 轴配置
 */
export default function BarChart({
  categories = [],
  series = [],
  title,
  height = '400px',
  horizontal = false,
  showLegend = true,
  showTooltip = true,
  formatter,
  barWidth = '60%',
  grid = {},
  xAxis = {},
  yAxis = {},
  ...otherProps
}) {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language || 'ko';

  const option = useMemo(() => {
    if (!categories.length || !series.length) {
      return {};
    }

    // 默认网格配置
    const defaultGrid = {
      left: '3%',
      right: '4%',
      bottom: horizontal ? '3%' : '15%',
      top: title ? '15%' : '10%',
      containLabel: true,
      ...grid
    };

    // X 轴配置
    const defaultXAxis = {
      type: horizontal ? 'value' : 'category',
      data: horizontal ? undefined : categories,
      axisLabel: horizontal ? {
        formatter: (value) => value.toLocaleString(currentLanguage === 'zh' ? 'zh-CN' : 'ko-KR'),
        ...xAxis.axisLabel
      } : {
        rotate: categories.length > 6 ? 45 : 0,
        interval: 0,
        margin: 10,
        ...xAxis.axisLabel
      },
      ...xAxis
    };

    // Y 轴配置
    const defaultYAxis = {
      type: horizontal ? 'category' : 'value',
      data: horizontal ? categories : undefined,
      axisLabel: horizontal ? {
        ...yAxis.axisLabel
      } : {
        formatter: (value) => value.toLocaleString(currentLanguage === 'zh' ? 'zh-CN' : 'ko-KR'),
        ...yAxis.axisLabel
      },
      ...yAxis
    };

    // 默认提示框配置
    const defaultTooltip = {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: formatter || ((params) => {
        let result = `${params[0].name || params[0].value}<br/>`;
        params.forEach(param => {
          result += `${param.seriesName}: ${param.value.toLocaleString(currentLanguage === 'zh' ? 'zh-CN' : 'ko-KR')}<br/>`;
        });
        return result;
      })
    };

    // 构建系列数据
    const chartSeries = series.map((s, index) => ({
      name: s.name,
      type: 'bar',
      data: s.data,
      barWidth: s.barWidth || barWidth,
      itemStyle: {
        color: s.color || (index === 0 ? '#3b82f6' : ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 4])
      }
    }));

    return {
      title: title ? {
        text: title,
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'normal'
        }
      } : undefined,
      tooltip: showTooltip ? defaultTooltip : undefined,
      legend: showLegend && series.length > 1 ? {
        data: series.map(s => s.name),
        top: title ? 30 : 10
      } : undefined,
      grid: defaultGrid,
      xAxis: defaultXAxis,
      yAxis: defaultYAxis,
      series: chartSeries
    };
  }, [categories, series, title, horizontal, showLegend, showTooltip, formatter, barWidth, grid, xAxis, yAxis, currentLanguage]);

  return (
    <BaseChart
      option={option}
      height={height}
      {...otherProps}
    />
  );
}

