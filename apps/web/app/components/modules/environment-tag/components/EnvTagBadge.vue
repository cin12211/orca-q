<script setup lang="ts">
import { computed } from 'vue';
import { TAG_COLOR_MAP } from '../constants/TAG_COLOR_OPTIONS';
import type { EnvironmentTag } from '../types/environmentTag.types';
import EnvTagColorDot from './EnvTagColorDot.vue';

const props = defineProps<{
  tag: EnvironmentTag;
}>();

const badgeClass = computed(
  () =>
    TAG_COLOR_MAP[props.tag.color]?.badgeClass ??
    'bg-muted text-muted-foreground'
);
</script>

<template>
  <span
    :class="[
      'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-xs font-medium',
      badgeClass,
    ]"
  >
    <EnvTagColorDot :color="tag.color" size="sm" />
    {{ tag.name }}
  </span>
</template>
