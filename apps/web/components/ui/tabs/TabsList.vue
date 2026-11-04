<script setup lang="ts">
import { computed, inject, type HTMLAttributes } from 'vue';
import {
  TabsList,
  type TabsListProps as TabsListPrimitiveProps,
} from 'reka-ui';
import { cn } from '@/lib/utils';
import { TABS_SIZE_INJECTION_KEY, type TabsSize } from './context';
import { tabsListVariants } from './styles';

export interface TabsListProps extends TabsListPrimitiveProps {
  class?: HTMLAttributes['class'];
  /**
   * Overrides the injected Tabs size for this list only.
   */
  size?: TabsSize;
}

const props = defineProps<TabsListProps>();

const delegatedProps = computed(() => {
  const { class: _, size: __, ...delegated } = props;

  return delegated;
});

const injectedSize = inject(
  TABS_SIZE_INJECTION_KEY,
  computed<TabsSize>(() => 'default')
);
const resolvedSize = computed(() => props.size ?? injectedSize.value);
</script>

<template>
  <TabsList
    data-slot="tabs-list"
    :data-size="resolvedSize"
    v-bind="delegatedProps"
    :class="cn(tabsListVariants({ size: resolvedSize }), props.class)"
  >
    <slot />
  </TabsList>
</template>
