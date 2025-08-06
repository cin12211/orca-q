<script setup lang="ts">
import { DynamicTable } from '#components';
import { useAppContext } from '~/shared/contexts/useAppContext';

const { connectionStore, wsStateStore } = useAppContext();
const { schemaId } = toRefs(wsStateStore);

const { data } = await useFetch('/api/get-over-view-function', {
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
  <DynamicTable
    :data="data || []"
    :foreign-keys="[]"
    :primary-keys="[]"
    class="h-full p-2"
  />
</template>
