<script setup lang="ts">
import type { ExecutedResultItem } from '../../../interfaces';
import {
  extractExplainPayload,
  extractExplainText,
  parseExplainPlan,
} from '../../../utils/parseExplainPlan';
import { ExplainViewMode } from './view-mode';

const props = defineProps<{
  activeTab: ExecutedResultItem;
}>();

const viewMode = ref<ExplainViewMode>(ExplainViewMode.GRID);
const isExpanded = ref(false);

const explainPayload = computed(() => {
  return extractExplainPayload(
    props.activeTab.result,
    props.activeTab.metadata.fieldDefs
  );
});

const rawText = computed(() => {
  return extractExplainText(
    props.activeTab.result,
    props.activeTab.metadata.fieldDefs
  );
});

const parsedPlan = computed(() => {
  return parseExplainPlan(explainPayload.value);
});

const summaryStats = computed(() => {
  const allNodes = parsedPlan.value.allNodes;
  const expensiveNodes = allNodes.filter(node => node.isExpensive);
  const slowNodes = allNodes.filter(node => node.isSlowest);

  return {
    planningTime: parsedPlan.value.summary['Planning Time'],
    executionTime: parsedPlan.value.summary['Execution Time'],
    nodeCount: allNodes.length,
    expensiveCount: expensiveNodes.length,
    slowCount: slowNodes.length,
    allNodes,
    expensiveNodes,
    slowNodes,
  };
});
</script>

<template>
  <div class="h-full min-h-0">
    <div
      v-if="isExpanded"
      class="fixed inset-0 z-40 bg-background/70 backdrop-blur-[1px]"
      @click="isExpanded = false"
    />

    <div
      class="flex flex-col"
      :class="
        isExpanded
          ? 'fixed z-50 left-1/2 top-1/2 h-[90vh] w-[95vw] -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-background shadow-2xl'
          : 'h-full min-h-0 overflow-hidden'
      "
    >
      <ExplainPlanHeader
        v-model="viewMode"
        :summary-stats="summaryStats"
        :is-expanded="isExpanded"
        @toggle-expand="isExpanded = !isExpanded"
      />

      <div
        class="flex-1 min-h-0"
        :class="isExpanded ? 'overflow-hidden' : 'overflow-y-auto'"
      >
        <div
          v-if="!parsedPlan.root"
          class="h-full flex flex-col items-center justify-center gap-2 text-muted-foreground"
        >
          <Icon name="hugeicons:alert-02" class="size-8 opacity-50" />
          <p class="text-sm">Could not parse execution plan</p>
        </div>

        <ExplainGridPane
          v-else-if="viewMode === ExplainViewMode.GRID"
          :nodes="parsedPlan.allNodes"
        />

        <ExplainTimelineChartPane
          v-else-if="viewMode === ExplainViewMode.TIMELINE"
          :nodes="parsedPlan.allNodes"
          :total-time="summaryStats.executionTime"
        />

        <ExplainRawPane v-else :raw-text="rawText" />
      </div>
    </div>
  </div>
</template>
