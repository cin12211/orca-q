<script setup lang="ts">
import DynamicTable from "~/components/secondary-side-bar/DynamicTable.vue";

const { data } = await useFetch("/api/get-over-view-function", {
  cache: "force-cache",
  keepalive: true,
});
</script>

<template>
  <DynamicTable :data="data?.result" class="h-full" :defaultPageSize="30" />
</template>
