<script setup lang="ts">
import { reactiveOmit } from '@vueuse/core';
import type { HTMLAttributes } from 'vue';
import { X } from 'lucide-vue-next';
import type { DialogContentEmits, DialogContentProps } from 'reka-ui';
import {
  DialogClose,
  DialogContent,
  DialogPortal,
  useForwardPropsEmits,
} from 'reka-ui';
import { cn } from '@/lib/utils';
import DialogOverlay from './DialogOverlay.vue';
import {
  dialogContentVariants,
  type DialogContentPadding,
  type DialogContentScroll,
  type DialogContentSize,
} from './contentVariants';

defineOptions({
  inheritAttrs: false,
});

const props = withDefaults(
  defineProps<
    DialogContentProps & {
      class?: HTMLAttributes['class'];
      size?: DialogContentSize;
      padding?: DialogContentPadding;
      scroll?: DialogContentScroll;
      showCloseButton?: boolean;
      restoreFocus?: boolean;
    }
  >(),
  {
    size: 'default',
    padding: 'default',
    scroll: 'none',
    showCloseButton: true,
    restoreFocus: false,
  }
);
const emits = defineEmits<DialogContentEmits>();

const delegatedProps = reactiveOmit(
  props,
  'class',
  'padding',
  'restoreFocus',
  'scroll',
  'size'
);

const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
  <DialogPortal>
    <DialogOverlay />
    <DialogContent
      data-slot="dialog-content"
      v-bind="{ ...$attrs, ...forwarded }"
      @close-auto-focus="e => !props.restoreFocus && e.preventDefault()"
      :class="
        cn(
          dialogContentVariants({
            size: props.size,
            padding: props.padding,
            scroll: props.scroll,
          }),
          props.class
        )
      "
    >
      <slot />

      <DialogClose
        v-if="showCloseButton"
        data-slot="dialog-close"
        class="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 cursor-pointer"
      >
        <X />
        <span class="sr-only">Close</span>
      </DialogClose>
    </DialogContent>
  </DialogPortal>
</template>
