import {
  ChartType,
  ChartTypeCategory,
  type ChartTypeMeta,
  type ChartFieldVisibility,
} from '../types';

/** Base field visibility — all false */
const NO_FIELDS: Readonly<ChartFieldVisibility> = {
  xAxisLabel: false,
  xAxisNumeric: false,
  yAxis: false,
  yAxisHiddenOnCount: false,
  categoryX: false,
  categoryY: false,
  valueColumn: false,
  aggregation: false,
  groupBy: false,
  groupByRequired: false,
  sortBy: false,
  limitRows: false,
  smoothLine: false,
  showLabels: false,
  showLegend: false,
};

/** Shared linear chart fields (Line, Bar, HBar, Area) */
const LINEAR_FIELDS: Readonly<ChartFieldVisibility> = {
  ...NO_FIELDS,
  xAxisLabel: true,
  yAxis: true,
  aggregation: true,
  groupBy: true,
  sortBy: true,
  limitRows: true,
  showLabels: true,
  showLegend: true,
};

export const CHART_TYPE_META: ReadonlyMap<ChartType, ChartTypeMeta> = new Map([
  [
    ChartType.LINE,
    {
      value: ChartType.LINE,
      label: 'Line',
      icon: 'hugeicons:chart-line-data-01',
      category: ChartTypeCategory.COMPARISON,
      description: 'Show trends over time or ordered categories',
      fields: { ...LINEAR_FIELDS, smoothLine: true },
    },
  ],
  [
    ChartType.BAR,
    {
      value: ChartType.BAR,
      label: 'Bar',
      icon: 'hugeicons:chart-column',
      category: ChartTypeCategory.COMPARISON,
      description: 'Compare values across categories',
      fields: { ...LINEAR_FIELDS },
    },
  ],
  [
    ChartType.HORIZONTAL_BAR,
    {
      value: ChartType.HORIZONTAL_BAR,
      label: 'Horizontal Bar',
      icon: 'hugeicons:chart-histogram',
      category: ChartTypeCategory.COMPARISON,
      description: 'Compare values with long category labels',
      fields: { ...LINEAR_FIELDS },
    },
  ],
  [
    ChartType.AREA,
    {
      value: ChartType.AREA,
      label: 'Area',
      icon: 'hugeicons:chart-area',
      category: ChartTypeCategory.COMPARISON,
      description: 'Show volume and trends over time',
      fields: { ...LINEAR_FIELDS, smoothLine: true },
    },
  ],
  [
    ChartType.STACKED_BAR,
    {
      value: ChartType.STACKED_BAR,
      label: 'Stacked Bar',
      icon: 'hugeicons:chart-histogram',
      category: ChartTypeCategory.COMPOSITION,
      description: 'Show part-to-whole across categories',
      fields: { ...LINEAR_FIELDS, groupByRequired: true },
    },
  ],
  [
    ChartType.PIE,
    {
      value: ChartType.PIE,
      label: 'Pie',
      icon: 'hugeicons:pie-chart',
      category: ChartTypeCategory.COMPOSITION,
      description: 'Show proportions of a whole',
      fields: {
        ...NO_FIELDS,
        xAxisLabel: true,
        yAxis: true,
        yAxisHiddenOnCount: true,
        aggregation: true,
        sortBy: true,
        limitRows: true,
        showLabels: true,
        showLegend: true,
      },
    },
  ],
  [
    ChartType.DONUT,
    {
      value: ChartType.DONUT,
      label: 'Donut',
      icon: 'hugeicons:circle',
      category: ChartTypeCategory.COMPOSITION,
      description: 'Show proportions with center metric',
      fields: {
        ...NO_FIELDS,
        xAxisLabel: true,
        yAxis: true,
        yAxisHiddenOnCount: true,
        aggregation: true,
        sortBy: true,
        limitRows: true,
        showLabels: true,
        showLegend: true,
      },
    },
  ],
  [
    ChartType.SCATTER,
    {
      value: ChartType.SCATTER,
      label: 'Scatter',
      icon: 'hugeicons:chart-scatter',
      category: ChartTypeCategory.RELATIONSHIP,
      description: 'Discover correlations between two numeric fields',
      fields: {
        ...NO_FIELDS,
        xAxisNumeric: true,
        yAxis: true,
        limitRows: true,
        showLabels: true,
      },
    },
  ],
  [
    ChartType.HEATMAP,
    {
      value: ChartType.HEATMAP,
      label: 'Heatmap',
      icon: 'hugeicons:grid',
      category: ChartTypeCategory.SPATIAL,
      description: 'Visualise density across two category dimensions',
      fields: {
        ...NO_FIELDS,
        categoryX: true,
        categoryY: true,
        valueColumn: true,
        showLabels: true,
      },
    },
  ],
  [
    ChartType.RADAR,
    {
      value: ChartType.RADAR,
      label: 'Radar',
      icon: 'hugeicons:chart-relationship',
      category: ChartTypeCategory.COMPARISON,
      description: 'Compare multiple metrics on a radial grid',
      fields: {
        ...NO_FIELDS,
        xAxisLabel: true,
        yAxis: true,
        aggregation: true,
        limitRows: true,
        showLabels: true,
      },
    },
  ],
]);

/** Chart types grouped by category for the type selector UI */
export const CHART_TYPE_CATEGORIES: {
  category: ChartTypeCategory;
  label: string;
  types: ChartTypeMeta[];
}[] = [
  {
    category: ChartTypeCategory.COMPARISON,
    label: 'Comparison',
    types: [
      CHART_TYPE_META.get(ChartType.LINE)!,
      CHART_TYPE_META.get(ChartType.BAR)!,
      CHART_TYPE_META.get(ChartType.HORIZONTAL_BAR)!,
      CHART_TYPE_META.get(ChartType.AREA)!,
      CHART_TYPE_META.get(ChartType.RADAR)!,
    ],
  },
  {
    category: ChartTypeCategory.COMPOSITION,
    label: 'Composition',
    types: [
      CHART_TYPE_META.get(ChartType.STACKED_BAR)!,
      CHART_TYPE_META.get(ChartType.PIE)!,
      CHART_TYPE_META.get(ChartType.DONUT)!,
    ],
  },
  {
    category: ChartTypeCategory.RELATIONSHIP,
    label: 'Relationship',
    types: [CHART_TYPE_META.get(ChartType.SCATTER)!],
  },
  {
    category: ChartTypeCategory.SPATIAL,
    label: 'Spatial',
    types: [CHART_TYPE_META.get(ChartType.HEATMAP)!],
  },
];
