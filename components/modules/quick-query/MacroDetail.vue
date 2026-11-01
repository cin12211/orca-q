<script setup lang="ts">
import { getConnectionParams } from '@/core/helpers/connection-helper';
import { useManagementConnectionStore } from '~/core/stores/managementConnectionStore';

const props = defineProps<{
  functionId: string;
  connectionId?: string;
}>();

const connectionStore = useManagementConnectionStore();

const connection = computed(() =>
  connectionStore.connections.find(c => c.id === props.connectionId)
);

const body = computed(() => ({
  functionId: props.functionId,
  ...getConnectionParams(connection.value),
}));

const { data: definition, status } = useFetch<string>(
  '/api/functions/definition',
  { method: 'POST', body, watch: [body] }
);
</script>

<template>
  <div class="relative h-full overflow-y-auto p-3">
    <LoadingOverlay :visible="status === 'pending'" />

    <div v-if="definition" data-testid="macro-definition">
      <CodeHighlightPreview :code="definition" show-copy-button />
    </div>

    <BaseEmpty
      v-else-if="status !== 'pending'"
      title="No definition"
      desc="This macro could not be loaded."
    />
  </div>
</template>
