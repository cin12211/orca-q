<script setup lang="ts">
import { computed, inject, type HTMLAttributes } from 'vue';
import {
  TabsTrigger,
  type TabsTriggerProps as TabsTriggerPrimitiveProps,
  useForwardProps,
} from 'reka-ui';
import { cn } from '@/lib/utils';
import { TABS_SIZE_INJECTION_KEY, type TabsSize } from './context';
import { tabsTriggerVariants } from './styles';

export interface TabsTriggerProps extends TabsTriggerPrimitiveProps {
  class?: HTMLAttributes['class'];
  /**
   * Overrides the injected Tabs size for this trigger only.
   */
  size?: TabsSize;
}

const props = defineProps<TabsTriggerProps>();

const delegatedProps = computed(() => {
  const { class: _, size: __, ...delegated } = props;

  return delegated;
});

const forwardedProps = useForwardProps(delegatedProps);
const injectedSize = inject(
  TABS_SIZE_INJECTION_KEY,
  computed<TabsSize>(() => 'default')
);
const resolvedSize = computed(() => props.size ?? injectedSize.value);
</script>

<template>
  <TabsTrigger
    data-slot="tabs-trigger"
    :data-size="resolvedSize"
    v-bind="forwardedProps"
    :class="cn(tabsTriggerVariants({ size: resolvedSize }), props.class)"
  >
    <slot />
  </TabsTrigger>
</template>
