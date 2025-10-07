<script setup lang="ts">
import { DynamicTable } from '#components';
import type { MappedRawColumn } from '~/components/modules/raw-query/interfaces';
import { useAppContext } from '~/shared/contexts/useAppContext';

definePageMeta({
  keepalive: true,
});

const { connectionStore, wsStateStore } = useAppContext();
const { schemaId } = toRefs(wsStateStore);

const { data, status } = useFetch('/api/get-over-view-function', {
  method: 'POST',
  body: {
    dbConnectionString: connectionStore.selectedConnection?.connectionString,
    schema: schemaId.value,
  },
});

const mappedColumns = computed(() => {
  if (!data.value?.[0]) {
    return [];
  }

  const columns: MappedRawColumn[] = [];
  for (const key of Object.keys(data.value?.[0])) {
    columns.push({
      isForeignKey: false,
      isPrimaryKey: false,
      originalName: key,
      queryFieldName: key,
      tableName: '',
      canMutate: false,
    });
  }

  return columns;
});
</script>

<template>
  <div class="h-full relative p-1">
    <LoadingOverlay :visible="status === 'pending'" />

    <DynamicTable
      :columns="mappedColumns"
      :data="data || []"
      class="h-full border rounded-md"
      columnKeyBy="field"
    />
  </div>
</template>
