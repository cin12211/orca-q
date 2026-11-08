<script setup lang="ts">
defineProps<{
  visible: boolean;
}>();
</script>

<template>
  <transition name="fade">
    <div
      v-if="visible"
      class="absolute inset-0 z-20 flex items-center bg-white/50 dark:bg-black/50 backdrop-blur-xs justify-center rounded"
    >
      <Icon name="hugeicons:loading-03" class="size-6! animate-spin" />
    </div>
  </transition>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* change loading-overlay-glass to bg-white/50 dark:bg-black/50 backdrop-blur-xs */
</style>
