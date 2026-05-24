<script setup lang="ts">
import { reactiveOmit } from '@vueuse/core';
import { computed, inject, type HTMLAttributes } from 'vue';
import { ChevronDown } from 'lucide-vue-next';
import {
  SelectIcon,
  SelectTrigger,
  type SelectTriggerProps as SelectTriggerPrimitiveProps,
  useForwardProps,
} from 'reka-ui';
import { cn } from '@/lib/utils';
import { SELECT_SIZE_INJECTION_KEY, type SelectSize } from './context';
import { selectTriggerVariants } from './styles';

export interface SelectTriggerProps extends SelectTriggerPrimitiveProps {
  class?: HTMLAttributes['class'];
  /**
   * Overrides the injected Select size for this trigger only.
   */
  size?: SelectSize;
}

const props = defineProps<SelectTriggerProps>();

const delegatedProps = reactiveOmit(props, 'class', 'size');
const forwardedProps = useForwardProps(delegatedProps);
const injectedSize = inject(
  SELECT_SIZE_INJECTION_KEY,
  computed<SelectSize>(() => 'default')
);
const resolvedSize = computed(() => props.size ?? injectedSize.value);
</script>

<template>
  <SelectTrigger
    data-slot="select-trigger"
    :data-size="resolvedSize"
    v-bind="forwardedProps"
    :class="cn(selectTriggerVariants({ size: resolvedSize }), props.class)"
  >
    <slot />
    <SelectIcon as-child>
      <ChevronDown class="size-4 opacity-50" />
    </SelectIcon>
  </SelectTrigger>
</template>
