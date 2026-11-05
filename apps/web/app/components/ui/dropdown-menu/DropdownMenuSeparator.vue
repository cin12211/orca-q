<script setup lang="ts">
import { computed, inject, type HTMLAttributes } from 'vue';
import {
  DropdownMenuSeparator,
  type DropdownMenuSeparatorProps,
} from 'reka-ui';
import { cn } from '@/lib/utils';
import {
  DROPDOWN_MENU_SIZE_INJECTION_KEY,
  type DropdownMenuSize,
} from './context';
import { dropdownMenuSeparatorSizeClasses } from './styles';

const props = defineProps<
  DropdownMenuSeparatorProps & {
    class?: HTMLAttributes['class'];
  }
>();

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props;

  return delegated;
});

const size = inject(
  DROPDOWN_MENU_SIZE_INJECTION_KEY,
  computed<DropdownMenuSize>(() => 'default')
);
</script>

<template>
  <DropdownMenuSeparator
    data-slot="dropdown-menu-separator"
    :data-size="size"
    v-bind="delegatedProps"
    :class="
      cn('bg-border h-px', dropdownMenuSeparatorSizeClasses[size], props.class)
    "
  />
</template>
