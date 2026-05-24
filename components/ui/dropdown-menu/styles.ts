import type { DropdownMenuSize } from './context';

export const dropdownMenuContentPaddingClasses: Record<
  DropdownMenuSize,
  string
> = {
  lg: 'p-1.5',
  default: 'p-1',
  sm: 'p-1',
  xxs: 'p-0.5',
};

export const dropdownMenuItemSizeClasses: Record<DropdownMenuSize, string> = {
  lg: 'px-3 py-2 text-sm',
  default: 'px-2 py-1.5 text-sm',
  sm: 'px-2 py-1 text-sm',
  xxs: 'px-1.5 py-1 text-xs',
};

export const dropdownMenuInsetSizeClasses: Record<DropdownMenuSize, string> = {
  lg: 'pl-9',
  default: 'pl-8',
  sm: 'pl-7',
  xxs: 'pl-6',
};

export const dropdownMenuChoiceItemSizeClasses: Record<
  DropdownMenuSize,
  string
> = {
  lg: 'py-2 pr-3 pl-9 text-sm',
  default: 'py-1.5 pr-2 pl-8 text-sm',
  sm: 'py-1 pr-2 pl-7 text-sm',
  xxs: 'py-1 pr-1.5 pl-6 text-xs',
};

export const dropdownMenuIndicatorWrapperClasses: Record<
  DropdownMenuSize,
  string
> = {
  lg: 'left-3 size-4',
  default: 'left-2 size-3.5',
  sm: 'left-2 size-3.5',
  xxs: 'left-1.5 size-3',
};

export const dropdownMenuIndicatorIconClasses: Record<
  DropdownMenuSize,
  string
> = {
  lg: 'size-4',
  default: 'size-4',
  sm: 'size-3.5',
  xxs: 'size-3',
};

export const dropdownMenuRadioIconClasses: Record<DropdownMenuSize, string> = {
  lg: 'size-2.5',
  default: 'size-2',
  sm: 'size-2',
  xxs: 'size-1.5',
};

export const dropdownMenuLabelSizeClasses: Record<DropdownMenuSize, string> = {
  lg: 'px-3 py-2 text-sm',
  default: 'px-2 py-1.5 text-sm',
  sm: 'px-2 py-1 text-sm',
  xxs: 'px-1.5 py-1 text-xs',
};

export const dropdownMenuShortcutSizeClasses: Record<DropdownMenuSize, string> =
  {
    lg: 'text-xs tracking-widest',
    default: 'text-xs tracking-widest',
    sm: 'text-[11px] tracking-wide',
    xxs: 'text-[10px] tracking-wide',
  };

export const dropdownMenuSeparatorSizeClasses: Record<
  DropdownMenuSize,
  string
> = {
  lg: '-mx-1.5 my-1.5',
  default: '-mx-1 my-1',
  sm: '-mx-1 my-1',
  xxs: '-mx-0.5 my-0.5',
};

export const dropdownMenuChevronSizeClasses: Record<DropdownMenuSize, string> =
  {
    lg: 'size-4',
    default: 'size-4',
    sm: 'size-4',
    xxs: 'size-3.5',
  };
