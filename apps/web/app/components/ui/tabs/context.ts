import type { ComputedRef, InjectionKey } from 'vue';

export const TABS_SIZES = ['lg', 'default', 'sm', 'xs', 'xxs'] as const;

export type TabsSize = (typeof TABS_SIZES)[number];

export const TABS_SIZE_INJECTION_KEY = Symbol('tabs-size') as InjectionKey<
  ComputedRef<TabsSize>
>;
