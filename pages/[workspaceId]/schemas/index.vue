<script setup lang="ts">
import { useTabViewsStore } from '~/core/stores/useTabViewsStore';

const tabViewStore = useTabViewsStore();
</script>

<template>
  {{ tabViewStore.activeTab }}
</template>
