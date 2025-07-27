<script setup lang="ts">
import QuickQuery from '~/components/modules/quick-query/QuickQuery.vue';

definePageMeta({
  keepalive: {
    max: 6,
  },
});

const route = useRoute(
  'workspaceId-connectionId-quick-query-table-detail-schemaName-tableName'
);
</script>

<template>
  <QuickQuery
    :tableName="route.params.tableName"
    :schemaName="route.params.schemaName"
  />
</template>
