<script setup lang="ts">
import { getConnectionParams } from '@/core/helpers/connection-helper';
import { formatStatementSql } from '~/components/base/code-editor/utils';
import { useManagementConnectionStore } from '~/core/stores';
import type { ViewDefinitionResponse } from '~/core/types';

const props = defineProps<{
  schema: string;
  connectionId?: string;
  viewName: string;
  viewId: string;
}>();

const connectionStore = useManagementConnectionStore();
const connection = computed(() => {
  if (props.connectionId) {
    return connectionStore.connections.find(c => c.id === props.connectionId);
  }
  return connectionStore.selectedConnection;
});

const { data, status } = useFetch<ViewDefinitionResponse>(
  '/api/views/definition',
  {
    method: 'POST',
    body: computed(() => ({
      ...getConnectionParams(connection.value),
      viewId: props.viewId,
      schemaName: props.schema,
      viewName: props.viewName,
    })),
    key: `${props.schema}.${props.viewId}`,
  }
);

const formattedSql = computed(() => {
  if (!data.value?.definition) return '';
  return formatStatementSql(data.value.definition);
});
</script>
<template>
  <div
    :key="`${props.viewId}-${props.viewName}-${props.schema}`"
    class="relative"
  >
    <LoadingOverlay :visible="status === 'pending'" />
    <CodeHighlightPreview
      v-if="formattedSql"
      :code="formattedSql"
      show-copy-button
      max-height="24rem"
    />
    <BaseEmpty
      v-else-if="status !== 'pending'"
      title="No Definition"
      desc="No SQL definition is available for this view."
    />
  </div>
</template>
