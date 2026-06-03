<script setup lang="ts">
import { computed, ref, toRef } from 'vue';
import type { ExecutedResultItem, MappedRawColumn } from '../../../interfaces';
import { ChartSettingsSidebar, ChartRenderer } from '../components';
import { useChartBuilder, useChartData, useChartOption } from '../hooks';

const props = defineProps<{
  activeTab: ExecutedResultItem;
  activeTabColumns: MappedRawColumn[];
  formattedData: Record<string, any>[];
}>();

const colorMode = useColorMode();
const isDark = computed(() => colorMode.value === 'dark');

// 1. Get raw configuration refs
const {
  chartType,
  xAxisField,
  yAxisField,
  valueField,
  categoryYField,
  aggregation,
  groupByField,
  sortBy,
  limitRows,
  showLabels,
  smoothLine,
  chartTitle,
  resetConfig,
} = useChartBuilder(
  toRef(props, 'activeTab'),
  toRef(props, 'activeTabColumns')
);

// 2. Compute processed datasets and warning flags
const {
  hasDataMismatchWarning,
  isScatterNumericWarning,
  processedData,
  pieData,
  processedHeatmapData,
  processedRadarData,
} = useChartData(
  toRef(props, 'formattedData'),
  chartType,
  xAxisField,
  yAxisField,
  valueField,
  categoryYField,
  aggregation,
  groupByField,
  sortBy,
  limitRows
);

// 3. Compute ECharts option config
const { chartOption } = useChartOption(
  chartType,
  xAxisField,
  yAxisField,
  valueField,
  categoryYField,
  groupByField,
  showLabels,
  smoothLine,
  chartTitle,
  isDark,
  processedData,
  pieData,
  processedHeatmapData,
  processedRadarData
);

// Chart Renderer ref to access exposed ECharts instance
const chartRendererRef = ref<any>(null);

const exportChartAsImage = () => {
  const chartInstance = chartRendererRef.value?.chartRef;
  if (!chartInstance) return;
  const dataUrl = chartInstance.getDataURL({
    type: 'png',
    pixelRatio: 2,
    backgroundColor: isDark.value ? '#1e293b' : '#ffffff',
  });

  const link = document.createElement('a');
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  link.download = `chart_${chartTitle.value || 'builder'}_${timestamp}.png`;
  link.href = dataUrl;
  link.click();
};
</script>

<template>
  <div class="h-full flex w-full overflow-hidden text-sm">
    <ChartRenderer
      ref="chartRendererRef"
      :chart-option="chartOption"
      :chart-type="chartType"
      :x-axis-field="xAxisField"
      :category-y-field="categoryYField"
      :group-by-field="groupByField"
      :has-data-mismatch-warning="hasDataMismatchWarning"
      :is-scatter-numeric-warning="isScatterNumericWarning"
    />
    <ChartSettingsSidebar
      v-model:chartTitle="chartTitle"
      v-model:chartType="chartType"
      v-model:xAxisField="xAxisField"
      v-model:yAxisField="yAxisField"
      v-model:valueField="valueField"
      v-model:categoryYField="categoryYField"
      v-model:aggregation="aggregation"
      v-model:groupByField="groupByField"
      v-model:sortBy="sortBy"
      v-model:limitRows="limitRows"
      v-model:showLabels="showLabels"
      v-model:smoothLine="smoothLine"
      :active-tab-columns="activeTabColumns"
      @reset="resetConfig"
      @export="exportChartAsImage"
    />
  </div>
</template>
