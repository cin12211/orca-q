<script setup lang="ts">
import BaseEmpty from '../../base-empty/BaseEmpty.vue';

defineProps<{
  params?: {
    title?: string;
    description?: string;
  };
}>();
</script>

<template>
  <BaseEmpty
    class="h-full min-h-[120px]"
    :title="params?.title"
    :desc="params?.description"
  />
</template>
