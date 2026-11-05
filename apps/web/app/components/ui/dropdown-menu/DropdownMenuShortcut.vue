<script setup lang="ts">
import { computed, inject, type HTMLAttributes } from 'vue';
import { cn } from '@/lib/utils';
import {
  DROPDOWN_MENU_SIZE_INJECTION_KEY,
  type DropdownMenuSize,
} from './context';
import { dropdownMenuShortcutSizeClasses } from './styles';

const props = defineProps<{
  class?: HTMLAttributes['class'];
}>();

const size = inject(
  DROPDOWN_MENU_SIZE_INJECTION_KEY,
  computed<DropdownMenuSize>(() => 'default')
);
</script>

<template>
  <span
    data-slot="dropdown-menu-shortcut"
    :class="
      cn(
        'text-muted-foreground ml-auto',
        dropdownMenuShortcutSizeClasses[size],
        props.class
      )
    "
  >
    <slot />
  </span>
</template>
