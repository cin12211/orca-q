<script setup lang="ts">
import { formatDuration } from '@/core/helpers';
import type { ExplainPlanNode } from '../../../../interfaces/explainAnalyzeResult';

const props = defineProps<{
  nodes: ExplainPlanNode[];
  totalTime?: number;
}>();

const hoveredNodeId = ref<string | null>(null);
const TREE_INDENT_STEP = 14;

const timelineNodes = computed(() => {
  const mappedNodes = [...props.nodes]
    .filter(
      node =>
        typeof node['Actual Startup Time'] === 'number' &&
        typeof node['Actual Total Time'] === 'number'
    )
    .map(node => {
      const start = node['Actual Startup Time'] || 0;
      const end = node['Actual Total Time'] || 0;
      const duration = Math.max(0, end - start);

      return {
        id: node.id,
        nodeType: node['Node Type'],
        relation: node['Relation Name'],
        alias: node.Alias,
        depth: node.depth,
        actualRows: node['Actual Rows'],
        actualLoops: node['Actual Loops'],
        planRows: node['Plan Rows'],
        totalCost: node['Total Cost'],
        start,
        end,
        duration,
      };
    });

  const hasFollowingSiblingAtDepth = (fromIndex: number, depth: number) => {
    for (let cursor = fromIndex + 1; cursor < mappedNodes.length; cursor += 1) {
      const candidateDepth = mappedNodes[cursor].depth;

      if (candidateDepth < depth) {
        return false;
      }

      if (candidateDepth === depth) {
        return true;
      }
    }

    return false;
  };

  return mappedNodes.map((node, index) => {
    const continuationLevels: number[] = [];

    for (let level = 1; level < node.depth; level += 1) {
      if (hasFollowingSiblingAtDepth(index, level)) {
        continuationLevels.push(level);
      }
    }

    return {
      ...node,
      continuationLevels,
      hasNextSibling:
        node.depth > 0 ? hasFollowingSiblingAtDepth(index, node.depth) : false,
    };
  });
});

const maxTime = computed(() => {
  const detectedMax = timelineNodes.value.length
    ? Math.max(...timelineNodes.value.map(node => node.end))
    : 0;

  return Math.max(props.totalTime || 0, detectedMax, 1);
});

const barStyle = (start: number, duration: number) => {
  const safeMax = maxTime.value > 0 ? maxTime.value : 1;
  const left = (start / safeMax) * 100;
  const width = Math.max((duration / safeMax) * 100, 0.5);

  return {
    left: `${left}%`,
    width: `${width}%`,
  };
};

const durationRatio = (duration: number) => {
  const safeMax = maxTime.value > 0 ? maxTime.value : 1;
  return ((duration / safeMax) * 100).toFixed(2);
};

const treeGutterWidth = (depth: number) =>
  `${Math.max(depth, 0) * TREE_INDENT_STEP}px`;
const connectorX = (level: number) =>
  `${(level - 1) * TREE_INDENT_STEP + TREE_INDENT_STEP / 2}px`;
const connectorHorizontalWidth = `${TREE_INDENT_STEP / 2}px`;

const getBarColorClass = (nodeType: string) => {
  return 'bg-gray-400/90';
  if (nodeType === 'Seq Scan') return 'bg-gray-400 dark:bg-gray-600';
  if (nodeType.includes('Scan')) return 'bg-gray-300 dark:bg-gray-700';
  if (nodeType.includes('Join')) return 'bg-gray-500 dark:bg-gray-500';
  if (nodeType === 'Sort') return 'bg-gray-300 dark:bg-gray-600';
  if (nodeType.includes('Aggregate')) return 'bg-gray-400 dark:bg-gray-600';
  return 'bg-gray-400 dark:bg-gray-600';
};
</script>

