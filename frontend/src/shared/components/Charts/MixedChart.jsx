/**
 * Mixed Chart Component
 * 混合图表组件 - 支持柱状图和折线图组合
 */

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import BaseChart from './BaseChart';

/**
 * MixedChart - 混合图表组件
 * @param {Object} props
 * @param {Array<string>} props.categories - X 轴分类数据
 * @param {Array<Object>} props.series - 系列数据数组 [{ name, data, type, color, yAxisIndex }]
 * @param {string} props.title - 图表标题
 * @param {string} props.height - 图表高度
 * @param {boolean} props.showLegend - 是否显示图例（默认: true）
 * @param {boolean} props.showTooltip - 是否显示提示框（默认: true）
 * @param {Function} props.formatter - 自定义格式化函数
 * @param {Array<Object>} props.yAxis - Y 轴配置数组（支持双 Y 轴）
 * @param {Object} props.grid - 网格配置
 * @param {Object} props.xAxis - X 轴配置
 */
export default function MixedChart({
  categories = [],
  series = [],
  title,
  height = '400px',
  showLegend = true,
  showTooltip = true,
  formatter,
  yAxis = [],
  grid = {},
  xAxis = {},
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
      bottom: '15%',
      containLabel: true,
      ...grid
    };

    // 默认 X 轴配置
    const defaultXAxis = {
      type: 'category',
      boundaryGap: true,
      data: categories,
      axisLabel: {
        rotate: categories.length > 6 ? 45 : 0,
        interval: 0,
        margin: 10,
        ...xAxis.axisLabel
      },
      ...xAxis
    };

    // 默认 Y 轴配置（如果没有提供，根据系列自动生成）
    let defaultYAxis = yAxis;
    if (!defaultYAxis || defaultYAxis.length === 0) {
      // 检查是否有使用 yAxisIndex 的系列
      const hasMultipleYAxis = series.some(s => s.yAxisIndex !== undefined && s.yAxisIndex !== 0);
      if (hasMultipleYAxis) {
        // 双 Y 轴
        defaultYAxis = [
          {
            type: 'value',
            position: 'left',
            axisLabel: {
              formatter: (value) => value.toLocaleString(currentLanguage === 'zh' ? 'zh-CN' : 'ko-KR')
            }
          },
          {
            type: 'value',
            position: 'right',
            axisLabel: {
              formatter: (value) => value.toLocaleString(currentLanguage === 'zh' ? 'zh-CN' : 'ko-KR')
            }
          }
        ];
      } else {
        // 单 Y 轴
        defaultYAxis = [{
          type: 'value',
          axisLabel: {
            formatter: (value) => value.toLocaleString(currentLanguage === 'zh' ? 'zh-CN' : 'ko-KR')
          }
        }];
      }
    }

    // 默认提示框配置
    const defaultTooltip = {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      },
      formatter: formatter || ((params) => {
        let result = `${params[0].name}<br/>`;
        params.forEach(param => {
          result += `${param.seriesName}: ${param.value.toLocaleString(currentLanguage === 'zh' ? 'zh-CN' : 'ko-KR')}<br/>`;
        });
        return result;
      })
    };

    // 构建系列数据
    const chartSeries = series.map((s, index) => {
      const baseConfig = {
        name: s.name,
        data: s.data,
        itemStyle: {
          color: s.color || (index === 0 ? '#3b82f6' : ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 4])
        }
      };

      if (s.type === 'line') {
        return {
          ...baseConfig,
          type: 'line',
          smooth: s.smooth !== undefined ? s.smooth : true,
          yAxisIndex: s.yAxisIndex || 0
        };
      } else {
        return {
          ...baseConfig,
          type: 'bar',
          barWidth: s.barWidth || '40%',
          yAxisIndex: s.yAxisIndex || 0
        };
      }
    });

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
  }, [categories, series, title, showLegend, showTooltip, formatter, yAxis, grid, xAxis, currentLanguage]);

  return (
    <BaseChart
      option={option}
      height={height}
      {...otherProps}
    />
  );
}

