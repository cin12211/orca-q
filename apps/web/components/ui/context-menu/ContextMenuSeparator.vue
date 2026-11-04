<script setup lang="ts">
import { computed, type HTMLAttributes } from 'vue';
import { ContextMenuSeparator, type ContextMenuSeparatorProps } from 'reka-ui';
import { cn } from '@/lib/utils';

const props = defineProps<
  ContextMenuSeparatorProps & { class?: HTMLAttributes['class'] }
>();

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props;

  return delegated;
});
</script>

<template>
  <ContextMenuSeparator
    data-slot="context-menu-separator"
    v-bind="delegatedProps"
    :class="cn('bg-border -mx-1 my-1 h-px', props.class)"
  />
</template>
