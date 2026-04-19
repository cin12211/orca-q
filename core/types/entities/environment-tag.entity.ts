import type { TagColor } from '~/components/modules/environment-tag/types/environmentTag.enums';

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
