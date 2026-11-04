import type { ComputedRef, InjectionKey } from 'vue';

export type DropdownMenuSize = 'lg' | 'default' | 'sm' | 'xxs';

export const DROPDOWN_MENU_SIZE_INJECTION_KEY = Symbol(
  'dropdown-menu-size'
) as InjectionKey<ComputedRef<DropdownMenuSize>>;
