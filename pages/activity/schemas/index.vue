<script setup lang="ts">
import DynamicTable from "~/components/secondary-side-bar/DynamicTable.vue";
import { useManagementViewContainerStore } from "~/shared/stores/useManagementViewContainerStore";

const { data } = await useFetch("/api/get-over-view-tables");

const viewContainer = useManagementViewContainerStore();
</script>

<template>
  {{ viewContainer.activeTab }}
</template>
