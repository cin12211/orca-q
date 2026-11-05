import type { EChartsOption } from 'echarts';
import {
  formatLinearTooltip,
  formatStackedBarTooltip,
} from '../tooltipFormatters';
import type { LinearBuildParams } from './types';
import { createBaseOption } from './types';

export function buildLinearOption(params: LinearBuildParams): EChartsOption {
  const {
    theme,
    data,
    xAxisField,
    yAxisField,
    groupByField,
    showLabels,
    smoothLine,
    chartTitle,
    isArea = false,
    isStacked = false,
    isHorizontal = false,
    isLine = false,
  } = params;

  const base = createBaseOption(theme);

  const uniqueGroups = Array.from(
    new Set(data.map(d => d.group).filter(Boolean))
  );
  const uniqueX = Array.from(new Set(data.map(d => d.x)));

  const resolveSeriesType = (): string => {
    if (isStacked || isHorizontal) return 'bar';
    if (isArea || isLine) return 'line';
    return 'bar';
  };

  let series: any[] = [];

  if (uniqueGroups.length > 0) {
    uniqueGroups.forEach(group => {
      const groupData = uniqueX.map(xVal => {
        const found = data.find(d => d.x === xVal && d.group === group);
        return found ? found.y : 0;
      });

      const sType = resolveSeriesType();

      series.push({
        name: String(group),
        type: sType,
        stack: isStacked ? 'total' : undefined,
        smooth: smoothLine && sType === 'line',
        areaStyle: isArea ? { opacity: 0.3 } : undefined,
        label: {
          show: showLabels,
          position: isHorizontal ? 'right' : 'top',
          color: theme.labelColor,
        },
        data: groupData,
      });
    });
  } else {
    const sType = resolveSeriesType();
    series.push({
      name: chartTitle || yAxisField || 'Values',
      type: sType,
      smooth: smoothLine && sType === 'line',
      areaStyle: isArea ? { opacity: 0.3 } : undefined,
      label: {
        show: showLabels,
        position: isHorizontal ? 'right' : 'top',
        color: theme.labelColor,
      },
      data: data.map(d => d.y),
    });
  }

  let xAxis: any;
  let yAxis: any;

  if (isHorizontal) {
    xAxis = {
      type: 'value',
      axisLabel: { color: theme.labelColor },
      splitLine: { lineStyle: { color: theme.lineColor } },
    };
    yAxis = {
      type: 'category',
      data: uniqueX,
      axisLabel: { color: theme.labelColor },
      splitLine: { show: false },
    };
  } else {
    xAxis = {
      type: 'category',
      data: uniqueX,
      axisLabel: { color: theme.labelColor },
      splitLine: { show: false },
    };
    yAxis = {
      type: 'value',
      name: yAxisField,
      nameTextStyle: { color: theme.labelColor },
      axisLabel: { color: theme.labelColor },
      splitLine: { lineStyle: { color: theme.lineColor } },
    };
  }

  const tooltipFormatter = isStacked
    ? (p: any) => formatStackedBarTooltip(p, xAxisField)
    : (p: any) => formatLinearTooltip(p, xAxisField, yAxisField, groupByField);

  return {
    ...base,
    tooltip: {
      trigger: 'axis',
      backgroundColor: theme.tooltipBg,
      borderColor: theme.tooltipBorderColor,
      borderWidth: 1,
      borderRadius: 8,
      textStyle: theme.tooltipTextStyle,
      formatter: tooltipFormatter,
    },
    grid: {
      left: '10px',
      right: '15px',
      top: '30px',
      bottom: '40px',
      containLabel: true,
    },
    xAxis,
    yAxis,
    series,
  };
}
