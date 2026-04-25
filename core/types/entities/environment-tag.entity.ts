export enum TagColor {
  Red = 'red',
  Orange = 'orange',
  Amber = 'amber',
  Yellow = 'yellow',
  Lime = 'lime',
  Green = 'green',
  Teal = 'teal',
  Cyan = 'cyan',
  Blue = 'blue',
  Indigo = 'indigo',
  Violet = 'violet',
  Purple = 'purple',
  Pink = 'pink',
  Rose = 'rose',
}

export interface EnvironmentTag {
  id: string;
  name: string;
  color: TagColor;
  strictMode: boolean;
  createdAt: string;
  updatedAt?: string;
  /** True for the 5 built-in seeded tags — cannot be deleted by the user. */
  isSystem?: boolean;
}
