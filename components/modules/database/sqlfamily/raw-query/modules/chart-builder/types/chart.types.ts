import type { ExecutedResultItem, MappedRawColumn } from '../../../interfaces';

export enum ChartType {
  LINE = 'line',
  BAR = 'bar',
  HORIZONTAL_BAR = 'horizontal-bar',
  AREA = 'area',
  STACKED_BAR = 'stacked-bar',
  PIE = 'pie',
  DONUT = 'donut',
  SCATTER = 'scatter',
  HEATMAP = 'heatmap',
  RADAR = 'radar',
}

export enum AggregationType {
  NONE = 'none',
  SUM = 'sum',
  AVG = 'avg',
  COUNT = 'count',
  MIN = 'min',
  MAX = 'max',
}

export enum SortByType {
  NONE = 'none',
  X_ASC = 'x-asc',
  X_DESC = 'x-desc',
  Y_ASC = 'y-asc',
  Y_DESC = 'y-desc',
}

export interface DataPoint {
  x: string;
  y: number;
  group?: string;
}

export interface LinearChartParams {
  rows: Record<string, any>[];
  xAxisField: string;
  yAxisField: string;
  groupByField?: string;
  aggregation: AggregationType;
  sortBy?: SortByType;
  limitRows?: number;
}

export interface PieChartParams {
  rows: Record<string, any>[];
  xAxisField: string;
  yAxisField: string;
  aggregation: AggregationType;
  sortBy?: SortByType;
  limitRows?: number;
}

export interface HeatmapChartParams {
  rows: Record<string, any>[];
  xAxisField: string;
  categoryYField: string;
  valueField?: string;
}

export interface RadarChartParams {
  rows: Record<string, any>[];
  xAxisField: string;
  yAxisField: string;
  aggregation: AggregationType;
  limitRows?: number;
}

export enum ChartTypeCategory {
  COMPARISON = 'comparison',
  COMPOSITION = 'composition',
  DISTRIBUTION = 'distribution',
  RELATIONSHIP = 'relationship',
  SPATIAL = 'spatial',
}

/** Describes which fields are visible/required for a specific chart type */
export interface ChartFieldVisibility {
  xAxisLabel: boolean;
  xAxisNumeric: boolean;
  yAxis: boolean;
  /** Y-axis is hidden when aggregation is COUNT */
  yAxisHiddenOnCount: boolean;
  categoryX: boolean;
  categoryY: boolean;
  valueColumn: boolean;
  aggregation: boolean;
  groupBy: boolean;
  /** Group by is required (not optional) */
  groupByRequired: boolean;
  sortBy: boolean;
  limitRows: boolean;
  smoothLine: boolean;
  showLabels: boolean;
  showLegend: boolean;
}

export interface ChartTypeMeta {
  value: ChartType;
  label: string;
  icon: string;
  category: ChartTypeCategory;
  description: string;
  fields: ChartFieldVisibility;
}
