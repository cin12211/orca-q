<script setup lang="ts">
import { computed, type HTMLAttributes } from 'vue';
import {
  AlertDialogContent,
  type AlertDialogContentEmits,
  type AlertDialogContentProps,
  AlertDialogOverlay,
  AlertDialogPortal,
  useForwardPropsEmits,
} from 'reka-ui';
import { cn } from '@/lib/utils';
import {
  dialogContentVariants,
  type DialogContentPadding,
  type DialogContentScroll,
  type DialogContentSize,
} from '../dialog/contentVariants';

const props = withDefaults(
  defineProps<
    AlertDialogContentProps & {
      class?: HTMLAttributes['class'];
      size?: DialogContentSize;
      padding?: DialogContentPadding;
      scroll?: DialogContentScroll;
    }
  >(),
  {
    size: 'default',
    padding: 'default',
    scroll: 'none',
  }
);
const emits = defineEmits<AlertDialogContentEmits>();

const delegatedProps = computed(() => {
  const {
    class: _,
    padding: __,
    scroll: ___,
    size: ____,
    ...delegated
  } = props;

  return delegated;
});

const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
  <AlertDialogPortal>
    <AlertDialogOverlay
      data-slot="alert-dialog-overlay"
      class="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/80"
    />
    <AlertDialogContent
      data-slot="alert-dialog-content"
      v-bind="forwarded"
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
    </AlertDialogContent>
  </AlertDialogPortal>
</template>
