<script setup lang="ts">
import type { AgentGenerateQueryResult } from '../../types';
import AgentToolSqlPreview from './AgentToolSqlPreview.vue';

const props = defineProps<{
  data: AgentGenerateQueryResult;
}>();

const sqlPreviewId = computed(() => `agent-query-${props.data.sql}`);
</script>

<template>
  <div class="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-4">
    <div class="flex items-start justify-between gap-3">
      <p class="text-sm leading-6 text-foreground/90">
        {{ data.explanation }}
      </p>

      <Badge
        :variant="data.isMutation ? 'destructive' : 'secondary'"
        class="shrink-0 text-[10px]"
      >
        {{ data.isMutation ? 'MUTATION' : 'READ ONLY' }}
      </Badge>
    </div>

    <AgentToolSqlPreview
      :id="sqlPreviewId"
      :sql="data.sql"
      :label="data.isMutation ? 'Review SQL before approval' : 'View SQL'"
      :default-open="data.isMutation"
    />
  </div>
</template>
