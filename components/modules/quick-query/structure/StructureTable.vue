<script setup lang="ts">
import { DynamicTable } from '#components';

const props = defineProps<{
  schema: string;
  tableName: string;
  connectionString: string;
}>();

const { data, status } = useFetch('/api/get-table-structure', {
  method: 'POST',
  body: {
    dbConnectionString: props.connectionString,
    schema: props.schema,
    tableName: props.tableName,
  },
  key: `${props.schema}.${props.tableName}`,
});
</script>

<template>
  <LoadingOverlay :visible="status === 'pending'" />

  <DynamicTableOld
    :data="data || []"
    :foreign-keys="[]"
    :primary-keys="[]"
    class="h-full"
  />
</template>
