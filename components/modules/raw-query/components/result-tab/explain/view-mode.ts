export enum ExplainViewMode {
  GRID = 'grid',
  TIMELINE = 'time-line',
  RAW = 'raw',
}

export const EXPLAIN_VIEW_MODE_OPTIONS: ReadonlyArray<{
  value: ExplainViewMode;
  label: string;
  icon: string;
}> = [
  {
    value: ExplainViewMode.TIMELINE,
    label: 'Timeline',
    icon: 'hugeicons:chart-line-data-01',
  },
  {
    value: ExplainViewMode.GRID,
    label: 'Grid',
    icon: 'hugeicons:grid-table',
  },
  {
    value: ExplainViewMode.RAW,
    label: 'Raw',
    icon: 'hugeicons:3rd-bracket',
  },
];
