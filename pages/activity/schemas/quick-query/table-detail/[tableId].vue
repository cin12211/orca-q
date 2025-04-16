<script setup lang="ts">
import DynamicTable from "~/components/secondary-side-bar/DynamicTable.vue";

definePageMeta({
  keepalive: true,
});

const route = useRoute("activity-schemas-quick-query-table-detail-tableId");
import { useManagementViewContainerStore } from "~/shared/stores/useManagementViewContainerStore";

const viewContainer = useManagementViewContainerStore();

const { data } = await useFetch("/api/execute", {
  method: "POST",
  body: {
    query: `select * from ${route.params.tableId}`,
  },
  key: route.params.tableId,
});
</script>

<template>
  <DynamicTable :data="data?.result" class="h-full" :defaultPageSize="30" />
</template>
