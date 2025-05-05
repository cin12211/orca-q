<script setup lang="ts">
defineProps<{
  visible: boolean;
}>();
</script>

<template>
  <transition name="fade">
    <div
      v-if="visible"
      class="absolute inset-0 z-20 flex items-center justify-center bg-black/5 rounded"
    >
      <Icon name="lucide:loader" class="size-6! animate-spin text-primary" />
    </div>
  </transition>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
