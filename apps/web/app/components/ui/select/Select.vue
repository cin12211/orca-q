<script setup lang="ts">
import { reactiveOmit } from '@vueuse/core';
import { computed, provide } from 'vue';
import type {
  SelectRootEmits,
  SelectRootProps as SelectRootPrimitiveProps,
} from 'reka-ui';
import { SelectRoot, useForwardPropsEmits } from 'reka-ui';
import { SELECT_SIZE_INJECTION_KEY, type SelectSize } from './context';

export interface SelectProps extends SelectRootPrimitiveProps {
  /**
   * Shared visual size for the full Select family.
   * Applied to child components through provide/inject when they do not set `size` explicitly.
   */
  size?: SelectSize;
}

const props = withDefaults(defineProps<SelectProps>(), {
  size: 'default',
});
const emits = defineEmits<SelectRootEmits>();

const delegatedProps = reactiveOmit(props, 'size');
const forwarded = useForwardPropsEmits(delegatedProps, emits);
const size = computed(() => props.size);

provide(SELECT_SIZE_INJECTION_KEY, size);
</script>

<template>
  <SelectRoot data-slot="select" v-bind="forwarded">
    <slot />
  </SelectRoot>
</template>
