<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    label?: string;
    bloomColor?: string;
    bloomIntensity?: number;
    class?: string;
  }>(),
  {
    label: 'Generating summary...',
    bloomColor: '#ffffff',
    bloomIntensity: 1.18,
    class: 'font-semibold',
  }
);

// Split text into character array
const chars = computed(() =>
  (props.label ?? '').split('').map((char, i) => ({
    char,
    key: `${char}-${i}`,
    delay: `${i * 0.05}s`,
  }))
);

// Dynamic style variables
const rootStyles = computed(() => ({
  '--bloom-color': props.bloomColor,
  '--bloom-brightness': props.bloomIntensity * 2.5,
}));
</script>

<template>
  <div :style="rootStyles" class="text-bloom-container" :class="props.class">
    <span
      v-for="{ char, key, delay } in chars"
      :key="key"
      class="tbc"
      :style="{ animationDelay: delay }"
      :aria-hidden="char === ' ' ? undefined : 'false'"
      >{{ char === ' ' ? '\u00A0' : char }}</span
    >
  </div>
</template>

<style scoped>
.text-bloom-container {
  /* contain: strict helps the browser skip layout/paint outside of this component */
  contain: content;
  display: inline-block;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

.tbc {
  display: inline-block;
  animation: bloom 2.4s cubic-bezier(0.25, 0.1, 0.25, 1) infinite;
  will-change: transform, filter, opacity;
  transform-style: flat;
}

@keyframes bloom {
  0% {
    transform: translate3d(0, 0, 0) scale(1) rotateY(0deg);
    filter: brightness(1);
    opacity: 0.85;
  }

  12% {
    transform: translate3d(2px, -1px, 2px) scale(var(--bloom-intensity, 1.18))
      rotateY(6deg);
    filter: brightness(var(--bloom-brightness, 3))
      drop-shadow(0 0 3px var(--bloom-color, #fff));
    opacity: 1;
  }

  24% {
    transform: translate3d(0, 0, 0) scale(1) rotateY(0deg);
    filter: brightness(1);
    opacity: 1;
  }

  100% {
    transform: scale(1);
    filter: brightness(1);
    opacity: 0.85;
  }
}
</style>
