<script setup lang="ts">
import { ref, computed } from 'vue';
import type { EChartsOption } from 'echarts';
import {
  BarChart,
  LineChart,
  PieChart,
  ScatterChart,
  HeatmapChart,
  RadarChart,
} from 'echarts/charts';
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
  VisualMapComponent,
  RadarComponent,
} from 'echarts/components';
import { use as useECharts } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import VChart from 'vue-echarts';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CHART_TYPE_META } from '../constants';
import { ChartType } from '../types';

// Register ECharts components
useECharts([
  CanvasRenderer,
  BarChart,
  LineChart,
  PieChart,
  ScatterChart,
  HeatmapChart,
  RadarChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  VisualMapComponent,
  RadarComponent,
]);

const props = defineProps<{
  chartOption: EChartsOption | null;
  chartType: ChartType;
  xAxisField: string;
  categoryYField: string;
  groupByField: string;
  hasDataMismatchWarning: boolean;
  isScatterNumericWarning: boolean;
}>();

const chartRef = ref<any>(null);

/**
 * Determine if the chart has the minimum required fields filled in.
 * Each chart type has different required fields per its schema.
 */
const isChartReady = computed(() => {
  const meta = CHART_TYPE_META.get(props.chartType);
  if (!meta) return false;
  const f = meta.fields;

  if (f.categoryX) return !!props.xAxisField && !!props.categoryYField;
  if (f.xAxisLabel || f.xAxisNumeric) return !!props.xAxisField;
  return false;
});

// Expose chartRef to allow container component to export/get data URLs
defineExpose({
  chartRef,
});
</script>

<template>
  <div class="flex-grow flex flex-col h-full bg-background relative p-3">
    <!-- Data Mismatch Warning -->
    <div v-if="hasDataMismatchWarning" class="mb-4">
      <Alert variant="destructive" class="py-2.5 px-4">
        <Icon
          name="hugeicons:alert-02"
          class="size-4 text-destructive absolute left-4 top-3"
        />
        <AlertTitle class="text-xs font-semibold pl-6"
          >Data Mismatch Warning</AlertTitle
        >
        <AlertDescription class="text-[11px] text-muted-foreground pl-6 mt-1">
          The selected Y-Axis / Value column contains non-numeric strings.
          ECharts might not render these values correctly.
        </AlertDescription>
      </Alert>
    </div>

    <!-- Scatter X Axis Type Warning -->
    <div v-if="isScatterNumericWarning" class="mb-4">
      <Alert variant="destructive" class="py-2.5 px-4">
        <Icon
          name="hugeicons:alert-02"
          class="size-4 text-destructive absolute left-4 top-3"
        />
        <AlertTitle class="text-xs font-semibold pl-6"
          >Numeric X-Axis Required</AlertTitle
        >
        <AlertDescription class="text-[11px] text-muted-foreground pl-6 mt-1">
          Scatter plot requires numeric data for the X-Axis. Some string values
          in your selected column could prevent correct rendering.
        </AlertDescription>
      </Alert>
    </div>

    <!-- Stacked Bar grouping warning -->
    <div
      v-if="chartType === ChartType.STACKED_BAR && !groupByField"
      class="mb-4"
    >
      <Alert
        class="py-2.5 px-4 bg-amber-500/10 border-amber-500/20 text-amber-500"
      >
        <Icon
          name="hugeicons:information-circle"
          class="size-4 text-amber-500 absolute left-4 top-3"
        />
        <AlertTitle class="text-xs font-semibold pl-6"
          >Group By Field Recommended</AlertTitle
        >
        <AlertDescription class="text-[11px] text-amber-500/90 pl-6 mt-1">
          Stacked Bar charts are best utilized when a "Group By" field is
          specified to create segment stacks.
        </AlertDescription>
      </Alert>
    </div>

    <!-- Empty state — uses schema-aware readiness check -->
    <div
      v-if="!isChartReady"
      class="flex-grow flex items-center justify-center"
    >
      <BaseEmpty
        title="Setup your Chart"
        desc="Select the required columns in the settings pane to start visualising your data."
      >
        <template #icon>
          <Icon
            name="hugeicons:chart-column"
            class="size-12 text-muted-foreground/40"
          />
        </template>
      </BaseEmpty>
    </div>

    <!-- Chart Render Box -->
    <div v-else class="flex-grow w-full relative min-h-0">
      <VChart
        ref="chartRef"
        v-if="chartOption"
        :option="chartOption"
        class="w-full h-full"
        :autoresize="true"
      />
    </div>
  </div>
</template>
