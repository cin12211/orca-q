import type { EChartsOption } from 'echarts';
import { formatRadarTooltip } from '../tooltipFormatters';
import type { RadarBuildParams } from './types';
import { createBaseOption } from './types';

export function buildRadarOption(params: RadarBuildParams): EChartsOption {
  const { theme, categories, values, maxVal, showLabels, chartTitle } = params;
  const base = createBaseOption(theme);

  return {
    ...base,
    tooltip: {
      trigger: 'item',
      formatter: (p: any) => formatRadarTooltip(p, categories, values),
      backgroundColor: theme.tooltipBg,
      borderColor: theme.tooltipBorderColor,
      borderWidth: 1,
      borderRadius: 8,
      textStyle: theme.tooltipTextStyle,
    },
    radar: {
      indicator: categories.map((cat: string) => ({ name: cat, max: maxVal })),
      splitArea: {
        show: true,
        areaStyle: {
          color: theme.isDark
            ? ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.04)']
            : ['rgba(0,0,0,0.01)', 'rgba(0,0,0,0.02)'],
        },
      },
      axisLine: {
        lineStyle: { color: theme.lineColor },
      },
      splitLine: {
        lineStyle: { color: theme.lineColor },
      },
    },
    series: [
      {
        name: chartTitle || 'Radar Chart',
        type: 'radar',
        data: [
          {
            value: values,
            name: chartTitle || 'Radar Data',
          },
        ],
        label: {
          show: showLabels,
          color: theme.labelColor,
        },
        areaStyle: {
          opacity: 0.2,
        },
      },
    ],
  };
}
