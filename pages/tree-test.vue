<script setup lang="ts">
import TreeDemo from '@/components/base/tree-folder/TreeDemo.vue';

// Set page layout and title
definePageMeta({
  layout: 'default',
});

useHead({
  title: 'Tree Folder Performance Test',
});
</script>

<template>
  <div class="tree-test-page">
    <TreeDemo />
  </div>
</template>

<style scoped>
.tree-test-page {
  width: 100%;
  height: 100vh;
  overflow: hidden;
}
</style>
