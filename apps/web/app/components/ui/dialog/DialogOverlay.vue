<script setup lang="ts">
import { reactiveOmit } from '@vueuse/core';
import type { HTMLAttributes } from 'vue';
import type { DialogOverlayProps } from 'reka-ui';
import { DialogOverlay } from 'reka-ui';
import { cn } from '@/lib/utils';

const props = defineProps<
  DialogOverlayProps & { class?: HTMLAttributes['class'] }
>();

const delegatedProps = reactiveOmit(props, 'class');
</script>

<template>
  <DialogOverlay
    data-slot="dialog-overlay"
    v-bind="delegatedProps"
    :class="
      cn(
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50 backdrop-blur-xs',
        props.class
      )
    "
  >
    <slot />
  </DialogOverlay>
</template>
