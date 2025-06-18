<script setup lang="ts">
import { useTabViewsStore } from '~/shared/stores/useTabViewsStore';

const viewContainer = useTabViewsStore();
</script>

<template>
  {{ viewContainer.activeTab }}
</template>
