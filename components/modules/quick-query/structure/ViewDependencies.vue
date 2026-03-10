<script setup lang="ts">
import { DynamicTable } from '#components';
import { Alert, AlertDescription } from '~/components/ui/alert';
import { Button } from '~/components/ui/button';
import {
  buildMappedColumnsFromKeys,
  buildMappedColumnsFromRows,
} from '~/core/helpers';
import { getConnectionParams } from '~/core/helpers/connection-helper';
import { useManagementConnectionStore } from '~/core/stores';
import type { ViewDependency } from '~/core/types';
import {
  getStructureTableHeightPx,
  STRUCTURE_TABLE_MAX_HEIGHT_PX,
} from './tableSizing';

const props = defineProps<{
  schema: string;
  viewName: string;
  connectionId?: string;
}>();

const VIEW_DEPENDENCIES_COLUMN_KEYS = ['depends_on'] as const;

const error = ref<string | null>(null);

const cacheKey = computed(() => `${props.schema}.${props.viewName}`);

const connectionStore = useManagementConnectionStore();
const connection = computed(() => {
  if (props.connectionId) {
    return connectionStore.connections.find(c => c.id === props.connectionId);
  }
  return connectionStore.selectedConnection;
});

const { data, status } = useFetch<ViewDependency[]>('/api/views/dependencies', {
  method: 'POST',
  body: computed(() => ({
    ...getConnectionParams(connection.value),
    schema: props.schema,
    viewName: props.viewName,
  })),
  key: `view-deps-${cacheKey.value}`,
  onResponseError({ response }) {
    error.value = response._data?.message || 'Failed to load dependencies';
  },
});

const rows = computed<Record<string, unknown>[]>(() =>
  (data.value || []).map(dep => ({
    depends_on: dep.dependsOn,
  }))
);

const mappedColumns = computed(() => {
  if (rows.value.length > 0) {
    return buildMappedColumnsFromRows(rows.value);
  }

  return buildMappedColumnsFromKeys(VIEW_DEPENDENCIES_COLUMN_KEYS);
});

const tableHeight = computed(
  () => `${getStructureTableHeightPx(rows.value.length)}px`
);

const onRetry = () => {
  error.value = null;
  refreshNuxtData(`view-deps-${cacheKey.value}`);
};
</script>

<template>
  <div class="relative">
    <LoadingOverlay :visible="status === 'pending'" />

    <div v-if="error" class="p-2">
      <Alert variant="destructive">
        <AlertDescription class="flex items-center justify-between gap-2">
          <span>{{ error }}</span>
          <Button variant="outline" size="xs" @click="onRetry">Retry</Button>
        </AlertDescription>
      </Alert>
    </div>

    <div
      v-else-if="rows.length"
      :style="{
        maxHeight: `${STRUCTURE_TABLE_MAX_HEIGHT_PX}px`,
        height: tableHeight,
      }"
    >
      <DynamicTable
        :columns="mappedColumns"
        :data="rows"
        class="h-full"
        columnKeyBy="field"
      />
    </div>

    <div
      v-else-if="status !== 'pending'"
      class="flex items-center justify-center py-6"
    >
      <BaseEmpty
        title="No Dependencies"
        desc="This view has no upstream dependencies."
      />
    </div>
  </div>
</template>
