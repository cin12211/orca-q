<script setup lang="ts">
import { reactiveOmit } from '@vueuse/core';
import { computed, inject, type HTMLAttributes } from 'vue';
import {
  DropdownMenuItem,
  type DropdownMenuItemProps,
  useForwardProps,
} from 'reka-ui';
import { cn } from '@/lib/utils';
import {
  DROPDOWN_MENU_SIZE_INJECTION_KEY,
  type DropdownMenuSize,
} from './context';
import {
  dropdownMenuInsetSizeClasses,
  dropdownMenuItemSizeClasses,
} from './styles';

const props = withDefaults(
  defineProps<
    DropdownMenuItemProps & {
      class?: HTMLAttributes['class'];
      inset?: boolean;
      variant?: 'default' | 'destructive';
    }
  >(),
  {
    variant: 'default',
  }
);

const delegatedProps = reactiveOmit(props, 'inset', 'variant');

const forwardedProps = useForwardProps(delegatedProps);
const size = inject(
  DROPDOWN_MENU_SIZE_INJECTION_KEY,
  computed<DropdownMenuSize>(() => 'default')
);
</script>

<template>
  <DropdownMenuItem
    data-slot="dropdown-menu-item"
    :data-size="size"
    :data-inset="inset ? '' : undefined"
    :data-variant="variant"
    v-bind="forwardedProps"
    :class="
      cn(
        `focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive-foreground data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/40 data-[variant=destructive]:focus:text-destructive-foreground data-[variant=destructive]:*:[svg]:!text-destructive-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4`,
        dropdownMenuItemSizeClasses[size],
        inset && dropdownMenuInsetSizeClasses[size],
        props.class
      )
    "
  >
    <slot />
  </DropdownMenuItem>
</template>
