<script setup lang="ts">
import { useAppContext } from '~/shared/contexts/useAppContext';

const { connectionStore, wsStateStore } = useAppContext();
const { schemaId } = toRefs(wsStateStore);

const { data } = await useFetch('/api/get-over-view-tables', {
  cache: 'force-cache',
  method: 'POST',
  body: {
    dbConnectionString: connectionStore.selectedConnection?.connectionString,
    schema: schemaId.value,
  },
  keepalive: true,
});
</script>

<template>
  <DynamicTable :data="data || []" class="h-full" :defaultPageSize="30" />
</template>
