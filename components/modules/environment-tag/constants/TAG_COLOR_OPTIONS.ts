import { TagColor } from '../types/environmentTag.enums';

export interface TagColorOption {
  value: TagColor;
  label: string;
  /** Tailwind classes for the badge background + text in light and dark mode. */
  badgeClass: string;
  /** Tailwind classes for the color dot indicator. */
  dotClass: string;
}

export const TAG_COLOR_OPTIONS: TagColorOption[] = [
  {
    value: TagColor.Red,
    label: 'Red',
    badgeClass: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    dotClass: 'bg-red-500',
  },
  {
    value: TagColor.Orange,
    label: 'Orange',
    badgeClass:
      'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
    dotClass: 'bg-orange-500',
  },
  {
    value: TagColor.Amber,
    label: 'Amber',
    badgeClass:
      'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    dotClass: 'bg-amber-500',
  },
  {
    value: TagColor.Yellow,
    label: 'Yellow',
    badgeClass:
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    dotClass: 'bg-yellow-500',
  },
  {
    value: TagColor.Lime,
    label: 'Lime',
    badgeClass:
      'bg-lime-100 text-lime-800 dark:bg-lime-900/40 dark:text-lime-300',
    dotClass: 'bg-lime-500',
  },
  {
    value: TagColor.Green,
    label: 'Green',
    badgeClass:
      'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    dotClass: 'bg-green-500',
  },
  {
    value: TagColor.Teal,
    label: 'Teal',
    badgeClass:
      'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
    dotClass: 'bg-teal-500',
  },
  {
    value: TagColor.Cyan,
    label: 'Cyan',
    badgeClass:
      'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
    dotClass: 'bg-cyan-500',
  },
  {
    value: TagColor.Blue,
    label: 'Blue',
    badgeClass:
      'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    dotClass: 'bg-blue-500',
  },
  {
    value: TagColor.Indigo,
    label: 'Indigo',
    badgeClass:
      'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
    dotClass: 'bg-indigo-500',
  },
  {
    value: TagColor.Violet,
    label: 'Violet',
    badgeClass:
      'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
    dotClass: 'bg-violet-500',
  },
  {
    value: TagColor.Purple,
    label: 'Purple',
    badgeClass:
      'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
    dotClass: 'bg-purple-500',
  },
  {
    value: TagColor.Pink,
    label: 'Pink',
    badgeClass:
      'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300',
    dotClass: 'bg-pink-500',
  },
  {
    value: TagColor.Rose,
    label: 'Rose',
    badgeClass:
      'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
    dotClass: 'bg-rose-500',
  },
];

export const TAG_COLOR_MAP = Object.fromEntries(
  TAG_COLOR_OPTIONS.map(o => [o.value, o])
) as Record<TagColor, TagColorOption>;
