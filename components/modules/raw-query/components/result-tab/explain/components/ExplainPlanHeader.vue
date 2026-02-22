<script setup lang="ts">
import { formatQueryTime } from '~/core/helpers/format';
import type { ExplainPlanNode } from '../../../../interfaces/explainAnalyzeResult';
import { EXPLAIN_VIEW_MODE_OPTIONS, type ExplainViewMode } from '../view-mode';

defineProps<{
  summaryStats: {
    planningTime?: number;
    executionTime?: number;
    nodeCount: number;
    expensiveCount: number;
    slowCount: number;
    allNodes?: ExplainPlanNode[];
    expensiveNodes?: ExplainPlanNode[];
    slowNodes?: ExplainPlanNode[];
  };
  isExpanded?: boolean;
}>();

const emit = defineEmits<{
  (e: 'toggle-expand'): void;
}>();

const viewMode = defineModel<ExplainViewMode>({ required: true });
</script>

<template>
  <div class="flex items-center justify-between px-3 py-2 border-b shrink-0">
    <div class="flex items-center gap-3 min-w-0">
      <Icon
        name="hugeicons:analytics-up"
        class="size-4 text-muted-foreground"
      />
      <span class="text-sm font-medium">Execution Plan</span>

      <div class="flex items-center gap-2 flex-wrap">
        <Badge
          v-if="summaryStats.executionTime !== undefined"
          variant="outline"
          class="text-[11px] h-5 gap-1"
        >
          <Icon name="hugeicons:clock-01" class="size-3" />
          {{ formatQueryTime(summaryStats.executionTime) }}
        </Badge>
        <Badge
          v-if="summaryStats.planningTime !== undefined"
          variant="outline"
          class="text-[11px] h-5 gap-1"
        >
          Planning: {{ formatQueryTime(summaryStats.planningTime) }}
        </Badge>

        <Tooltip v-if="summaryStats.nodeCount > 0">
          <TooltipTrigger as-child>
            <Badge variant="outline" class="text-[11px] h-5 gap-1 cursor-help">
              {{ summaryStats.nodeCount }} nodes
            </Badge>
          </TooltipTrigger>
          <TooltipContent v-if="summaryStats.allNodes?.length">
            <div class="flex flex-col gap-1 max-w-[250px] sm:max-w-xs">
              <span class="font-medium text-xs">Nodes:</span>
              <ul
                class="text-[11px] text-muted-foreground list-disc pl-3 break-words whitespace-normal"
              >
                <li v-for="node in summaryStats.allNodes" :key="node.id">
                  {{ node.label }}
                </li>
              </ul>
            </div>
          </TooltipContent>
        </Tooltip>
        <Badge v-else variant="outline" class="text-[11px] h-5 gap-1">
          0 nodes
        </Badge>

        <Tooltip v-if="summaryStats.expensiveCount > 0">
          <TooltipTrigger as-child>
            <Badge
              variant="outline"
              class="text-[11px] h-5 gap-1 border-amber-300 text-amber-700 dark:text-amber-400 cursor-help"
            >
              {{ summaryStats.expensiveCount }} expensive
            </Badge>
          </TooltipTrigger>
          <TooltipContent v-if="summaryStats.expensiveNodes?.length">
            <div class="flex flex-col gap-1 max-w-[250px] sm:max-w-xs">
              <span class="font-medium text-xs">Expensive Nodes:</span>
              <ul
                class="text-[11px] text-muted-foreground list-disc pl-3 break-words whitespace-normal"
              >
                <li v-for="node in summaryStats.expensiveNodes" :key="node.id">
                  {{ node.label }}
                </li>
              </ul>
            </div>
          </TooltipContent>
        </Tooltip>

        <Tooltip v-if="summaryStats.slowCount > 0">
          <TooltipTrigger as-child>
            <Badge
              variant="outline"
              class="text-[11px] h-5 gap-1 border-red-300 text-red-700 dark:text-red-400 cursor-help"
            >
              {{ summaryStats.slowCount }} slowest
            </Badge>
          </TooltipTrigger>
          <TooltipContent v-if="summaryStats.slowNodes?.length">
            <div class="flex flex-col gap-1 max-w-[250px] sm:max-w-xs">
              <span class="font-medium text-xs">Slowest Node(s):</span>
              <ul
                class="text-[11px] text-muted-foreground list-disc pl-3 break-words whitespace-normal"
              >
                <li v-for="node in summaryStats.slowNodes" :key="node.id">
                  {{ node.label }}
                </li>
              </ul>
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>

    <div class="flex items-center gap-2 shrink-0">
      <Tabs v-model="viewMode" class="gap-0">
        <TabsList class="h-6">
          <TabsTrigger
            v-for="option in EXPLAIN_VIEW_MODE_OPTIONS"
            :key="option.value"
            :value="option.value"
            class="text-xs px-1 rounded-sm cursor-pointer"
          >
            <Icon :name="option.icon" class="size-3.5!" />
            {{ option.label }}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Button variant="outline" size="iconSm" @click="emit('toggle-expand')">
        <Icon
          :name="
            isExpanded ? 'hugeicons:arrow-shrink' : 'hugeicons:arrow-expand'
          "
          class="size-3.5"
        />
      </Button>
    </div>
  </div>
</template>
