<script setup lang="ts">
import { getConnectionParams } from '@/core/helpers/connection-helper';
import { Alert, AlertDescription } from '~/components/ui/alert';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { useManagementConnectionStore } from '~/core/stores';
import type { TableMeta } from '~/core/types';

const props = defineProps<{
  schema: string;
  tableName: string;
  connectionId?: string;
}>();

const TABLE_TYPE_LABELS: Record<string, string> = {
  table: 'Table',
  partitioned: 'Partitioned Table',
  foreign: 'Foreign Table',
};

const error = ref<string | null>(null);
const cacheKey = computed(() => `${props.schema}.${props.tableName}`);

const connectionStore = useManagementConnectionStore();
const connection = computed(() => {
  if (props.connectionId) {
    return connectionStore.connections.find(c => c.id === props.connectionId);
  }
  return connectionStore.selectedConnection;
});

const { data, status } = useFetch<TableMeta>('/api/tables/meta', {
  method: 'POST',
  body: computed(() => ({
    ...getConnectionParams(connection.value),
    schema: props.schema,
    tableName: props.tableName,
  })),
  key: `table-meta-${cacheKey.value}`,
  onResponseError({ response }) {
    error.value = response._data?.message || 'Failed to load table metadata';
  },
});

const typeLabel = computed(() => {
  const type = data.value?.type;
  if (!type) return 'Unknown';
  return TABLE_TYPE_LABELS[type] ?? type;
});

const tablePills = computed(() => [
  {
    label: 'Rows',
    value: data.value?.rowEstimate?.toLocaleString() ?? '—',
    mono: true,
  },
  {
    label: 'Total',
    value: data.value?.totalSize || '—',
  },
  {
    label: 'Table',
    value: data.value?.tableSize || '—',
  },
  {
    label: 'Index',
    value: data.value?.indexSize || '—',
  },
]);

const onRetry = () => {
  error.value = null;
  refreshNuxtData(`table-meta-${cacheKey.value}`);
};
</script>

<template>
  <div class="rounded-md border p-2.5">
    <LoadingOverlay :visible="status === 'pending'" />

    <div v-if="error" class="p-2">
      <Alert variant="destructive">
        <AlertDescription class="flex items-center justify-between gap-2">
          <span>{{ error }}</span>
          <Button variant="outline" size="xs" @click="onRetry">Retry</Button>
        </AlertDescription>
      </Alert>
    </div>

    <div v-else-if="data" class="space-y-1.5">
      <div class="flex items-center gap-1 flex-wrap">
        <Badge variant="secondary" class="h-5 px-1.5 text-xxs">
          {{ typeLabel }}
        </Badge>
        <span
          class="inline-flex items-center gap-1 rounded-md border bg-muted/20 px-1.5 py-0.5"
        >
          <span class="text-xxs text-muted-foreground"> Owner </span>
          <span class="text-[11px] font-mono leading-none text-foreground">
            {{ data.owner || '—' }}
          </span>
        </span>
      </div>

      <div class="flex flex-wrap gap-1">
        <div
          v-for="item in tablePills"
          :key="item.label"
          class="inline-flex items-center gap-1 rounded-md border bg-muted/20 px-1.5 py-0.5"
        >
          <span class="text-xxs text-muted-foreground">
            {{ item.label }}
          </span>
          <span
            :class="[
              'text-[11px] leading-none text-foreground',
              item.mono ? 'font-mono' : 'font-medium',
            ]"
          >
            {{ item.value }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
