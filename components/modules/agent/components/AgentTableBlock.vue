<script setup lang="ts">
import type { AgentRenderTableResult } from '../db-agent.types';

const props = defineProps<{
  data: AgentRenderTableResult;
}>();

const visibleColumns = computed(() => {
  if (props.data.columns.length > 0) {
    return props.data.columns;
  }

  const firstRow = props.data.rows[0];
  if (!firstRow) {
    return [];
  }

  return Object.keys(firstRow).map(name => ({
    name,
    type: 'unknown',
  }));
});

const formatValue = (value: unknown) => {
  if (value === null || value === undefined) {
    return '[NULL]';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
};
</script>

<template>
  <div class="space-y-3 rounded-[1.35rem] border border-border/70 bg-muted/20 p-4">
    <div
      v-if="data.truncated"
      class="rounded-2xl border border-amber-300/30 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-500/20 dark:bg-amber-950/30 dark:text-amber-100"
    >
      Showing only the first {{ data.rowCount }} rows.
    </div>

    <div class="overflow-hidden rounded-2xl border bg-background/90">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-border text-sm">
          <thead class="bg-muted/50">
            <tr>
              <th
                v-for="column in visibleColumns"
                :key="column.name"
                class="px-3 py-2 text-left font-medium text-muted-foreground"
              >
                <div class="flex flex-col gap-0.5">
                  <span>{{ column.name }}</span>
                  <span class="text-[11px] font-normal uppercase tracking-[0.16em]">
                    {{ column.type }}
                  </span>
                </div>
              </th>
            </tr>
          </thead>

          <tbody class="divide-y divide-border/70">
            <tr v-if="data.rows.length === 0">
              <td
                :colspan="Math.max(visibleColumns.length, 1)"
                class="px-3 py-5 text-center text-muted-foreground"
              >
                No rows returned.
              </td>
            </tr>

            <tr v-for="(row, rowIndex) in data.rows" :key="rowIndex">
              <td
                v-for="column in visibleColumns"
                :key="column.name"
                class="max-w-[240px] px-3 py-2 align-top"
              >
                <span
                  v-if="row[column.name] === null || row[column.name] === undefined"
                  class="rounded-md bg-amber-100 px-1.5 py-0.5 font-mono text-[11px] text-amber-900 dark:bg-amber-950/60 dark:text-amber-100"
                >
                  [NULL]
                </span>
                <span
                  v-else
                  class="block truncate font-mono text-[12px] leading-6"
                  :title="formatValue(row[column.name])"
                >
                  {{ formatValue(row[column.name]) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="text-xs text-muted-foreground">
      Showing {{ data.rows.length }} row{{ data.rows.length === 1 ? '' : 's' }}
    </div>
  </div>
</template>
