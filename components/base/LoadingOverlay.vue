<script setup lang="ts">
defineProps<{
  visible: boolean;
}>();
</script>

<template>
  <transition name="fade">
    <div
      v-if="visible"
      class="absolute inset-0 z-20 flex items-center justify-center rounded loading-overlay-glass"
    >
      <Icon name="lucide:loader" class="size-6! animate-spin" />
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

.loading-overlay-glass {
  /* From https://css.glass */
  background: rgba(255, 255, 255, 0.39);
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}
</style>
