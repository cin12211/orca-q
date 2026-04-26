<script setup lang="ts">
defineProps<{
  sql: string;
  safeMode: boolean;
  statementCount: number;
  destructiveCount: number;
}>();

const emit = defineEmits<{
  'update:safeMode': [val: boolean];
}>();
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- Toolbar -->
    <div class="flex items-center gap-3">
      <div class="flex items-center gap-2 text-sm">
        <Icon name="hugeicons:code" class="size-4 text-muted-foreground" />
        <span class="font-medium">Generated SQL</span>
        <span class="text-xs text-muted-foreground"
          >({{ statementCount }} statements)</span
        >
      </div>

      <!-- Safe mode toggle -->
      <div class="ml-auto flex items-center gap-2 text-xs">
        <Label
          for="safe-mode-toggle"
          class="cursor-pointer text-muted-foreground"
        >
          Safe mode
        </Label>
        <Switch
          id="safe-mode-toggle"
          :model-value="safeMode"
          @update:model-value="emit('update:safeMode', $event)"
        />
      </div>

      <!-- Destructive warning -->
      <div
        v-if="destructiveCount > 0 && !safeMode"
        class="flex items-center gap-1 rounded-md bg-red-100 px-2 py-1 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-400"
      >
        <Icon name="hugeicons:alert-circle" class="size-3.5" />
        {{ destructiveCount }} destructive
      </div>
    </div>

    <!-- Safe mode hint -->
    <div
      v-if="safeMode"
      class="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300"
    >
      <Icon name="hugeicons:shield-01" class="mt-0.5 size-3.5 shrink-0" />
      <span
        >Safe mode is on — destructive statements (DROP TABLE, DROP COLUMN) are
        commented out. Disable to include them.</span
      >
    </div>

    <!-- SQL viewer -->
    <CodeHighlightPreview
      v-if="sql"
      :code="sql"
      language="sql"
      max-height="400px"
    />
    <div
      v-else
      class="min-h-32 flex items-center justify-center rounded-md border bg-muted/30 p-4 font-mono text-xs text-muted-foreground"
    >
      No SQL statements generated.
    </div>
  </div>
</template>
