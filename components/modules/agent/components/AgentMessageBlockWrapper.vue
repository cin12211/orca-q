<script setup lang="ts">
import { useElementVisibility } from '@vueuse/core';

const props = defineProps<{
  isUserMessage: boolean;
  isStreaming: boolean;
}>();

const blockRef = ref<HTMLElement | null>(null);
const isVisible = useElementVisibility(blockRef);
const hasBeenVisible = ref(false);

watch(
  isVisible,
  val => {
    if (val) hasBeenVisible.value = true;
  },
  { immediate: true }
);

const shouldRender = computed(() => {
  return props.isUserMessage || props.isStreaming || hasBeenVisible.value;
});
</script>

<template>
  <div ref="blockRef">
    <template v-if="shouldRender">
      <slot />
    </template>
  </div>
</template>
