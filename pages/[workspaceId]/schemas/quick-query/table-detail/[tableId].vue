<script setup lang="ts">
import { useAppContext } from '~/shared/contexts/useAppContext';

definePageMeta({
  keepalive: false,
});

const route = useRoute('workspaceId-schemas-quick-query-table-detail-tableId');

const { connectionStore } = useAppContext();

const { data } = await useFetch('/api/execute', {
  method: 'POST',
  body: {
    query: `select * from ${route.params.tableId}`,
    connectionUrl: connectionStore.selectedConnection?.connectionString,
  },
  key: route.params.tableId,
  cache: 'default',
});
</script>

<template>
  <DynamicTable :data="data?.result" class="h-full" :defaultPageSize="30" />
</template>
