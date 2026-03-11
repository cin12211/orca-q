<script setup lang="ts">
import type { EChartsOption } from 'echarts';
import { BarChart, LineChart, PieChart, ScatterChart } from 'echarts/charts';
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from 'echarts/components';
import { use as useECharts } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import VChart from 'vue-echarts';
import type { AgentVisualizeTableResult } from '../../types';
import AgentToolSqlPreview from './AgentToolSqlPreview.vue';

useECharts([
  CanvasRenderer,
  BarChart,
  LineChart,
  PieChart,
  ScatterChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
]);

const props = defineProps<{
  data: AgentVisualizeTableResult;
}>();

const sqlPreviewId = computed(
  () => `agent-visualize-table-${props.data.chartType}-${props.data.sql}`
);

const chartTitle = computed(() => props.data.chartType.replace('_', ' '));

const chartOption = computed<EChartsOption>(() => {
  if (props.data.chartType === 'pie') {
    return {
      tooltip: { trigger: 'item' },
      legend: { bottom: 0 },
      series: [
        {
          type: 'pie',
          radius: ['35%', '68%'],
          data: props.data.points.map(point => ({
            name: point.label,
            value: point.y,
          })),
        },
      ],
    };
  }

  if (props.data.chartType === 'scatter') {
    return {
      tooltip: { trigger: 'item' },
      grid: { left: 16, right: 16, top: 24, bottom: 24, containLabel: true },
      xAxis: {
        type: 'value',
        name: props.data.xField,
      },
      yAxis: {
        type: 'value',
        name: props.data.yField,
      },
      series: [
        {
          type: 'scatter',
          symbolSize: 10,
          data: props.data.points.map(point => [point.x, point.y]),
        },
      ],
    };
  }

  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 16, right: 16, top: 24, bottom: 24, containLabel: true },
    xAxis: {
      type: 'category',
      name: props.data.xField,
      data: props.data.points.map(point => point.label),
      axisLabel: {
        hideOverlap: true,
      },
    },
    yAxis: {
      type: 'value',
      name: props.data.yField,
    },
    series: [
      {
        type: props.data.chartType,
        smooth: props.data.chartType === 'line',
        data: props.data.points.map(point => point.y),
      },
    ],
  };
});
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-2">
    <div
      class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
    >
      <Badge variant="secondary" class="uppercase tracking-[0.16em]">
        {{ chartTitle }}
      </Badge>
      <Badge v-if="data.xField" variant="outline"> X: {{ data.xField }} </Badge>
      <Badge v-if="data.yField" variant="outline"> Y: {{ data.yField }} </Badge>
    </div>

    <div class="text-xs text-muted-foreground">
      {{ data.rowCount }} point{{ data.rowCount === 1 ? '' : 's' }}
    </div>
  </div>

  <AgentToolSqlPreview :id="sqlPreviewId" :sql="data.sql" label="View SQL" />

  <div
    v-if="data.truncated"
    class="text-xs text-muted-foreground border-l-2 pl-2 mb-1"
  >
    Showing only the first {{ data.rowCount }} points.
  </div>

  <div class="overflow-hidden rounded-xl border bg-background/90 p-2 pt-8">
    <div class="agent-chart-container">
      <VChart :option="chartOption" autoresize class="agent-chart" />
    </div>
  </div>
</template>

<style scoped>
.agent-chart-container {
  height: 18rem;
  min-height: 18rem;
}

.agent-chart {
  width: 100%;
  height: 100%;
}
</style>
