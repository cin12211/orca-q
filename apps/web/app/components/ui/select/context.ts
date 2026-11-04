import type { ComputedRef, InjectionKey } from 'vue';

export const SELECT_SIZES = ['lg', 'default', 'sm', 'xs', 'xxs'] as const;

export type SelectSize = (typeof SELECT_SIZES)[number];

export const SELECT_SIZE_INJECTION_KEY = Symbol('select-size') as InjectionKey<
  ComputedRef<SelectSize>
>;
