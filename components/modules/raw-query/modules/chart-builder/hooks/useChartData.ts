import { computed, shallowRef, watch, type Ref } from 'vue';
import { ChartType, AggregationType } from '../types';
import {
  processLinearChartData,
  processPieChartData,
  processHeatmapChartData,
  processRadarChartData,
} from '../utils';

/** Empty fallback objects — avoids allocating new arrays every tick */
const EMPTY_LINEAR: readonly [] = [] as const;
const EMPTY_PIE: readonly { name: string; value: number }[] = [] as const;
const EMPTY_HEATMAP = {
  xData: [] as string[],
  yData: [] as string[],
  data: [] as [number, number, number][],
} as const;
const EMPTY_RADAR = {
  categories: [] as string[],
  values: [] as number[],
  maxVal: 1,
} as const;

/**
 * Debounce helper — delays fn execution until ms have passed since the last call.
 * Returns a wrapper that can be called freely; only the final call within
 * the window actually fires.
 */
function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return ((...args: any[]) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as unknown as T;
}

export function useChartData(
  formattedData: Ref<Record<string, any>[]>,
  chartType: Ref<ChartType>,
  xAxisField: Ref<string>,
  yAxisField: Ref<string>,
  valueField: Ref<string>,
  categoryYField: Ref<string>,
  aggregation: Ref<AggregationType>,
  groupByField: Ref<string>,
  sortBy: Ref<any>,
  limitRows: Ref<number | null>
) {
  // ─── Warnings (cheap — short-circuit with .some()) ───────────────

  const hasDataMismatchWarning = computed(() => {
    const type = chartType.value;
    const yCol =
      type === ChartType.HEATMAP ? valueField.value : yAxisField.value;
    const agg = aggregation.value;

    if (
      type === ChartType.PIE ||
      type === ChartType.DONUT ||
      type === ChartType.RADAR
    ) {
      if (agg === AggregationType.COUNT) return false;
    }
    if (!yCol) return false;

    return formattedData.value.some(row => {
      const val = row[yCol];
      if (val === null || val === undefined || val === '') return false;
      return isNaN(Number(val));
    });
  });

  const isScatterNumericWarning = computed(() => {
    if (chartType.value !== ChartType.SCATTER || !xAxisField.value)
      return false;
    return formattedData.value.some(row => {
      const val = row[xAxisField.value];
      if (val === null || val === undefined || val === '') return false;
      return isNaN(Number(val));
    });
  });

  // ─── Chart-type-guarded data processing ──────────────────────────
  //
  // Key perf fix: each computed short-circuits to an empty value when
  // the current chartType doesn't need that dataset. This avoids
  // running 4 heavy loops when only 1 is needed.
  //
  // shallowRef + debounced watch is used so intermediate rapid changes
  // (e.g. user clicking through multiple options quickly) don't trigger
  // a full re-process on every tick.

  const LINEAR_TYPES = new Set([
    ChartType.LINE,
    ChartType.BAR,
    ChartType.HORIZONTAL_BAR,
    ChartType.AREA,
    ChartType.STACKED_BAR,
    ChartType.SCATTER,
  ]);

  const PIE_TYPES = new Set([ChartType.PIE, ChartType.DONUT]);

  // --- Linear / Scatter data ---
  const processedData = shallowRef(EMPTY_LINEAR as any);

  const updateLinearData = debounce(() => {
    if (!LINEAR_TYPES.has(chartType.value)) {
      processedData.value = EMPTY_LINEAR;
      return;
    }
    processedData.value = processLinearChartData({
      rows: formattedData.value,
      xAxisField: xAxisField.value,
      yAxisField: yAxisField.value,
      groupByField: groupByField.value,
      aggregation: aggregation.value,
      sortBy: sortBy.value,
      limitRows: limitRows.value ?? undefined,
    });
  }, 80);

  watch(
    [
      formattedData,
      chartType,
      xAxisField,
      yAxisField,
      groupByField,
      aggregation,
      sortBy,
      limitRows,
    ],
    updateLinearData,
    { immediate: true }
  );

  // --- Pie / Donut data ---
  const pieData = shallowRef(EMPTY_PIE as any);

  const updatePieData = debounce(() => {
    if (!PIE_TYPES.has(chartType.value)) {
      pieData.value = EMPTY_PIE;
      return;
    }
    pieData.value = processPieChartData({
      rows: formattedData.value,
      xAxisField: xAxisField.value,
      yAxisField: yAxisField.value,
      aggregation: aggregation.value,
      sortBy: sortBy.value,
      limitRows: limitRows.value ?? undefined,
    });
  }, 80);

  watch(
    [
      formattedData,
      chartType,
      xAxisField,
      yAxisField,
      aggregation,
      sortBy,
      limitRows,
    ],
    updatePieData,
    { immediate: true }
  );

  // --- Heatmap data ---
  const processedHeatmapData = shallowRef(EMPTY_HEATMAP as any);

  const updateHeatmapData = debounce(() => {
    if (chartType.value !== ChartType.HEATMAP) {
      processedHeatmapData.value = EMPTY_HEATMAP;
      return;
    }
    processedHeatmapData.value = processHeatmapChartData({
      rows: formattedData.value,
      xAxisField: xAxisField.value,
      categoryYField: categoryYField.value,
      valueField: valueField.value,
    });
  }, 80);

  watch(
    [formattedData, chartType, xAxisField, categoryYField, valueField],
    updateHeatmapData,
    { immediate: true }
  );

  // --- Radar data ---
  const processedRadarData = shallowRef(EMPTY_RADAR as any);

  const updateRadarData = debounce(() => {
    if (chartType.value !== ChartType.RADAR) {
      processedRadarData.value = EMPTY_RADAR;
      return;
    }
    processedRadarData.value = processRadarChartData({
      rows: formattedData.value,
      xAxisField: xAxisField.value,
      yAxisField: yAxisField.value,
      aggregation: aggregation.value,
      limitRows: limitRows.value ?? undefined,
    });
  }, 80);

  watch(
    [formattedData, chartType, xAxisField, yAxisField, aggregation, limitRows],
    updateRadarData,
    { immediate: true }
  );

  return {
    hasDataMismatchWarning,
    isScatterNumericWarning,
    processedData,
    pieData,
    processedHeatmapData,
    processedRadarData,
  };
}
