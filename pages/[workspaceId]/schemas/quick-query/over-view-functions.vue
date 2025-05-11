<script setup lang="ts">
import { useAppContext } from '~/shared/contexts/useAppContext';

const { connectionStore } = useAppContext();

const { data } = await useFetch('/api/get-over-view-function', {
  cache: 'force-cache',
  method: 'POST',
  body: {
    dbConnectionString: connectionStore.selectedConnection?.connectionString,
  },
  keepalive: true,
});
</script>

<template>
  <DynamicTable :data="data || []" class="h-full" :defaultPageSize="30" />
</template>
