<script setup lang="ts">
const props = defineProps<{
  icon: string;
  iconClass: string;
  keyName: string;
  typeLabel: string;
  loading?: boolean;
  saving?: boolean;
}>();

const emit = defineEmits<{
  (e: 'refresh'): void;
  (e: 'delete'): void;
}>();

const AUTO_REFRESH_INTERVAL_OPTIONS = [5, 10, 30] as const;

const autoRefreshEnabled = defineModel<boolean>('autoRefreshEnabled', {
  default: false,
});
const autoRefreshIntervalSeconds = defineModel<number>(
  'autoRefreshIntervalSeconds',
  { default: 5 }
);
</script>

<template>
  <div class="flex flex-col gap-1">
    <div class="flex items-start justify-between gap-3">
      <div class="flex min-w-0 items-start gap-2">
        <Icon :name="icon" :class="['mt-0.5 size-4 min-w-4', iconClass]" />
        <div class="text-sm font-semibold break-all">{{ keyName }}</div>
      </div>

      <div class="flex shrink-0 items-center gap-2">
        <Switch id="redis-auto-refresh" v-model:checked="autoRefreshEnabled" />
        <Label for="redis-auto-refresh" class="text-xs font-medium">
          Auto refresh
        </Label>
        <select
          v-if="autoRefreshEnabled"
          v-model="autoRefreshIntervalSeconds"
          class="h-7 rounded-md border bg-background px-2 text-xs"
          aria-label="Auto refresh interval"
        >
          <option
            v-for="interval in AUTO_REFRESH_INTERVAL_OPTIONS"
            :key="interval"
            :value="interval"
          >
            {{ interval }}s
          </option>
        </select>
        <Button
          variant="ghost"
          size="sm"
          class="h-7 px-2 text-xs"
          aria-label="Refresh key detail"
          :disabled="loading || saving"
          @click="emit('refresh')"
        >
          <Icon name="hugeicons:redo" class="size-3.5! min-w-3.5" />
          Refresh
        </Button>
        <Button
          variant="ghost"
          size="sm"
          class="h-7 px-2 text-xs text-destructive hover:text-destructive"
          aria-label="Delete key"
          :disabled="loading || saving"
          @click="emit('delete')"
        >
          <Icon name="hugeicons:delete-02" class="size-3.5! min-w-3.5" />
          Delete
        </Button>
      </div>
    </div>
    <div class="text-xs text-muted-foreground">{{ typeLabel }}</div>
  </div>
</template>
