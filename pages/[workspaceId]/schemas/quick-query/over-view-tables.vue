<script setup lang="ts">
import { useAppContext } from '~/shared/contexts/useAppContext';

const { connectionStore } = useAppContext();

const overViewTables = await useFetch('/api/get-over-view-tables', {
  cache: 'force-cache',
  body: {
    connectionUrl: connectionStore.selectedConnection?.connectionString,
  },
  keepalive: true,
});
</script>

<template>
  <DynamicTable
    :data="overViewTables.data.value?.result"
    class="h-full"
    :defaultPageSize="30"
  />
</template>
