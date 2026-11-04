<script setup lang="ts">
import { computed, inject, type HTMLAttributes } from 'vue';
import {
  DropdownMenuContent,
  type DropdownMenuContentEmits,
  type DropdownMenuContentProps,
  DropdownMenuPortal,
  useForwardPropsEmits,
} from 'reka-ui';
import { cn } from '@/lib/utils';
import {
  DROPDOWN_MENU_SIZE_INJECTION_KEY,
  type DropdownMenuSize,
} from './context';
import { dropdownMenuContentPaddingClasses } from './styles';

const props = withDefaults(
  defineProps<
    DropdownMenuContentProps & {
      class?: HTMLAttributes['class'];
      restoreFocus?: boolean;
    }
  >(),
  {
    sideOffset: 4,
    restoreFocus: false,
  }
);
const emits = defineEmits<DropdownMenuContentEmits>();

const delegatedProps = computed(() => {
  const { class: _, restoreFocus: __, ...delegated } = props;

  return delegated;
});

const forwarded = useForwardPropsEmits(delegatedProps, emits);
const size = inject(
  DROPDOWN_MENU_SIZE_INJECTION_KEY,
  computed<DropdownMenuSize>(() => 'default')
);
</script>

<template>
  <DropdownMenuPortal>
    <DropdownMenuContent
      data-slot="dropdown-menu-content"
      :data-size="size"
      v-bind="forwarded"
      @close-auto-focus="e => !props.restoreFocus && e.preventDefault()"
      :class="
        cn(
          'bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 max-h-(--reka-dropdown-menu-content-available-height) min-w-[8rem] origin-(--reka-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border shadow-md',
          dropdownMenuContentPaddingClasses[size],
          props.class
        )
      "
    >
      <slot />
    </DropdownMenuContent>
  </DropdownMenuPortal>
</template>
