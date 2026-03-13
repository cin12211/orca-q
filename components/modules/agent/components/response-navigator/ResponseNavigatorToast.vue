<script setup lang="ts">
defineProps<{
  message: string;
  position: 'right' | 'left';
}>();
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-200 ease-out"
    enter-from-class="translate-x-2 opacity-0"
    enter-to-class="translate-x-0 opacity-100"
    leave-active-class="transition-all duration-150 ease-in"
    leave-from-class="translate-x-0 opacity-100"
    leave-to-class="translate-x-2 opacity-0"
  >
    <div
      v-if="message"
      class="absolute top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-[rgba(40,40,40,0.9)] px-3.5 py-2 text-xs text-white shadow-lg"
      :class="position === 'right' ? 'right-full mr-3' : 'left-full ml-3'"
      role="status"
      aria-live="polite"
    >
      {{ message }}
    </div>
  </Transition>
</template>
