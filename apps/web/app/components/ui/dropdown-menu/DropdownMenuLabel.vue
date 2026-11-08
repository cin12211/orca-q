<script setup lang="ts">
import { reactiveOmit } from '@vueuse/core';
import { computed, inject, type HTMLAttributes } from 'vue';
import {
  DropdownMenuLabel,
  type DropdownMenuLabelProps,
  useForwardProps,
} from 'reka-ui';
import { cn } from '@/lib/utils';
import {
  DROPDOWN_MENU_SIZE_INJECTION_KEY,
  type DropdownMenuSize,
} from './context';
import {
  dropdownMenuInsetSizeClasses,
  dropdownMenuLabelSizeClasses,
} from './styles';

const props = defineProps<
  DropdownMenuLabelProps & { class?: HTMLAttributes['class']; inset?: boolean }
>();

const delegatedProps = reactiveOmit(props, 'class', 'inset');
const forwardedProps = useForwardProps(delegatedProps);
const size = inject(
  DROPDOWN_MENU_SIZE_INJECTION_KEY,
  computed<DropdownMenuSize>(() => 'default')
);
</script>

<template>
  <DropdownMenuLabel
    data-slot="dropdown-menu-label"
    :data-size="size"
    :data-inset="inset ? '' : undefined"
    v-bind="forwardedProps"
    :class="
      cn(
        'font-medium',
        dropdownMenuLabelSizeClasses[size],
        inset && dropdownMenuInsetSizeClasses[size],
        props.class
      )
    "
  >
    <slot />
  </DropdownMenuLabel>
</template>
