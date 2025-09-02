<script setup lang="ts">
import { DynamicTable } from '#components';
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
</script>

<template>
  <div class="h-full relative">
    <LoadingOverlay :visible="status === 'pending'" />

    <DynamicTableOld
      :data="data || []"
      :foreign-keys="[]"
      :primary-keys="[]"
      class="h-full p-2"
    />
  </div>
</template>
