<script setup lang="ts">
import { useTabViewsStore } from '~/shared/stores/useTabViewsStore';

const tabViewStore = useTabViewsStore();
</script>

<template>
  {{ tabViewStore.activeTab }}
</template>
