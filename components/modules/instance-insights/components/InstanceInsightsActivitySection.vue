<script setup lang="ts">
import type { EChartsOption } from 'echarts';
import { BarChart, LineChart } from 'echarts/charts';
import {
  DatasetComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  TransformComponent,
} from 'echarts/components';
import { use as useECharts } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import VChart from 'vue-echarts';
import type { InstanceInsightsDashboard } from '~/core/types';
import { formatNumber, formatPercent, formatRate } from '../utils/formatters';

useECharts([
  CanvasRenderer,
  LineChart,
  BarChart,
  DatasetComponent,
  TransformComponent,
  GridComponent,
  TooltipComponent,
  LegendComponent,
]);

const props = defineProps<{
  dashboard: InstanceInsightsDashboard | null;
  isLoading: boolean;
  isActionLoading: boolean;
  onRefresh: () => void | Promise<void>;
}>();

const sessionsLegendSelection = ref<Record<string, boolean>>({});
const transactionsLegendSelection = ref<Record<string, boolean>>({});
const blockIoLegendSelection = ref<Record<string, boolean>>({});

const setLegendSelection = (
  target: { value: Record<string, boolean> },
  event: { selected?: Record<string, boolean> } | null | undefined
) => {
  if (!event?.selected) return;
  target.value = { ...event.selected };
};

const onSessionsLegendSelectChanged = (event: {
  selected?: Record<string, boolean>;
}) => setLegendSelection(sessionsLegendSelection, event);

const onTransactionsLegendSelectChanged = (event: {
  selected?: Record<string, boolean>;
}) => setLegendSelection(transactionsLegendSelection, event);

const onBlockIoLegendSelectChanged = (event: {
  selected?: Record<string, boolean>;
}) => setLegendSelection(blockIoLegendSelection, event);

type DashboardHistoryPoint = {
  capturedAt: string;
  label: string;
  sessionsTotal: number;
  sessionsActive: number;
  sessionsIdle: number;
  tps: number;
  commits: number;
  rollbacks: number;
  reads: number;
  hits: number;
  hitRatio: number;
};

const dashboardHistory = ref<DashboardHistoryPoint[]>([]);

watch(
  () => props.dashboard,
  current => {
    if (!current?.capturedAt) return;

    const label = new Date(current.capturedAt).toLocaleTimeString();
    const point: DashboardHistoryPoint = {
      capturedAt: current.capturedAt,
      label,
      sessionsTotal: current.sessions.total,
      sessionsActive: current.sessions.active,
      sessionsIdle: current.sessions.idle,
      tps: current.transactions.tps,
      commits: current.transactions.commitsPerSec,
      rollbacks: current.transactions.rollbacksPerSec,
      reads: current.blockIO.readsPerSec,
      hits: current.blockIO.hitsPerSec,
      hitRatio: current.blockIO.bufferHitRatio,
    };

    const index = dashboardHistory.value.findIndex(
      item => item.capturedAt === point.capturedAt
    );
    if (index >= 0) {
      dashboardHistory.value[index] = point;
      return;
    }

    dashboardHistory.value.push(point);
    if (dashboardHistory.value.length > 80) {
      dashboardHistory.value = dashboardHistory.value.slice(-80);
    }
  },
  { immediate: true, deep: true }
);

const dashboardHistoryWithIndex = computed(() =>
  dashboardHistory.value.map((item, idx) => ({
    ...item,
    idx,
  }))
);

const getLegendSelected = (selection: Record<string, boolean>) =>
  Object.keys(selection).length ? selection : undefined;

const sessionsChartOption = computed<EChartsOption>(() => ({
  tooltip: { trigger: 'axis' },
  legend: {
    top: 0,
    selected: getLegendSelected(sessionsLegendSelection.value),
  },
  dataset: [
    {
      id: 'sessions_raw',
      source: dashboardHistoryWithIndex.value,
    },
    {
      id: 'sessions_filtered',
      fromDatasetId: 'sessions_raw',
      transform: {
        type: 'filter',
        config: {
          dimension: 'idx',
          gte: 0,
        },
      },
    },
  ],
  grid: { left: 45, right: 20, top: 34, bottom: 24 },
  xAxis: {
    type: 'category',
    boundaryGap: false,
  },
  yAxis: { type: 'value' },
  series: [
    {
      name: 'Total',
      type: 'line',
      smooth: true,
      // showSymbol: false,
      datasetId: 'sessions_filtered',
      encode: { x: 'label', y: 'sessionsTotal' },
    },
    {
      name: 'Active',
      type: 'line',
      smooth: true,
      //  showSymbol: false,
      datasetId: 'sessions_filtered',
      encode: { x: 'label', y: 'sessionsActive' },
    },
    {
      name: 'Idle',
      type: 'line',
      smooth: true,
      //  showSymbol: false,
      datasetId: 'sessions_filtered',
      encode: { x: 'label', y: 'sessionsIdle' },
    },
  ],
}));

