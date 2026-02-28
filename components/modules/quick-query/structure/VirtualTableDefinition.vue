<script setup lang="ts">
import { formatStatementSql } from '~/components/base/code-editor/utils';
import type { ViewDefinitionResponse } from '~/core/types';

const props = defineProps<{
  schema: string;
  connectionString: string;
  viewName: string;
  viewId: string;
}>();

const { data, status } = useFetch<ViewDefinitionResponse>(
  '/api/views/definition',
  {
    method: 'POST',
    body: {
      dbConnectionString: props.connectionString,
      viewId: props.viewId,
      schemaName: props.schema,
      viewName: props.viewName,
    },
    key: `${props.schema}.${props.viewId}`,
  }
);

const formattedSql = computed(() => {
  if (!data.value?.definition) return '';
  return formatStatementSql(data.value.definition);
});
</script>
<template>
  <div class="mb-2" :key="`${props.viewId}-${props.viewName}-${props.schema}`">
    <LoadingOverlay :visible="status === 'pending'" />
    <p class="text-sm font-normal mb-1">View Definition:</p>
    <CodeHighlightPreview
      :code="formattedSql"
      show-copy-button
      max-height="24rem"
    />
  </div>
</template>
