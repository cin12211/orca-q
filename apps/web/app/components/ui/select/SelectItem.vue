<script setup lang="ts">
import { computed, inject, type HTMLAttributes } from 'vue';
import { Check } from 'lucide-vue-next';
import {
  SelectItem,
  SelectItemIndicator,
  type SelectItemProps as SelectItemPrimitiveProps,
  SelectItemText,
  useForwardProps,
} from 'reka-ui';
import { cn } from '@/lib/utils';
import { SELECT_SIZE_INJECTION_KEY, type SelectSize } from './context';
import {
  selectItemIndicatorIconVariants,
  selectItemIndicatorWrapperVariants,
  selectItemVariants,
} from './styles';

export interface SelectItemProps extends SelectItemPrimitiveProps {
  class?: HTMLAttributes['class'];
  /**
   * Overrides the injected Select size for this item only.
   */
  size?: SelectSize;
}

const props = defineProps<SelectItemProps>();

const delegatedProps = computed(() => {
  const { class: _, size: __, ...delegated } = props;

  return delegated;
});

const forwardedProps = useForwardProps(delegatedProps);
const injectedSize = inject(
  SELECT_SIZE_INJECTION_KEY,
  computed<SelectSize>(() => 'default')
);
const resolvedSize = computed(() => props.size ?? injectedSize.value);
</script>

<template>
  <SelectItem
    data-slot="select-item"
    :data-size="resolvedSize"
    v-bind="forwardedProps"
    :class="cn(selectItemVariants({ size: resolvedSize }), props.class)"
  >
    <span :class="selectItemIndicatorWrapperVariants({ size: resolvedSize })">
      <SelectItemIndicator>
        <Check
          :class="selectItemIndicatorIconVariants({ size: resolvedSize })"
        />
      </SelectItemIndicator>
    </span>

    <SelectItemText>
      <slot />
    </SelectItemText>
  </SelectItem>
</template>
