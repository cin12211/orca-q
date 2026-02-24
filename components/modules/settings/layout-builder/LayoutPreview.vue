<script setup lang="ts">
import type { CustomLayoutDefinition } from '~/components/modules/raw-query/constants';

const props = defineProps<{
  layout: CustomLayoutDefinition;
  isActive?: boolean;
}>();

/**
 * Map slot names to visual colors for the preview grid.
 * Using Tailwind bg classes for consistency.
 */
const SLOT_COLORS: Record<string, string> = {
  content: 'bg-accent border',
  variables: 'bg-accent border',
  result: 'bg-accent border',
};

const SLOT_LABELS: Record<string, string> = {
  content: 'Editor',
  variables: 'Vars',
  result: 'Result',
};
</script>

<template>
  <div
    class="flex gap-1.5 h-28 border p-2 rounded-md cursor-pointer transition-all"
    :class="[
      isActive ? 'ring ring-primary' : 'hover:ring',
      layout.direction === 'horizontal' ? 'flex-row' : 'flex-col',
    ]"
  >
    <template v-for="(panel, idx) in layout.panels" :key="idx">
      <!-- Panel with inner split -->
      <div
        v-if="layout.innerSplit && layout.innerSplit.panelIndex === idx"
        class="flex gap-1 overflow-hidden rounded-sm"
        :class="
          layout.innerSplit.direction === 'horizontal' ? 'flex-row' : 'flex-col'
        "
        :style="{
          flex: `${panel.defaultSize} 0 0%`,
        }"
      >
        <div
          v-for="(innerPanel, iIdx) in layout.innerSplit.panels"
          :key="`inner-${iIdx}`"
          class="flex items-center justify-center rounded-sm text-[10px] font-medium text-muted-foreground"
          :class="SLOT_COLORS[innerPanel.slot]"
          :style="{ flex: `${innerPanel.defaultSize} 0 0%` }"
        >
          {{ SLOT_LABELS[innerPanel.slot] }}
        </div>
      </div>

      <!-- Regular panel -->
      <div
        v-else
        class="flex items-center justify-center rounded-sm text-[10px] font-medium text-muted-foreground"
        :class="SLOT_COLORS[panel.slot]"
        :style="{ flex: `${panel.defaultSize} 0 0%` }"
      >
        {{ SLOT_LABELS[panel.slot] }}
      </div>
    </template>
  </div>
</template>
