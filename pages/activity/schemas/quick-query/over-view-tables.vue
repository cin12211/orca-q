<script setup lang="ts">
const overViewTables = await useFetch("/api/get-over-view-tables", {
  cache: "force-cache",
  keepalive: true,
});
</script>

<template>
  <DynamicTable
    :data="overViewTables.data.value?.result"
    class="h-full"
    :defaultPageSize="30"
  />
</template>
