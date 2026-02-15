<script setup lang="ts">
import { DynamicTable } from '#components';
import type { MappedRawColumn } from '~/components/modules/raw-query/interfaces';
import { useAppContext } from '~/core/contexts/useAppContext';

const props = defineProps<{
  connectionId?: string;
}>();

const { connectionStore, wsStateStore } = useAppContext();
const { schemaId } = toRefs(wsStateStore);

const connectionString = computed(() => {
  if (props.connectionId) {
    return connectionStore.connections.find(c => c.id === props.connectionId)
      ?.connectionString;
  }
  return connectionStore.selectedConnection?.connectionString;
});

const body = computed(() => {
  return {
    dbConnectionString: connectionString.value,
    schema: schemaId.value,
  };
});

const { data, status } = useFetch('/api/get-over-view-tables', {
  method: 'POST',
  body,
  watch: [schemaId, body],
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
      aliasFieldName: key,
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
