<script setup lang="ts">
import { computed, type HTMLAttributes } from 'vue';
import { AvatarFallback, type AvatarFallbackProps } from 'reka-ui';
import { cn } from '@/lib/utils';

const props = defineProps<
  AvatarFallbackProps & { class?: HTMLAttributes['class'] }
>();

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props;

  return delegated;
});
</script>

<template>
  <AvatarFallback
    data-slot="avatar-fallback"
    v-bind="delegatedProps"
    :class="
      cn(
        'bg-muted flex size-full items-center justify-center rounded-full',
        props.class
      )
    "
  >
    <slot />
  </AvatarFallback>
</template>
