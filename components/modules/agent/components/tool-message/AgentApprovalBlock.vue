<script setup lang="ts">
import type { AgentToolInputMap, DbAgentToolName } from '../../types';

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
  <div class="space-y-2">
    <div class="">
      <div class="text-xs font-medium">Approval Required</div>
      <p class="text-xs text-muted-foreground">
        *This action needs confirmation before execution.
      </p>
    </div>

    <BlockMessageCode
      :id="props.approvalId"
      :code="preview || ''"
      language="sql"
    />

    <div class="flex flex-wrap justify-start gap-2">
      <Button
        variant="outline"
        size="xs"
        class="rounded-xl font-normal"
        @click="emit('deny', approvalId)"
      >
        Cancel
      </Button>

      <Button
        size="xs"
        class="rounded-xl font-normal"
        @click="emit('approve', approvalId)"
      >
        Confirm
      </Button>
    </div>
  </div>
</template>
