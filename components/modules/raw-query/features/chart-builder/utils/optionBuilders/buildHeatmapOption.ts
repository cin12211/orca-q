import type { EChartsOption } from 'echarts';
import { formatHeatmapTooltip } from '../tooltipFormatters';
import type { HeatmapBuildParams } from './types';
import { createBaseOption } from './types';

export function buildHeatmapOption(params: HeatmapBuildParams): EChartsOption {
  const {
    theme,
    xData,
    yData,
    data,
    xAxisField,
    categoryYField,
    valueField,
    showLabels,
    chartTitle,
  } = params;
  const base = createBaseOption(theme);

  const minVal = data.length
    ? Math.min(...data.map((d: [number, number, number]) => d[2]))
    : 0;
  const maxVal = data.length
    ? Math.max(...data.map((d: [number, number, number]) => d[2]))
    : 100;

  return {
    ...base,
    tooltip: {
      trigger: 'item',
      formatter: (p: any) =>
        formatHeatmapTooltip(
          p,
          xData,
          yData,
          xAxisField,
          categoryYField,
          valueField
        ),
      backgroundColor: theme.tooltipBg,
      borderColor: theme.tooltipBorderColor,
      borderWidth: 1,
      borderRadius: 8,
      textStyle: theme.tooltipTextStyle,
    },
    grid: {
      left: '10px',
      right: '15px',
      top: '20px',
      bottom: '60px',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: xData,
      splitArea: { show: true },
      axisLabel: { color: theme.labelColor },
    },
    yAxis: {
      type: 'category',
      data: yData,
      splitArea: { show: true },
      axisLabel: { color: theme.labelColor },
    },
    visualMap: {
      min: minVal,
      max: maxVal,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 25,
      textStyle: { color: theme.labelColor },
      inRange: {
        color: theme.isDark
          ? ['#1e3a8a', '#3b82f6', '#60a5fa', '#93c5fd']
          : ['#eff6ff', '#bfdbfe', '#60a5fa', '#1d4ed8'],
      },
    },
    series: [
      {
        name: chartTitle || 'Heatmap Value',
        type: 'heatmap',
        data,
        label: {
          show: showLabels,
          color: theme.isDark ? '#fff' : '#000',
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    ],
  };
}