<template>
  <div class="h-full p-2">
    <div class="rounded-lg border p-2 flex flex-col h-full min-h-0">
      <div class="flex justify-between items-center mb-4">
        <h3
          class="text-sm font-bold text-muted-foreground uppercase flex items-center gap-2"
        >
          <Icon name="hugeicons:clock-01" class="size-4" />
          Execution Plan Timeline
        </h3>
        <span class="text-xs text-muted-foreground">Hover for details</span>
      </div>

      <div
        v-if="timelineNodes.length === 0"
        class="h-full grid place-items-center text-sm text-muted-foreground"
      >
        No timeline data available
      </div>

      <div v-else class="flex-1 overflow-auto relative">
        <div class="min-w-[680px] text-xs">
          <div
            class="flex border-b pb-2 mb-2 sticky top-0 bg-background z-10 font-medium text-muted-foreground"
          >
            <div class="w-[28%] min-w-[190px] max-w-[260px] pl-2">
              Node Hierarchy
            </div>
            <div class="flex-1 relative h-4">
              <div class="absolute left-0">0ms</div>
              <div class="absolute right-0">{{ formatDuration(maxTime) }}</div>
              <div class="absolute left-1/4 border-l h-full" />
              <div class="absolute left-1/2 border-l h-full" />
              <div class="absolute left-3/4 border-l h-full" />
            </div>
          </div>

          <div class="pb-2">
            <div
              v-for="node in timelineNodes"
              :key="node.id"
              class="flex items-center group rounded transition-colors hover:bg-muted"
              :class="hoveredNodeId === node.id ? 'bg-muted/40' : ''"
              @mouseenter="hoveredNodeId = node.id"
              @mouseleave="hoveredNodeId = null"
            >
              <div
                class="w-[28%] min-w-[190px] max-w-[260px] px-2 flex items-center overflow-hidden"
              >
                <div
                  class="relative shrink-0 h-7"
                  :style="{ width: treeGutterWidth(node.depth) }"
                >
                  <div
                    v-for="level in node.continuationLevels"
                    :key="`${node.id}-v-${level}`"
                    class="absolute top-0 bottom-0 border-l border-dashed border-muted-foreground/35"
                    :style="{ left: connectorX(level) }"
                  />

                  <template v-if="node.depth > 0">
                    <div
                      class="absolute top-0 border-l border-dashed border-muted-foreground/45"
                      :style="{
                        left: connectorX(node.depth),
                        height: node.hasNextSibling ? '100%' : '50%',
                      }"
                    />
                    <div
                      class="absolute top-1/2 -translate-y-1/2 border-t border-dashed border-muted-foreground/45"
                      :style="{
                        left: connectorX(node.depth),
                        width: connectorHorizontalWidth,
                      }"
                    />
                  </template>
                </div>

                <div class="truncate flex items-center gap-1">
                  <span
                    class="font-mono text-[10px] text-right shrink-0 text-muted-foreground"
                  >
                    #{{ node.id.replace('ep-', '') }}
                  </span>
                  <div class="flex flex-col truncate">
                    <span
                      class="truncate font-medium text-sm"
                      :title="node.nodeType"
                    >
                      {{ node.nodeType }}
                    </span>
                    <span
                      v-if="node.relation"
                      class="text-muted-foreground text-[10px] truncate"
                    >
                      {{ node.relation }}
                      <span v-if="node.alias && node.alias !== node.relation"
                        >({{ node.alias }})</span
                      >
                    </span>
                  </div>
                </div>
              </div>

              <div class="flex-1 relative h-6 mx-2">
                <div class="absolute top-0 bottom-0 left-0 w-px bg-muted" />
                <div class="absolute top-0 bottom-0 right-0 w-px bg-muted" />
                <div class="absolute top-0 bottom-0 left-1/4 w-px bg-muted" />
                <div class="absolute top-0 bottom-0 left-1/2 w-px bg-muted" />
                <div class="absolute top-0 bottom-0 left-3/4 w-px bg-muted" />

                <Tooltip>
                  <TooltipTrigger as-child>
                    <div
                      class="absolute top-1 bottom-1 rounded-sm transition-all shadow-sm opacity-90 cursor-default"
                      :class="[
                        getBarColorClass(node.nodeType),
                        hoveredNodeId === node.id
                          ? 'brightness-105 ring-2 ring-border z-10'
                          : '',
                      ]"
                      :style="barStyle(node.start, node.duration)"
                    />
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    :side-offset="8"
                    class="max-w-[360px]"
                  >
                    <div class="space-y-2 text-xs">
                      <div class="font-semibold flex items-center gap-1">
                        <Icon name="hugeicons:flow-square" class="size-3.5" />
                        {{ node.nodeType }}
                      </div>
                      <div class="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                        <span class="text-muted-foreground">Start</span>
                        <span class="font-mono">{{
                          formatDuration(node.start)
                        }}</span>
                        <span class="text-muted-foreground">End</span>
                        <span class="font-mono">{{
                          formatDuration(node.end)
                        }}</span>
                        <span class="text-muted-foreground">Duration</span>
                        <span class="font-mono">{{
                          formatDuration(node.duration)
                        }}</span>
                        <span class="text-muted-foreground">Share</span>
                        <span class="font-mono"
                          >{{ durationRatio(node.duration) }}%</span
                        >
                        <span class="text-muted-foreground">Rows</span>
                        <span class="font-mono">{{
                          node.actualRows?.toLocaleString() ?? '-'
                        }}</span>
                        <span class="text-muted-foreground">Plan Rows</span>
                        <span class="font-mono">{{
                          node.planRows?.toLocaleString() ?? '-'
                        }}</span>
                        <span class="text-muted-foreground">Loops</span>
                        <span class="font-mono">{{
                          node.actualLoops?.toLocaleString() ?? '-'
                        }}</span>
                        <span class="text-muted-foreground">Total Cost</span>
                        <span class="font-mono">{{
                          node.totalCost?.toFixed(2) ?? '-'
                        }}</span>
                      </div>
                      <div
                        v-if="node.relation"
                        class="text-[11px] text-muted-foreground"
                      >
                        Relation: {{ node.relation }}
                        <span v-if="node.alias && node.alias !== node.relation"
                          >({{ node.alias }})</span
                        >
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
