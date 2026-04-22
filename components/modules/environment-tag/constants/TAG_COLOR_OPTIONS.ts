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
    badgeClass:
      'bg-red-500/10 text-red-700 dark:bg-red-500/20 dark:text-red-300',
    dotClass: 'bg-red-500',
  },
  {
    value: TagColor.Orange,
    label: 'Orange',
    badgeClass:
      'bg-orange-500/10 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300',
    dotClass: 'bg-orange-500',
  },
  {
    value: TagColor.Amber,
    label: 'Amber',
    badgeClass:
      'bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
    dotClass: 'bg-amber-500',
  },
  {
    value: TagColor.Yellow,
    label: 'Yellow',
    badgeClass:
      'bg-yellow-500/10 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300',
    dotClass: 'bg-yellow-500',
  },
  {
    value: TagColor.Lime,
    label: 'Lime',
    badgeClass:
      'bg-lime-500/10 text-lime-700 dark:bg-lime-500/20 dark:text-lime-300',
    dotClass: 'bg-lime-500',
  },
  {
    value: TagColor.Green,
    label: 'Green',
    badgeClass:
      'bg-green-500/10 text-green-700 dark:bg-green-500/20 dark:text-green-300',
    dotClass: 'bg-green-500',
  },
  {
    value: TagColor.Teal,
    label: 'Teal',
    badgeClass:
      'bg-teal-500/10 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300',
    dotClass: 'bg-teal-500',
  },
  {
    value: TagColor.Cyan,
    label: 'Cyan',
    badgeClass:
      'bg-cyan-500/10 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300',
    dotClass: 'bg-cyan-500',
  },
  {
    value: TagColor.Blue,
    label: 'Blue',
    badgeClass:
      'bg-blue-500/10 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
    dotClass: 'bg-blue-500',
  },
  {
    value: TagColor.Indigo,
    label: 'Indigo',
    badgeClass:
      'bg-indigo-500/10 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300',
    dotClass: 'bg-indigo-500',
  },
  {
    value: TagColor.Violet,
    label: 'Violet',
    badgeClass:
      'bg-violet-500/10 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300',
    dotClass: 'bg-violet-500',
  },
  {
    value: TagColor.Purple,
    label: 'Purple',
    badgeClass:
      'bg-purple-500/10 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300',
    dotClass: 'bg-purple-500',
  },
  {
    value: TagColor.Pink,
    label: 'Pink',
    badgeClass:
      'bg-pink-500/10 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300',
    dotClass: 'bg-pink-500',
  },
  {
    value: TagColor.Rose,
    label: 'Rose',
    badgeClass:
      'bg-rose-500/10 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
    dotClass: 'bg-rose-500',
  },
];

export const TAG_COLOR_MAP = Object.fromEntries(
  TAG_COLOR_OPTIONS.map(o => [o.value, o])
) as Record<TagColor, TagColorOption>;
