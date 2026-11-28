<script setup lang="ts">
import { MULTI_STATEMENT_VIEW_ONLY_NOTE } from '../../constants';
import type { ExecutedResultItem } from '../../types';
import { summarizeStatementResults } from '../../utils/multiStatementRun';
import MultiStatementResultBlock from './MultiStatementResultBlock.vue';

const props = defineProps<{
  activeTab: ExecutedResultItem;
}>();

defineEmits<{
  (e: 'open-statement', statementId: string): void;
}>();

const statements = computed(() => props.activeTab.statements || []);

const summary = computed(() => summarizeStatementResults(statements.value));

const summaryParts = computed(() => {
  const { total, succeeded, failed, skipped, cancelled, pending } =
    summary.value;
  const parts = [`${total} statements`];

  if (pending > 0) {
    parts.push(`running ${total - pending + 1}/${total}`);
  }
  if (succeeded > 0) parts.push(`${succeeded} succeeded`);
  if (failed > 0) parts.push(`${failed} failed`);
  if (skipped > 0) parts.push(`${skipped} skipped`);
  if (cancelled > 0) parts.push(`${cancelled} cancelled`);

  return parts;
});
</script>

<template>
  <div
    data-testid="raw-query-multi-statement-view"
    class="h-full w-full flex flex-col min-h-0"
  >
    <div
      class="flex items-center justify-between gap-2 px-2 h-7 border-b text-xs flex-shrink-0"
    >
      <span data-testid="raw-query-multi-statement-summary" class="truncate">
        {{ summaryParts.join(' · ') }}
      </span>
      <span class="text-muted-foreground tabular-nums whitespace-nowrap">
        {{ summary.totalQueryTime }}ms
      </span>
    </div>

    <div
      data-testid="raw-query-multi-statement-note"
      class="flex items-center gap-1.5 px-2 py-1 border-b text-xs text-muted-foreground bg-muted/40 flex-shrink-0"
    >
      <Icon name="hugeicons:information-circle" class="size-3.5! min-w-3.5" />
      <span>{{ MULTI_STATEMENT_VIEW_ONLY_NOTE }}</span>
    </div>

    <div class="flex-1 min-h-0 overflow-y-auto">
      <MultiStatementResultBlock
        v-for="statement in statements"
        :key="statement.id"
        :statement="statement"
        :executed-at="activeTab.metadata.executedAt"
        :seq-index="activeTab.seqIndex"
        @open-in-tab="$emit('open-statement', $event)"
      />
    </div>
  </div>
</template>
