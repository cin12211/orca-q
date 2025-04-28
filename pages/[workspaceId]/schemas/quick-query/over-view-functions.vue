<script setup lang="ts">
import { useAppContext } from '~/shared/contexts/useAppContext';

const { connectionStore } = useAppContext();

const { data } = await useFetch('/api/get-over-view-function', {
  cache: 'force-cache',
  body: {
    connectionUrl: connectionStore.selectedConnection?.connectionString,
  },
  keepalive: true,
});
</script>

<template>
  <DynamicTable :data="data?.result" class="h-full" :defaultPageSize="30" />
</template>
