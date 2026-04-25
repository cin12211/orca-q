<script setup lang="ts">
import { computed } from 'vue';
import { TAG_COLOR_MAP } from '../constants/TAG_COLOR_OPTIONS';
import type { TagColor } from '../types/environmentTag.enums';

const props = defineProps<{
  color: TagColor;
  size?: 'sm' | 'md';
}>();

const dotClass = computed(
  () => TAG_COLOR_MAP[props.color]?.dotClass ?? 'bg-muted'
);
const sizeClass = computed(() => (props.size === 'md' ? 'size-3' : 'size-2'));
</script>

<template>
  <span
    :class="['inline-block rounded-full flex-shrink-0', sizeClass, dotClass]"
  />
</template>
