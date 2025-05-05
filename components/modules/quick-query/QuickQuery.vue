<script setup lang="ts">
import { useMagicKeys, whenever } from '@vueuse/core';
import { toast } from 'vue-sonner';
import { useAppContext } from '~/shared/contexts/useAppContext';
import { EDatabaseType } from '../management-connection/constants';
import QuickQueryFilter from './QuickQueryFilter.vue';
import QuickQueryTable from './QuickQueryTable.vue';

definePageMeta({
  keepalive: false,
});

const props = defineProps<{ tableId: string }>();

const { connectionStore } = useAppContext();

const baseQuery = `SELECT * FROM ${props.tableId}`;

const query = ref(baseQuery);

const {
  data: tableSchema,
  status: tableSchemaStatus,
  error: tableSchemaError,
} = await useFetch('/api/get-one-table', {
  method: 'POST',
  body: {
    tableName: props.tableId,
    connectionUrl: connectionStore.selectedConnection?.connectionString,
  },
  key: `schema-${props.tableId}`,
  onResponseError: error => {
    toast(error.response?.statusText);
  },
});

const columnNames = computed(() => {
  return tableSchema.value?.columns.map(c => c.name) || [];
});

const { value } = useError();
const { data, status } = await useFetch('/api/execute', {
  method: 'POST',
  body: {
    query: query,
    connectionUrl: connectionStore.selectedConnection?.connectionString,
  },
  key: props.tableId,
  cache: 'default',
  onResponseError: error => {
    const errorData = error.response?._data?.data;

    toast(error.response?.statusText, {
      important: true,
      description: JSON.stringify(errorData),
    });
  },
});
</script>

<template>
  <div class="flex flex-col h-full p-2 relative">
    {{ value }}
    <LoadingOverlay :visible="status === 'pending'" />

    <TableSkeleton v-if="tableSchemaStatus === 'pending'" />

    <QuickQueryFilter
      @onSearch="
        newQuery => {
          query = newQuery;
        }
      "
      :baseQuery="baseQuery"
      :columns="columnNames"
      :dbType="EDatabaseType.PG"
    />
    <QuickQueryTable :data="data || []" class="h-full" :defaultPageSize="30" />
  </div>
</template>
