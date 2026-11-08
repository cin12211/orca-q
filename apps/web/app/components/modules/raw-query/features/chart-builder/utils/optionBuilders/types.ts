import type { EChartsOption } from 'echarts';
import type { DataPoint } from '../../types';

export interface ChartTheme {
  isDark: boolean;
  labelColor: string;
  lineColor: string;
  tooltipBg: string;
  tooltipBorderColor: string;
  tooltipTextStyle: { color: string; fontWeight: number };
}

export interface LinearBuildParams {
  theme: ChartTheme;
  data: DataPoint[];
  xAxisField: string;
  yAxisField: string;
  groupByField: string;
  showLabels: boolean;
  smoothLine: boolean;
  chartTitle: string;
  isArea?: boolean;
  isStacked?: boolean;
  isHorizontal?: boolean;
  isLine?: boolean;
}

export interface PieBuildParams {
  theme: ChartTheme;
  data: { name: string; value: number }[];
  xAxisField: string;
  yAxisField: string;
  showLabels: boolean;
  isDonut: boolean;
}

export interface ScatterBuildParams {
  theme: ChartTheme;
  data: DataPoint[];
  xAxisField: string;
  yAxisField: string;
  showLabels: boolean;
  chartTitle: string;
}

export interface HeatmapBuildParams {
  theme: ChartTheme;
  xData: string[];
  yData: string[];
  data: [number, number, number][];
  xAxisField: string;
  categoryYField: string;
  valueField: string;
  showLabels: boolean;
  chartTitle: string;
}

export interface RadarBuildParams {
  theme: ChartTheme;
  categories: string[];
  values: number[];
  maxVal: number;
  showLabels: boolean;
  chartTitle: string;
}

export function createTheme(isDark: boolean): ChartTheme {
  const labelColor = isDark ? '#e2e8f0' : '#1e293b';
  const lineColor = isDark
    ? 'rgba(255, 255, 255, 0.08)'
    : 'rgba(0, 0, 0, 0.06)';
  return {
    isDark,
    labelColor,
    lineColor,
    tooltipBg: isDark ? '#1e293b' : '#ffffff',
    tooltipBorderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    tooltipTextStyle: { color: labelColor, fontWeight: 400 },
  };
}

export function createBaseOption(theme: ChartTheme): EChartsOption {
  return {
    backgroundColor: 'transparent',
    textStyle: {
      fontFamily: 'Outfit, Inter, system-ui, sans-serif',
      color: theme.labelColor,
    },
    legend: {
      textStyle: { color: theme.labelColor },
      bottom: 5,
    },
  };
}
