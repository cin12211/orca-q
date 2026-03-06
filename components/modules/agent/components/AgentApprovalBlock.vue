<script setup lang="ts">
import type {
  AgentToolInputMap,
  DbAgentToolName,
} from '../db-agent.types';

const props = defineProps<{
  toolName: DbAgentToolName;
  input: AgentToolInputMap[DbAgentToolName];
  approvalId: string;
}>();

const emit = defineEmits<{
  approve: [approvalId: string];
  deny: [approvalId: string];
}>();

const preview = computed(() => {
  if ('sql' in props.input && typeof props.input.sql === 'string') {
    return props.input.sql;
  }

  return JSON.stringify(props.input, null, 2);
});
</script>

<template>
  <div
    class="space-y-4 rounded-[1.35rem] border border-amber-300/30 bg-amber-50 p-4 text-amber-950 dark:border-amber-500/20 dark:bg-amber-950/30 dark:text-amber-100"
  >
    <div class="space-y-1">
      <div class="text-[11px] font-medium uppercase tracking-[0.18em]">
        Approval Required
      </div>
      <p class="text-sm leading-6">
        This action needs confirmation before execution.
      </p>
    </div>

    <pre class="overflow-x-auto rounded-2xl border border-amber-300/30 bg-background/70 px-3 py-3 text-[12px] leading-6">{{ preview }}</pre>

    <div class="flex flex-wrap justify-end gap-2">
      <Button
        variant="outline"
        size="sm"
        class="rounded-xl"
        @click="emit('deny', approvalId)"
      >
        Cancel
      </Button>

      <Button
        size="sm"
        class="rounded-xl bg-amber-600 text-white hover:bg-amber-700"
        @click="emit('approve', approvalId)"
      >
        Confirm
      </Button>
    </div>
  </div>
</template>
