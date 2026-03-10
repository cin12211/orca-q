<script setup lang="ts">
import { Alert, AlertDescription } from '~/components/ui/alert';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { getConnectionParams } from '~/core/helpers/connection-helper';
import { useManagementConnectionStore } from '~/core/stores';
import { useSchemaStore } from '~/core/stores/useSchemaStore';
import type { ViewMeta } from '~/core/types';

const props = defineProps<{
  schema: string;
  viewName: string;
  connectionId?: string;
}>();

const schemaStore = useSchemaStore();
const cacheKey = computed(() => `${props.schema}.${props.viewName}`);

const error = ref<string | null>(null);

const connectionStore = useManagementConnectionStore();
const connection = computed(() => {
  if (props.connectionId) {
    return connectionStore.connections.find(c => c.id === props.connectionId);
  }
  return connectionStore.selectedConnection;
});

const { data, status } = useFetch<ViewMeta>('/api/views/meta', {
  method: 'POST',
  body: computed(() => ({
    ...getConnectionParams(connection.value),
    schema: props.schema,
    viewName: props.viewName,
  })),
  key: `view-meta-${cacheKey.value}`,
  getCachedData: () => {
    const cached = schemaStore.viewMetaMap[cacheKey.value];
    return cached ?? undefined;
  },
  onResponse({ response }) {
    if (response._data) {
      schemaStore.viewMetaMap[cacheKey.value] = response._data;
    }
  },
  onResponseError({ response }) {
    error.value = response._data?.message || 'Failed to load view metadata';
  },
});

const isMaterialized = computed(() => data.value?.type === 'materialized');

const typeBadge = computed(() =>
  isMaterialized.value ? 'Materialized View' : 'Normal View'
);

const statusBadge = computed(() => {
  if (!isMaterialized.value) {
    return {
      variant: data.value?.isUpdatable
        ? ('default' as const)
        : ('outline' as const),
      label: `Updatable: ${data.value?.isUpdatable ? 'Yes' : 'No'}`,
    };
  }

  return {
    variant: data.value?.isPopulated
      ? ('default' as const)
      : ('destructive' as const),
    label: `Populated: ${data.value?.isPopulated ? 'Yes' : 'No'}`,
  };
});

const viewPills = computed(() => {
  if (!isMaterialized.value) return [];

  return [
    {
      label: 'Rows',
      value: data.value?.rowEstimate?.toLocaleString() ?? '—',
      mono: true,
    },
    {
      label: 'Total',
      value: data.value?.totalSize ?? '—',
    },
    {
      label: 'Table',
      value: data.value?.tableSize ?? '—',
    },
    {
      label: 'Index',
      value: data.value?.indexSize ?? '—',
    },
  ];
});

const onRetry = () => {
  error.value = null;
  refreshNuxtData(`view-meta-${cacheKey.value}`);
};
</script>

<template>
  <div class="rounded-md border p-2.5 relative">
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
        <Badge :variant="'secondary'" class="h-5 px-1.5 text-[10px]">
          {{ typeBadge }}
        </Badge>
        <Badge :variant="statusBadge.variant" class="h-5 px-1.5 text-[10px]">
          {{ statusBadge.label }}
        </Badge>
      </div>

      <div v-if="viewPills.length" class="flex flex-wrap gap-1">
        <div
          v-for="item in viewPills"
          :key="item.label"
          class="inline-flex items-center gap-1 rounded-md border bg-muted/20 px-1.5 py-0.5"
        >
          <span class="text-[10px] text-muted-foreground">
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
