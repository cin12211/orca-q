<script setup lang="ts">
import type { AgentExplainQueryResult } from '../../types';

defineProps<{
  data: AgentExplainQueryResult;
}>();
</script>

<template>
  <div class="space-y-4 rounded-xl border border-border/70 bg-muted/20 p-4">
    <div class="flex flex-wrap items-center gap-2">
      <Badge variant="secondary" class="text-[10px] tracking-[0.16em]">
        {{ data.slowestNode }}
      </Badge>
      <Badge variant="outline" class="text-[10px] tracking-[0.16em]">
        Cost {{ data.estimatedCost.toFixed(2) }}
      </Badge>
    </div>

    <p class="text-sm leading-6 text-foreground/90">
      {{ data.summary }}
    </p>

    <div v-if="data.suggestions.length > 0" class="space-y-2">
      <div
        class="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground"
      >
        Suggestions
      </div>

      <ul class="space-y-2 text-sm leading-6">
        <li
          v-for="suggestion in data.suggestions"
          :key="suggestion"
          class="rounded-2xl border bg-background/80 px-3 py-2"
        >
          {{ suggestion }}
        </li>
      </ul>
    </div>

    <details class="rounded-2xl border bg-background/90">
      <summary class="cursor-pointer px-3 py-2 text-sm font-medium">
        Raw EXPLAIN output
      </summary>
      <pre class="overflow-x-auto border-t px-3 py-3 text-[12px] leading-6">{{
        data.rawPlan
      }}</pre>
    </details>
  </div>
</template>
