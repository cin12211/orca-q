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
