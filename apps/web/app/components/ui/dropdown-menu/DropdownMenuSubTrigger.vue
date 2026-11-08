<script setup lang="ts">
import { reactiveOmit } from '@vueuse/core';
import { computed, inject, type HTMLAttributes } from 'vue';
import { ChevronRight } from 'lucide-vue-next';
import {
  DropdownMenuSubTrigger,
  type DropdownMenuSubTriggerProps,
  useForwardProps,
} from 'reka-ui';
import { cn } from '@/lib/utils';
import {
  DROPDOWN_MENU_SIZE_INJECTION_KEY,
  type DropdownMenuSize,
} from './context';
import {
  dropdownMenuChevronSizeClasses,
  dropdownMenuInsetSizeClasses,
  dropdownMenuItemSizeClasses,
} from './styles';

const props = defineProps<
  DropdownMenuSubTriggerProps & {
    class?: HTMLAttributes['class'];
    inset?: boolean;
  }
>();

const delegatedProps = reactiveOmit(props, 'class', 'inset');
const forwardedProps = useForwardProps(delegatedProps);
const size = inject(
  DROPDOWN_MENU_SIZE_INJECTION_KEY,
  computed<DropdownMenuSize>(() => 'default')
);
</script>

<template>
  <DropdownMenuSubTrigger
    data-slot="dropdown-menu-sub-trigger"
    :data-size="size"
    :data-inset="inset ? '' : undefined"
    v-bind="forwardedProps"
    :class="
      cn(
        'focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground flex cursor-default items-center rounded-sm outline-hidden select-none',
        dropdownMenuItemSizeClasses[size],
        inset && dropdownMenuInsetSizeClasses[size],
        props.class
      )
    "
  >
    <slot />
    <ChevronRight
      :class="cn('ml-auto', dropdownMenuChevronSizeClasses[size])"
    />
  </DropdownMenuSubTrigger>
</template>
