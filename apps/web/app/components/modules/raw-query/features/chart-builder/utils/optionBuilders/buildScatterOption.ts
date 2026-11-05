import type { EChartsOption } from 'echarts';
import { formatScatterTooltip } from '../tooltipFormatters';
import type { ScatterBuildParams } from './types';
import { createBaseOption } from './types';

export function buildScatterOption(params: ScatterBuildParams): EChartsOption {
  const { theme, data, xAxisField, yAxisField, showLabels, chartTitle } =
    params;
  const base = createBaseOption(theme);

  return {
    ...base,
    tooltip: {
      trigger: 'item',
      formatter: (p: any) => formatScatterTooltip(p, xAxisField, yAxisField),
      backgroundColor: theme.tooltipBg,
      borderColor: theme.tooltipBorderColor,
      borderWidth: 1,
      borderRadius: 8,
      textStyle: theme.tooltipTextStyle,
    },
    grid: {
      left: '10px',
      right: '15px',
      top: '30px',
      bottom: '40px',
      containLabel: true,
    },
    xAxis: {
      type: 'value',
      name: xAxisField,
      nameTextStyle: { color: theme.labelColor },
      axisLabel: { color: theme.labelColor },
      splitLine: { lineStyle: { color: theme.lineColor } },
    },
    yAxis: {
      type: 'value',
      name: yAxisField,
      nameTextStyle: { color: theme.labelColor },
      axisLabel: { color: theme.labelColor },
      splitLine: { lineStyle: { color: theme.lineColor } },
    },
    series: [
      {
        name: chartTitle || yAxisField || 'Values',
        type: 'scatter',
        label: {
          show: showLabels,
          position: 'top',
          color: theme.labelColor,
        },
        data: data.map(d => [Number(d.x), d.y]),
      },
    ],
  };
}
