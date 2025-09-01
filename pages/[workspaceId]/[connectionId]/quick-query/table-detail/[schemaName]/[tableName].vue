<script setup lang="ts">
import QuickQuery from '~/components/modules/quick-query/QuickQuery.vue';
import { DEFAULT_MAX_KEEP_ALIVE } from '~/utils/constants';

definePageMeta({
  keepalive: {
    max: DEFAULT_MAX_KEEP_ALIVE,
  },
});

const route = useRoute(
  'workspaceId-connectionId-quick-query-table-detail-schemaName-tableName'
);
</script>

<template>
  <!-- <QuickQuery
    :tableName="route.params.tableName"
    :schemaName="route.params.schemaName"
  /> -->
</template>
