<script setup lang="ts">
import { useManagementViewContainerStore } from "~/shared/stores/useManagementViewContainerStore";

const viewContainer = useManagementViewContainerStore();
</script>

<template>
  {{ viewContainer.activeTab }}
</template>
