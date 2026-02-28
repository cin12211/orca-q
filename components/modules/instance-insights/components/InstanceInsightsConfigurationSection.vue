<script setup lang="ts">
import { buildMappedColumnsFromRows as buildColumnsFromRows } from '~/core/helpers';
import type { InstanceInsightsConfiguration } from '~/core/types';

const props = defineProps<{
  configuration: InstanceInsightsConfiguration | null;
  search: string;
  isLoading: boolean;
  isActionLoading: boolean;
  onRefresh: () => void | Promise<void>;
}>();

const emit = defineEmits<{
  (e: 'update:search', value: string): void;
}>();

const searchModel = computed({
  get: () => props.search,
  set: (value: string) => emit('update:search', value),
});

const configurationRows = computed(() => props.configuration?.rows || []);

const configurationTableRows = computed<Record<string, unknown>[]>(() =>
  configurationRows.value.map(row => ({
    name: row.name,
    category: row.category,
    value: row.value,
    unit: row.unit || '-',
    requires_restart: row.pendingRestart ? 'yes' : 'no',
    description: row.description,
  }))
);

const configurationColumns = computed(() =>
  buildColumnsFromRows(configurationTableRows.value)
);
</script>

<template>
  <div class="space-y-4 h-full flex flex-col overflow-auto">
    <div class="flex items-center justify-between gap-2 flex-wrap">
      <h3 class="text-sm font-medium">Configuration</h3>
      <Button
        variant="outline"
        size="xs"
        :disabled="isLoading || isActionLoading"
        class="font-normal"
        @click="onRefresh()"
      >
        <Icon
          name="hugeicons:redo"
          :class="['size-4', isLoading && 'animate-spin']"
        />
        Refresh Configuration
      </Button>
    </div>

    <div class="h-full">
      <div class="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
        <div class="relative flex-1">
          <Icon
            name="hugeicons:search-01"
            class="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />

          <Input
            type="text"
            placeholder="Search setting name, category, or description..."
            class="h-8 w-full pl-8 pr-3"
            v-model="searchModel"
          />
        </div>
      </div>
      <DynamicTable
        :columns="configurationColumns"
        :data="configurationTableRows"
        class="h-full border rounded-md"
        columnKeyBy="field"
      />
    </div>
  </div>
</template>
