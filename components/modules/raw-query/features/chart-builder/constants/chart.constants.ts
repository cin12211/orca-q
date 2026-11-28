import { ChartType } from '../types';

export const CHART_TYPES_CONFIG = [
  {
    value: ChartType.LINE,
    label: 'Line',
    icon: 'hugeicons:chart-line-data-01',
  },
  { value: ChartType.BAR, label: 'Bar', icon: 'hugeicons:chart-column' },
  {
    value: ChartType.HORIZONTAL_BAR,
    label: 'Horiz Bar',
    icon: 'hugeicons:chart-histogram',
  },
  { value: ChartType.AREA, label: 'Area', icon: 'hugeicons:chart-area' },
  {
    value: ChartType.STACKED_BAR,
    label: 'Stacked Bar',
    icon: 'hugeicons:chart-histogram',
  },
  { value: ChartType.PIE, label: 'Pie', icon: 'hugeicons:pie-chart' },
  { value: ChartType.DONUT, label: 'Donut', icon: 'hugeicons:circle' },
  {
    value: ChartType.SCATTER,
    label: 'Scatter',
    icon: 'hugeicons:chart-scatter',
  },
  { value: ChartType.HEATMAP, label: 'Heatmap', icon: 'hugeicons:grid' },
  {
    value: ChartType.RADAR,
    label: 'Radar',
    icon: 'hugeicons:chart-relationship',
  },
] as const;