const tpsChartOption = computed<EChartsOption>(() => ({
  tooltip: { trigger: 'axis' },
  legend: {
    top: 0,
    selected: getLegendSelected(transactionsLegendSelection.value),
  },
  dataset: [
    {
      id: 'transactions_dataset',
      source: dashboardHistoryWithIndex.value,
    },
  ],
  grid: { left: 45, right: 20, top: 34, bottom: 24 },
  xAxis: {
    type: 'category',
    boundaryGap: true,
  },
  yAxis: [
    { type: 'value', name: 'TPS' },
    { type: 'value', name: 'Commit/Rollback' },
  ],
  series: [
    {
      name: 'TPS',
      type: 'line',
      smooth: true,
      yAxisIndex: 0,
      datasetId: 'transactions_dataset',
      encode: { x: 'label', y: 'tps' },
    },
    {
      name: 'Commits/s',
      type: 'bar',
      yAxisIndex: 1,
      datasetId: 'transactions_dataset',
      encode: { x: 'label', y: 'commits' },
    },
    {
      name: 'Rollbacks/s',
      type: 'bar',
      yAxisIndex: 1,
      datasetId: 'transactions_dataset',
      encode: { x: 'label', y: 'rollbacks' },
    },
  ],
}));

const blockIoChartOption = computed<EChartsOption>(() => ({
  tooltip: { trigger: 'axis' },
  legend: {
    top: 0,
    selected: getLegendSelected(blockIoLegendSelection.value),
  },
  dataset: [
    {
      id: 'block_io_dataset',
      source: dashboardHistoryWithIndex.value,
    },
  ],
  grid: { left: 45, right: 20, top: 34, bottom: 24 },
  xAxis: {
    type: 'category',
    boundaryGap: true,
  },
  yAxis: [
    { type: 'value', name: 'Blocks/s' },
    { type: 'value', name: 'Hit %', min: 0, max: 100 },
  ],
  series: [
    {
      name: 'Reads/s',
      type: 'bar',
      yAxisIndex: 0,
      datasetId: 'block_io_dataset',
      encode: { x: 'label', y: 'reads' },
    },
    {
      name: 'Hits/s',
      type: 'bar',
      yAxisIndex: 0,
      datasetId: 'block_io_dataset',
      encode: { x: 'label', y: 'hits' },
    },
    {
      name: 'Buffer Hit Ratio',
      type: 'line',
      smooth: true,
      yAxisIndex: 1,
      datasetId: 'block_io_dataset',
      encode: { x: 'label', y: 'hitRatio' },
    },
  ],
}));
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-sm font-medium">Activity Dashboard</h3>
        <p class="text-xs text-muted-foreground">
          Sessions, TPS, tuples and block I/O
        </p>
      </div>

      <Button
        variant="outline"
        size="xs"
        :disabled="isLoading || isActionLoading"
        class="font-normal"
        @click="onRefresh()"
      >
        <Icon
          name="hugeicons:redo"
          :class="['size-4', isLoading && 'animate-spin']"
        />
        Refresh Activity
      </Button>
    </div>

    <div
      v-if="dashboard?.sessions.exceedsThreshold"
      class="border border-red-300 bg-red-50 text-red-700 rounded-lg p-3 text-sm"
    >
      Total connections are at
      <strong>{{ formatPercent(dashboard.sessions.usagePercent) }}</strong>
      of <strong>max_connections</strong>. Investigate connection pool usage.
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2.5">
      <div class="h-full border rounded-lg p-2.5 space-y-2">
        <div class="flex items-center gap-1">
          <p class="text-xs uppercase text-muted-foreground">Sessions:</p>
          <p class="text-sm font-semibold leading-none tabular-nums">
            {{ formatNumber(dashboard?.sessions.total) }}
          </p>
        </div>
        <div class="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
          <p class="text-muted-foreground">
            <span>Active: </span>
            <span class="tabular-nums text-foreground">
              {{ formatNumber(dashboard?.sessions.active) }}
            </span>
          </p>
          <p class="text-muted-foreground">
            <span>Idle: </span>
            <span class="tabular-nums text-foreground">
              {{ formatNumber(dashboard?.sessions.idle) }}
            </span>
          </p>
          <p class="text-muted-foreground">
            <span>Max: </span>
            <span class="tabular-nums text-foreground">
              {{ formatNumber(dashboard?.sessions.maxConnections) }}
            </span>
          </p>
          <p class="text-muted-foreground">
            <span>Usage: </span>
            <span class="tabular-nums text-foreground">
              {{ formatPercent(dashboard?.sessions.usagePercent) }}
            </span>
          </p>
        </div>
      </div>

      <div class="h-full border rounded-lg p-2.5 space-y-2">
        <div class="flex items-center gap-1">
          <p class="text-xs uppercase text-muted-foreground">TPS:</p>
          <p class="text-sm font-semibold leading-none tabular-nums">
            {{ formatRate(dashboard?.transactions.tps) }}
          </p>
        </div>
        <div class="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
          <p class="text-muted-foreground">
            <span>Commits/sec: </span>
            <span class="tabular-nums text-foreground">
              {{ formatRate(dashboard?.transactions.commitsPerSec) }}
            </span>
          </p>
          <p class="text-muted-foreground">
            <span>Rollbacks/sec: </span>
            <span class="tabular-nums text-foreground">
              {{ formatRate(dashboard?.transactions.rollbacksPerSec) }}
            </span>
          </p>
          <p class="text-muted-foreground">
            <span>Total Commits: </span>
            <span class="tabular-nums text-foreground">
              {{ formatNumber(dashboard?.transactions.totalCommits) }}
            </span>
          </p>
          <p class="text-muted-foreground">
            <span>Total Rollbacks: </span>
            <span class="tabular-nums text-foreground">
              {{ formatNumber(dashboard?.transactions.totalRollbacks) }}
            </span>
          </p>
        </div>
      </div>

      <div class="h-full border rounded-lg p-2.5 space-y-2">
        <div class="flex items-center gap-1">
          <p class="text-xs uppercase text-muted-foreground">Tuples:</p>
          <p class="text-sm font-semibold leading-none tabular-nums">
            {{ formatRate(dashboard?.tuples.insertsPerSec) }}
          </p>
        </div>
        <div class="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
          <p class="text-muted-foreground">
            <span>Updates: </span>
            <span class="tabular-nums text-foreground">
              {{ formatRate(dashboard?.tuples.updatesPerSec) }}
            </span>
          </p>
          <p class="text-muted-foreground">
            <span>Deletes: </span>
            <span class="tabular-nums text-foreground">
              {{ formatRate(dashboard?.tuples.deletesPerSec) }}
            </span>
          </p>
          <p class="text-muted-foreground">
            <span>Fetched: </span>
            <span class="tabular-nums text-foreground">
              {{ formatRate(dashboard?.tuples.fetchedPerSec) }}
            </span>
          </p>
          <p class="text-muted-foreground">
            <span>Returned: </span>
            <span class="tabular-nums text-foreground">
              {{ formatRate(dashboard?.tuples.returnedPerSec) }}
            </span>
          </p>
        </div>
      </div>

      <div class="h-full border rounded-lg p-2.5 space-y-2">
        <div class="flex items-center gap-1">
          <p class="text-xs uppercase text-muted-foreground">Block I/O:</p>
          <p class="text-sm font-semibold leading-none tabular-nums">
            {{ formatPercent(dashboard?.blockIO.bufferHitRatio) }}
          </p>
        </div>
        <div class="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
          <p class="text-muted-foreground">
            <span>Reads/sec: </span>
            <span class="tabular-nums text-foreground">
              {{ formatRate(dashboard?.blockIO.readsPerSec) }}
            </span>
          </p>
          <p class="text-muted-foreground">
            <span>Hits/sec: </span>
            <span class="tabular-nums text-foreground">
              {{ formatRate(dashboard?.blockIO.hitsPerSec) }}
            </span>
          </p>

          <p class="text-muted-foreground">
            <span>Total Reads: </span>
            <span class="tabular-nums text-foreground">
              {{ formatNumber(dashboard?.blockIO.totalReads) }}
            </span>
          </p>
          <p class="text-muted-foreground">
            <span>Total Hits: </span>
            <span class="tabular-nums text-foreground">
              {{ formatNumber(dashboard?.blockIO.totalHits) }}
            </span>
          </p>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-2 gap-3">
      <div class="border rounded-lg p-2.5">
        <p class="text-sm font-medium mb-1.5">Sessions Timeline</p>
        <div class="insights-chart-container">
          <VChart
            :option="sessionsChartOption"
            autoresize
            class="insights-chart"
            @legendselectchanged="onSessionsLegendSelectChanged"
          />
        </div>
      </div>

      <div class="border rounded-lg p-2.5">
        <p class="text-sm font-medium mb-1.5">Transactions Timeline</p>
        <div class="insights-chart-container">
          <VChart
            :option="tpsChartOption"
            autoresize
            class="insights-chart"
            @legendselectchanged="onTransactionsLegendSelectChanged"
          />
        </div>
      </div>
    </div>

    <div class="border rounded-lg p-2.5">
      <p class="text-sm font-medium mb-1.5">Block I/O Timeline</p>
      <div class="insights-chart-container">
        <VChart
          :option="blockIoChartOption"
          autoresize
          class="insights-chart"
          @legendselectchanged="onBlockIoLegendSelectChanged"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.insights-chart-container {
  height: 16rem;
  min-height: 16rem;
  max-height: 16rem;
}

.insights-chart {
  width: 100%;
  height: 100%;
}
</style>
