import type { EChartsOption } from 'echarts';
import { formatPieTooltip } from '../tooltipFormatters';
import type { PieBuildParams } from './types';
import { createBaseOption } from './types';

export function buildPieOption(params: PieBuildParams): EChartsOption {
  const { theme, data, xAxisField, yAxisField, showLabels, isDonut } = params;
  const base = createBaseOption(theme);

  return {
    ...base,
    tooltip: {
      trigger: 'item',
      formatter: (p: any) => formatPieTooltip(p, xAxisField, yAxisField),
      backgroundColor: theme.tooltipBg,
      borderColor: theme.tooltipBorderColor,
      borderWidth: 1,
      borderRadius: 8,
      textStyle: theme.tooltipTextStyle,
    },
    series: [
      {
        type: 'pie',
        radius: isDonut ? ['50%', '80%'] : '80%',
        avoidLabelOverlap: true,
        label: {
          show: showLabels,
          position: 'outside',
          color: theme.labelColor,
        },
        data,
      },
    ],
  };
}
