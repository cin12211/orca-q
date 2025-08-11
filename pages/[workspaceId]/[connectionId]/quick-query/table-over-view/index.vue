<script setup lang="ts">
import { useAppContext } from '~/shared/contexts/useAppContext';

definePageMeta({
  keepalive: true,
});

const { connectionStore, wsStateStore } = useAppContext();
const { schemaId } = toRefs(wsStateStore);

const { data, status } = useFetch('/api/get-over-view-tables', {
  method: 'POST',
  body: {
    dbConnectionString: connectionStore.selectedConnection?.connectionString,
    schema: schemaId.value,
  },
});
</script>

<template>
  <div class="h-full relative">
    <LoadingOverlay :visible="status === 'pending'" />

    <DynamicTable
      :data="data || []"
      :foreign-keys="[]"
      :primary-keys="[]"
      class="h-full p-2"
    />
  </div>
</template>
