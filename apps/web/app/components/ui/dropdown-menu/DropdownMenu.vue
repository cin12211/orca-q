<script setup lang="ts">
import { reactiveOmit } from '@vueuse/core';
import { computed, provide } from 'vue';
import {
  DropdownMenuRoot,
  type DropdownMenuRootEmits,
  type DropdownMenuRootProps,
  useForwardPropsEmits,
} from 'reka-ui';
import {
  DROPDOWN_MENU_SIZE_INJECTION_KEY,
  type DropdownMenuSize,
} from './context';

const props = withDefaults(
  defineProps<
    DropdownMenuRootProps & {
      size?: DropdownMenuSize;
    }
  >(),
  {
    size: 'default',
  }
);
const emits = defineEmits<DropdownMenuRootEmits>();

const delegatedProps = reactiveOmit(props, 'size');
const forwarded = useForwardPropsEmits(delegatedProps, emits);
const size = computed(() => props.size);

provide(DROPDOWN_MENU_SIZE_INJECTION_KEY, size);
</script>

<template>
  <DropdownMenuRoot data-slot="dropdown-menu" v-bind="forwarded">
    <slot />
  </DropdownMenuRoot>
</template>
