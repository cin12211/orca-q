<script setup lang="ts">
import { useCopyToClipboard } from '~/core/composables/useCopyToClipboard';
import type { AgentGenerateQueryResult } from '../db-agent.types';

const props = defineProps<{
  data: AgentGenerateQueryResult;
}>();

const sqlDraft = ref(props.data.sql);

const { handleCopyWithKey, isCopied, getCopyIcon, getCopyTooltip } =
  useCopyToClipboard();

watch(
  () => props.data.sql,
  nextSql => {
    sqlDraft.value = nextSql;
  }
);
</script>

<template>
  <div class="space-y-3 rounded-[1.35rem] border border-border/70 bg-muted/20 p-4">
    <div class="flex items-start justify-between gap-3">
      <p class="text-sm leading-6 text-foreground/90">
        {{ data.explanation }}
      </p>

      <Badge
        :variant="data.isMutation ? 'destructive' : 'secondary'"
        class="shrink-0 text-[10px] tracking-[0.16em]"
      >
        {{ data.isMutation ? 'MUTATION' : 'READ ONLY' }}
      </Badge>
    </div>

    <Textarea
      v-model="sqlDraft"
      class="min-h-[150px]! rounded-2xl border bg-background/80 font-mono text-[13px] leading-6 shadow-none"
    />

    <div class="flex justify-end">
      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            variant="outline"
            size="sm"
            class="rounded-xl"
            @click="handleCopyWithKey(`agent-query-${data.sql}`, sqlDraft)"
          >
            <Icon
              :name="getCopyIcon(isCopied(`agent-query-${data.sql}`))"
              class="mr-2 size-4"
            />
            Copy SQL
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{{ getCopyTooltip(isCopied(`agent-query-${data.sql}`)) }}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  </div>
</template>
