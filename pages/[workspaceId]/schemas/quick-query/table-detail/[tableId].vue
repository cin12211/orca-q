<script setup lang="ts">
import QuickQuery from '~/components/modules/quick-query/QuickQuery.vue';

definePageMeta({
  keepalive: {
    max: 6,
  },
});

const route = useRoute('workspaceId-schemas-quick-query-table-detail-tableId');
</script>

<template>
  <QuickQuery :tableId="route.params.tableId" />
</template>
