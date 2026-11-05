<script setup lang="ts">
import { reactiveOmit } from '@vueuse/core';
import { computed, provide, type HTMLAttributes } from 'vue';
import type {
  TabsRootEmits,
  TabsRootProps as TabsRootPrimitiveProps,
} from 'reka-ui';
import { TabsRoot, useForwardPropsEmits } from 'reka-ui';
import { cn } from '@/lib/utils';
import { TABS_SIZE_INJECTION_KEY, type TabsSize } from './context';

export interface TabsProps extends TabsRootPrimitiveProps {
  class?: HTMLAttributes['class'];
  /**
   * Shared visual size for the full Tabs family.
   * Applied to TabsList and TabsTrigger unless they override it.
   */
  size?: TabsSize;
}

const props = withDefaults(defineProps<TabsProps>(), {
  size: 'default',
});
const emits = defineEmits<TabsRootEmits>();

const delegatedProps = reactiveOmit(props, 'class', 'size');
const forwarded = useForwardPropsEmits(delegatedProps, emits);
const size = computed(() => props.size);

provide(TABS_SIZE_INJECTION_KEY, size);
</script>

<template>
  <TabsRoot
    data-slot="tabs"
    v-bind="forwarded"
    :class="cn('flex flex-col gap-2', props.class)"
  >
    <slot />
  </TabsRoot>
</template>
