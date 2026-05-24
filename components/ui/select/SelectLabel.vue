<script setup lang="ts">
import { computed, inject, type HTMLAttributes } from 'vue';
import {
  SelectLabel,
  type SelectLabelProps as SelectLabelPrimitiveProps,
} from 'reka-ui';
import { cn } from '@/lib/utils';
import { SELECT_SIZE_INJECTION_KEY, type SelectSize } from './context';
import { selectLabelVariants } from './styles';

export interface SelectLabelProps extends SelectLabelPrimitiveProps {
  class?: HTMLAttributes['class'];
  /**
   * Overrides the injected Select size for this label only.
   */
  size?: SelectSize;
}

const props = defineProps<SelectLabelProps>();

const injectedSize = inject(
  SELECT_SIZE_INJECTION_KEY,
  computed<SelectSize>(() => 'default')
);
const resolvedSize = computed(() => props.size ?? injectedSize.value);
</script>
<template>
  <SelectLabel
    data-slot="select-label"
    :data-size="resolvedSize"
    :class="cn(selectLabelVariants({ size: resolvedSize }), props.class)"
  >
    <slot />
  </SelectLabel>
</template>
