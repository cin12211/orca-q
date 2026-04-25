import type { TagColor } from './environmentTag.enums';

export interface EnvironmentTag {
  id: string;
  name: string;
  color: TagColor;
  strictMode: boolean;
  createdAt: string;
  /** True for the 5 built-in seeded tags — cannot be deleted by the user. */
  isSystem?: boolean;
}
