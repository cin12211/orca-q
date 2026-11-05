<script setup lang="ts">
import type { EChartsOption } from 'echarts';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { use as useECharts } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import VChart from 'vue-echarts';
import { formatDateTime } from '../utils';

useECharts([CanvasRenderer, LineChart, GridComponent, TooltipComponent]);

interface BrokerSample {
  timestamp: number;
  value: number;
}

const props = withDefaults(
  defineProps<{
    samples: BrokerSample[];
    label: string;
    height?: number;
  }>(),
  { height: 36 }
);

const MIN_SAMPLES = 2;
/** Headroom above the highest sample so a flat series reads as a line, not a block. */
const HEADROOM = 1.25;
const MIN_AXIS_MAX = 1;

const latest = computed(
  () => props.samples[props.samples.length - 1]?.value ?? 0
);
const hasChart = computed(() => props.samples.length >= MIN_SAMPLES);

const option = computed<EChartsOption>(() => {
  const max = Math.max(...props.samples.map(item => item.value), MIN_AXIS_MAX);

  return {
    animation: false,
    grid: { left: 0, right: 0, top: 2, bottom: 0 },
    tooltip: {
      trigger: 'axis',
      confine: true,
      formatter: params => {
        const [point] = Array.isArray(params) ? params : [params];
        const [timestamp, value] = point.value as [number, number];
        return `${formatDateTime(new Date(timestamp).toISOString())}<br/><b>${value.toFixed(1)}</b> ${props.label}`;
      },
    },
    xAxis: { type: 'time', show: false },
    yAxis: { type: 'value', show: false, min: 0, max: max * HEADROOM },
    series: [
      {
        type: 'line',
        data: props.samples.map(item => [item.timestamp, item.value]),
        showSymbol: false,
        smooth: true,
        lineStyle: { width: 1.5 },
        areaStyle: { opacity: 0.12 },
      },
    ],
  };
});
</script>

<template>
  <div class="rounded-lg border bg-background p-2.5 space-y-1 min-w-0">
    <div class="flex items-center justify-between text-xs">
      <span class="text-muted-foreground">{{ label }}</span>
      <span class="font-medium tabular-nums">{{ latest.toFixed(1) }}</span>
    </div>
    <VChart
      v-if="hasChart"
      :option="option"
      autoresize
      class="w-full"
      :style="{ height: `${height}px` }"
      role="img"
      :aria-label="`${label} over the last 10 minutes`"
    />
    <p
      v-else
      class="text-xxs text-muted-foreground"
      :style="{ height: `${height}px` }"
    >
      No samples yet
    </p>
  </div>
</template>
